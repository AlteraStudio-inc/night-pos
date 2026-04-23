// ============================================
// Sales Page - 売上管理画面（日別売上・月間集計）
// ============================================
import { renderLayout, setPageTitle } from '../components/layout.js';
import { store } from '../store/index.js';
import { formatMoney, formatDate, todayKey } from '../utils/format.js';

export function renderSales() {
  renderLayout('', 'sales');
  setPageTitle('売上管理');

  const content = document.getElementById('page-content');
  const today = todayKey();

  // 現在月 (YYYY-MM)
  let currentMonth = today.substring(0, 7);
  // 日別期間
  let dateFrom = today;
  let dateTo = today;
  // 週間期間（デフォルトは今週月曜〜日曜）
  const { weekStart: defaultWeekStart, weekEnd: defaultWeekEnd } = getCurrentWeekRange(today);
  let weekStart = defaultWeekStart;
  let weekEnd = defaultWeekEnd;
  // 現在タブ
  let activeTab = 'daily';
  // キャスト別タブの期間切替
  let castPeriod = 'daily'; // 'daily' | 'weekly' | 'monthly'
  // チャート用データ
  let _dailyChartData = [];

  function render() {
    content.innerHTML = `
      <!-- Tabs -->
      <div class="filter-bar" style="margin-bottom:var(--space-xl);">
        <div class="filter-chip ${activeTab === 'daily' ? 'active' : ''}" data-tab="daily">日別売上</div>
        <div class="filter-chip ${activeTab === 'weekly' ? 'active' : ''}" data-tab="weekly">週間集計</div>
        <div class="filter-chip ${activeTab === 'monthly' ? 'active' : ''}" data-tab="monthly">月間集計</div>
        <div class="filter-chip ${activeTab === 'cast' ? 'active' : ''}" data-tab="cast">キャスト別</div>
      </div>

      ${activeTab === 'daily' ? renderDailyTab() : ''}
      ${activeTab === 'weekly' ? renderWeeklyTab() : ''}
      ${activeTab === 'monthly' ? renderMonthlyTab() : ''}
      ${activeTab === 'cast' ? renderCastTab() : ''}
    `;

    if (window.lucide) lucide.createIcons();
    attachEvents();

    // チャート描画
    if (activeTab === 'daily') {
      requestAnimationFrame(() => drawDailyLineChart(_dailyChartData));
    }
    if (activeTab === 'cast') {
      requestAnimationFrame(() => {
        document.querySelectorAll('.cast-bar-fill').forEach((bar, i) => {
          setTimeout(() => { bar.style.width = bar.dataset.width + '%'; }, i * 100);
        });
      });
    }
  }

  function renderDailyTab() {
    // payment_records から日別集計
    const allPayments = store.query('payment_records', p => p.date >= dateFrom && p.date <= dateTo);

    // 日付ごとにグループ化
    const dailyMap = {};
    allPayments.forEach(p => {
      if (!dailyMap[p.date]) {
        dailyMap[p.date] = { date: p.date, total: 0, cash: 0, card: 0, other: 0, sessions: 0, guests: 0 };
      }
      dailyMap[p.date].total += p.amount || 0;
      if (p.method === 'cash') dailyMap[p.date].cash += p.amount || 0;
      else if (p.method === 'card') dailyMap[p.date].card += p.amount || 0;
      else dailyMap[p.date].other += p.amount || 0;
      dailyMap[p.date].sessions++;
      dailyMap[p.date].guests += p.guestCount || 0;
    });

    // daily_closingsからも情報を補完
    const closings = store.query('daily_closings', c => c.date >= dateFrom && c.date <= dateTo);
    closings.forEach(c => {
      if (!dailyMap[c.date]) {
        dailyMap[c.date] = { date: c.date, total: c.totalSales || 0, cash: c.cashSales || 0, card: c.cardSales || 0, other: c.otherSales || 0, sessions: c.sessionCount || 0, guests: c.guestCount || 0 };
      }
    });

    const dailyData = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));
    _dailyChartData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    const periodTotal = dailyData.reduce((s, d) => s + d.total, 0);
    const periodGuests = dailyData.reduce((s, d) => s + d.guests, 0);

    return `
      <div class="card mb-xl">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="calendar" style="width:18px;height:18px;color:#ffffff"></i> 期間指定</h3>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:var(--space-lg);align-items:end;">
          <div class="form-group" style="margin:0;">
            <label class="form-label">開始日</label>
            <input type="date" class="form-input" id="date-from" value="${dateFrom}">
          </div>
          <div class="form-group" style="margin:0;">
            <label class="form-label">終了日</label>
            <input type="date" class="form-input" id="date-to" value="${dateTo}">
          </div>
          <button class="btn btn-primary" id="btn-search-daily">検索</button>
        </div>
      </div>

      <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:var(--space-xl);">
        <div class="stat-card stat-highlight">
          <div class="stat-label">期間売上合計</div>
          <div class="stat-value">${formatMoney(periodTotal)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">期間組数</div>
          <div class="stat-value">${dailyData.reduce((s, d) => s + d.sessions, 0)}組</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">期間客数</div>
          <div class="stat-value">${periodGuests}名</div>
        </div>
      </div>

      <div class="card mb-xl">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="trending-up" style="width:18px;height:18px;color:var(--gold)"></i> 売上推移グラフ</h3>
        </div>
        <div id="daily-chart-wrap" style="padding:var(--space-md) var(--space-lg);"><canvas id="daily-chart"></canvas></div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">日別売上一覧</h3>
        </div>
        ${dailyData.length > 0 ? `
        <table class="data-table">
          <thead>
            <tr>
              <th>日付</th>
              <th class="text-right">売上</th>
              <th class="text-right">現金</th>
              <th class="text-right">カード</th>
              <th class="text-right">その他</th>
              <th class="text-center">組数</th>
              <th class="text-center">客数</th>
              <th class="text-right">客単価</th>
            </tr>
          </thead>
          <tbody>
            ${dailyData.map(d => {
              const avg = d.guests > 0 ? Math.round(d.total / d.guests) : 0;
              return `
                <tr>
                  <td><strong>${formatDate(d.date)}</strong></td>
                  <td class="text-right money" style="font-weight:700;color:var(--gold-light);">${formatMoney(d.total)}</td>
                  <td class="text-right money">${formatMoney(d.cash)}</td>
                  <td class="text-right money">${formatMoney(d.card)}</td>
                  <td class="text-right money">${formatMoney(d.other)}</td>
                  <td class="text-center">${d.sessions}</td>
                  <td class="text-center">${d.guests}</td>
                  <td class="text-right money">${formatMoney(avg)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        ` : '<div class="empty-state"><p>指定期間の売上データがありません</p></div>'}
      </div>
    `;
  }

  function renderWeeklyTab() {
    // 期間指定された週の日別データ
    const allPayments = store.query('payment_records', p => p.date >= weekStart && p.date <= weekEnd);

    // 日付ごとにグループ化
    const dailyMap = {};
    for (let d = new Date(weekStart); d <= new Date(weekEnd); d.setDate(d.getDate() + 1)) {
      const dk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dailyMap[dk] = { date: dk, total: 0, cash: 0, card: 0, other: 0, sessions: 0, guests: 0 };
    }
    allPayments.forEach(p => {
      if (!dailyMap[p.date]) return;
      dailyMap[p.date].total += p.amount || 0;
      if (p.method === 'cash') dailyMap[p.date].cash += p.amount || 0;
      else if (p.method === 'card') dailyMap[p.date].card += p.amount || 0;
      else dailyMap[p.date].other += p.amount || 0;
      dailyMap[p.date].sessions++;
      dailyMap[p.date].guests += p.guestCount || 0;
    });

    const dailyData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    const weekTotal = dailyData.reduce((s, d) => s + d.total, 0);
    const weekCash = dailyData.reduce((s, d) => s + d.cash, 0);
    const weekCard = dailyData.reduce((s, d) => s + d.card, 0);
    const weekOther = dailyData.reduce((s, d) => s + d.other, 0);
    const weekSessions = dailyData.reduce((s, d) => s + d.sessions, 0);
    const weekGuests = dailyData.reduce((s, d) => s + d.guests, 0);

    // 週選択肢を生成（過去12週）
    const weekOptions = generateWeekOptions(12);

    // 曜日ラベル
    const dayOfWeekLabels = ['日', '月', '火', '水', '木', '金', '土'];

    return `
      <div class="card mb-xl">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="calendar" style="width:18px;height:18px;color:#ffffff"></i> 週選択</h3>
        </div>
        <div style="display:grid;grid-template-columns:1fr auto;gap:var(--space-lg);align-items:end;">
          <div class="form-group" style="margin:0;">
            <select class="form-select" id="week-select">
              ${weekOptions.map(w => `<option value="${w.start}|${w.end}" ${w.start === weekStart && w.end === weekEnd ? 'selected' : ''}>${w.label}</option>`).join('')}
            </select>
          </div>
        </div>
        <p style="font-size:var(--text-sm);color:var(--text-tertiary);margin-top:var(--space-md);">期間: ${formatDate(weekStart)} 〜 ${formatDate(weekEnd)}</p>
      </div>

      <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:var(--space-xl);">
        <div class="stat-card stat-highlight">
          <div class="stat-label">週間売上合計</div>
          <div class="stat-value">${formatMoney(weekTotal)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">現金売上</div>
          <div class="stat-value">${formatMoney(weekCash)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">組数</div>
          <div class="stat-value">${weekSessions}組</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">客数</div>
          <div class="stat-value">${weekGuests}名</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">日別内訳</h3>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>日付</th>
              <th class="text-center">曜日</th>
              <th class="text-right">売上</th>
              <th class="text-right">現金</th>
              <th class="text-right">カード</th>
              <th class="text-right">その他</th>
              <th class="text-center">組数</th>
              <th class="text-center">客数</th>
            </tr>
          </thead>
          <tbody>
            ${dailyData.map(d => {
              const dateObj = new Date(d.date);
              const dayIdx = dateObj.getDay();
              const dayColor = dayIdx === 0 ? 'var(--danger)' : dayIdx === 6 ? 'var(--cyan)' : 'var(--text-primary)';
              return `
                <tr>
                  <td><strong>${formatDate(d.date)}</strong></td>
                  <td class="text-center" style="color:${dayColor};font-weight:700;">${dayOfWeekLabels[dayIdx]}</td>
                  <td class="text-right money" style="font-weight:700;color:${d.total > 0 ? 'var(--gold-light)' : 'var(--text-tertiary)'};">${formatMoney(d.total)}</td>
                  <td class="text-right money">${formatMoney(d.cash)}</td>
                  <td class="text-right money">${formatMoney(d.card)}</td>
                  <td class="text-right money">${formatMoney(d.other)}</td>
                  <td class="text-center">${d.sessions}</td>
                  <td class="text-center">${d.guests}</td>
                </tr>
              `;
            }).join('')}
            <tr style="border-top:2px solid var(--border-default);">
              <td colspan="2"><strong>合計</strong></td>
              <td class="text-right money" style="font-weight:700;color:var(--gold-light);">${formatMoney(weekTotal)}</td>
              <td class="text-right money">${formatMoney(weekCash)}</td>
              <td class="text-right money">${formatMoney(weekCard)}</td>
              <td class="text-right money">${formatMoney(weekOther)}</td>
              <td class="text-center"><strong>${weekSessions}</strong></td>
              <td class="text-center"><strong>${weekGuests}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  function renderMonthlyTab() {
    // 指定月のデータを集計
    const monthPrefix = currentMonth; // "YYYY-MM"
    const payments = store.query('payment_records', p => p.date && p.date.startsWith(monthPrefix));
    const totalSales = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const cashSales = payments.filter(p => p.method === 'cash').reduce((s, p) => s + (p.amount || 0), 0);
    const cardSales = payments.filter(p => p.method === 'card').reduce((s, p) => s + (p.amount || 0), 0);
    const otherSales = payments.filter(p => p.method === 'other').reduce((s, p) => s + (p.amount || 0), 0);
    const totalGuests = payments.reduce((s, p) => s + (p.guestCount || 0), 0);
    const sessionCount = payments.length;

    // 人件費: cast_attendance の finalPay から集計
    const attendances = store.query('cast_attendance', a => a.date && a.date.startsWith(monthPrefix) && a.clockOut);
    const totalLabor = attendances.reduce((s, a) => s + (a.finalPay || 0), 0);

    // 粗利
    const grossProfit = totalSales - totalLabor;

    // 月の選択肢を生成（直近12ヶ月）
    const monthOptions = generateMonthOptions(12);

    return `
      <div class="card mb-xl">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="calendar" style="width:18px;height:18px;color:#ffffff"></i> 月選択</h3>
        </div>
        <div class="form-group" style="max-width:300px;margin:0;">
          <select class="form-select" id="month-select">
            ${monthOptions.map(o => `<option value="${o.val}" ${o.val === currentMonth ? 'selected' : ''}>${o.label}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:var(--space-xl);">
        <div class="stat-card stat-highlight">
          <div class="stat-label">月間売上合計</div>
          <div class="stat-value">${formatMoney(totalSales)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">人件費合計</div>
          <div class="stat-value" style="color:var(--danger);">${formatMoney(totalLabor)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">粗利</div>
          <div class="stat-value" style="color:${grossProfit >= 0 ? 'var(--cyan)' : 'var(--danger)'};">${formatMoney(grossProfit)}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">月間詳細</h3>
        </div>
        <div class="billing-summary" style="border:none;">
          <div class="billing-row">
            <span class="billing-label">売上合計</span>
            <span class="billing-value" style="color:var(--gold-light);font-weight:700;">${formatMoney(totalSales)}</span>
          </div>
          <div class="billing-row">
            <span class="billing-label">  現金売上</span>
            <span class="billing-value">${formatMoney(cashSales)}</span>
          </div>
          <div class="billing-row">
            <span class="billing-label">  カード売上</span>
            <span class="billing-value">${formatMoney(cardSales)}</span>
          </div>
          <div class="billing-row">
            <span class="billing-label">  その他売上</span>
            <span class="billing-value">${formatMoney(otherSales)}</span>
          </div>
          <div class="billing-row">
            <span class="billing-label">組数</span>
            <span class="billing-value">${sessionCount}組</span>
          </div>
          <div class="billing-row">
            <span class="billing-label">客数</span>
            <span class="billing-value">${totalGuests}名</span>
          </div>
          <div class="billing-row">
            <span class="billing-label">客単価</span>
            <span class="billing-value">${formatMoney(totalGuests > 0 ? Math.round(totalSales / totalGuests) : 0)}</span>
          </div>
          <div style="border-top:1px solid var(--border-subtle);margin:var(--space-md) 0;"></div>
          <div class="billing-row">
            <span class="billing-label">人件費（キャスト給与）</span>
            <span class="billing-value" style="color:var(--danger);">${formatMoney(totalLabor)}</span>
          </div>
          <div class="billing-row billing-total">
            <span class="billing-label">粗利</span>
            <span class="billing-value">${formatMoney(grossProfit)}</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderCastTab() {
    const casts = store.query('casts', c => c.active);

    // 期間判定
    let periodStart, periodEnd, periodLabel;
    if (castPeriod === 'daily') {
      periodStart = today;
      periodEnd = today;
      periodLabel = '本日';
    } else if (castPeriod === 'weekly') {
      periodStart = weekStart;
      periodEnd = weekEnd;
      periodLabel = `${formatDate(periodStart)} 〜 ${formatDate(periodEnd)}`;
    } else {
      periodStart = currentMonth + '-01';
      const [y, m] = currentMonth.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      periodEnd = `${currentMonth}-${String(lastDay).padStart(2, '0')}`;
      periodLabel = `${y}年${m}月`;
    }

    const inPeriod = (d) => d >= periodStart && d <= periodEnd;

    const castSales = casts.map(cast => {
      const allNominations = store.query('nominations', n => n.castId === cast.id && n.type === 'honshimei');
      const periodHonshimei = allNominations.filter(n => inPeriod(n.date));

      let periodSales = 0;
      const seenSessions = new Set();
      periodHonshimei.forEach(nom => {
        if (seenSessions.has(nom.sessionId)) return;
        const session = store.getById('table_sessions', nom.sessionId);
        if (session && session.totalAmount) {
          seenSessions.add(nom.sessionId);
          periodSales += session.totalAmount;
        }
      });

      const periodDrinks = store.query('order_items', oi => oi.castId === cast.id && inPeriod(oi.date) && !oi.cancelled);
      const drinkCount = periodDrinks.filter(oi => oi.category === 'cast_drink').reduce((s, d) => s + d.quantity, 0);
      const champagneCount = periodDrinks.filter(oi => oi.category === 'champagne').reduce((s, d) => s + d.quantity, 0);
      const wineCount = periodDrinks.filter(oi => oi.category === 'wine').reduce((s, d) => s + d.quantity, 0);
      const banaiCount = store.query('nominations', n => n.castId === cast.id && n.type === 'banai' && inPeriod(n.date)).length;
      const douhanCount = store.query('nominations', n => n.castId === cast.id && n.type === 'douhan' && inPeriod(n.date)).length;

      return {
        cast,
        honshimeiCount: periodHonshimei.length,
        banaiCount,
        douhanCount,
        periodSales,
        drinkCount,
        champagneCount,
        wineCount
      };
    }).sort((a, b) => b.periodSales - a.periodSales);

    const maxSales = castSales.length > 0 ? castSales[0].periodSales : 0;
    const monthOptions = generateMonthOptions(12);
    const weekOpts = generateWeekOptions(12);

    return `
      <div class="card mb-xl">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="sliders" style="width:18px;height:18px;color:var(--gold)"></i> 期間指定</h3>
        </div>
        <div class="filter-bar" style="margin-bottom:var(--space-md);">
          <div class="filter-chip ${castPeriod === 'daily' ? 'active' : ''}" data-cast-period="daily">日別</div>
          <div class="filter-chip ${castPeriod === 'weekly' ? 'active' : ''}" data-cast-period="weekly">週別</div>
          <div class="filter-chip ${castPeriod === 'monthly' ? 'active' : ''}" data-cast-period="monthly">月別</div>
        </div>
        ${castPeriod === 'weekly' ? `
        <div class="form-group" style="max-width:400px;margin:0;">
          <label class="form-label">週を選択</label>
          <select class="form-select" id="cast-week-select">
            ${weekOpts.map(w => `<option value="${w.start}|${w.end}" ${w.start === weekStart && w.end === weekEnd ? 'selected' : ''}>${w.label}</option>`).join('')}
          </select>
        </div>
        ` : ''}
        ${castPeriod === 'monthly' ? `
        <div class="form-group" style="max-width:300px;margin:0;">
          <label class="form-label">月を選択</label>
          <select class="form-select" id="cast-month-select">
            ${monthOptions.map(o => `<option value="${o.val}" ${o.val === currentMonth ? 'selected' : ''}>${o.label}</option>`).join('')}
          </select>
        </div>
        ` : ''}
        <p style="font-size:var(--text-sm);color:var(--text-tertiary);margin-top:var(--space-md);">対象期間: <strong style="color:var(--text-primary);">${periodLabel}</strong></p>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="trending-up" style="width:18px;height:18px;color:var(--gold)"></i> キャスト別売上</h3>
          <span style="font-size:var(--text-sm);color:var(--text-secondary);">${periodLabel}</span>
        </div>
        ${castSales.length > 0 && maxSales > 0 ? `
        <div style="padding:var(--space-lg);border-bottom:1px solid var(--border-subtle);">
          ${castSales.map((cs, idx) => `
            <div style="display:flex;align-items:center;gap:12px;${idx < castSales.length - 1 ? 'margin-bottom:8px;' : ''}">
              <div style="width:80px;text-align:right;font-weight:700;font-size:13px;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${cs.cast.name}</div>
              <div style="flex:1;height:24px;background:rgba(255,255,255,0.04);border-radius:6px;overflow:hidden;">
                <div class="cast-bar-fill" data-width="${Math.round((cs.periodSales / maxSales) * 100)}" style="width:0;height:100%;background:linear-gradient(90deg,var(--gold-dim),var(--gold));border-radius:6px;transition:width 0.8s cubic-bezier(0.22,1,0.36,1);"></div>
              </div>
              <div style="min-width:100px;text-align:right;font-weight:700;font-family:var(--font-mono);font-size:13px;color:var(--gold-light);">${formatMoney(cs.periodSales)}</div>
            </div>
          `).join('')}
        </div>
        ` : ''}
        <table class="data-table">
          <thead>
            <tr>
              <th>キャスト</th>
              <th class="text-center">本指名</th>
              <th class="text-center">場内</th>
              <th class="text-center">同伴</th>
              <th class="text-center">ドリンク</th>
              <th class="text-center">シャンパン</th>
              <th class="text-center">ワイン</th>
              <th class="text-right">${periodLabel}売上</th>
            </tr>
          </thead>
          <tbody>
            ${castSales.map(cs => `
              <tr style="cursor:pointer;" onclick="location.hash='#/casts/${cs.cast.id}'">
                <td>
                  <div style="display:flex;align-items:center;gap:var(--space-md);">
                    <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold-dim));display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--bg-deepest);font-size:var(--text-xs);">${cs.cast.name.charAt(0)}</div>
                    <strong>${cs.cast.name}</strong>
                  </div>
                </td>
                <td class="text-center" style="color:${cs.honshimeiCount > 0 ? 'var(--gold-light)' : 'var(--text-tertiary)'};">${cs.honshimeiCount}</td>
                <td class="text-center">${cs.banaiCount}</td>
                <td class="text-center">${cs.douhanCount}</td>
                <td class="text-center">${cs.drinkCount}</td>
                <td class="text-center">${cs.champagneCount}</td>
                <td class="text-center">${cs.wineCount}</td>
                <td class="text-right money" style="font-weight:700;color:var(--gold-light);">${formatMoney(cs.periodSales)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function attachEvents() {
    // Tab switching
    content.querySelectorAll('.filter-chip[data-tab]').forEach(chip => {
      chip.addEventListener('click', () => {
        activeTab = chip.dataset.tab;
        render();
      });
    });

    // Cast period switching
    content.querySelectorAll('.filter-chip[data-cast-period]').forEach(chip => {
      chip.addEventListener('click', () => {
        castPeriod = chip.dataset.castPeriod;
        render();
      });
    });

    // Daily search
    content.querySelector('#btn-search-daily')?.addEventListener('click', () => {
      dateFrom = content.querySelector('#date-from')?.value || today;
      dateTo = content.querySelector('#date-to')?.value || today;
      render();
    });

    // Weekly select
    content.querySelector('#week-select')?.addEventListener('change', (e) => {
      const [s, e2] = e.target.value.split('|');
      weekStart = s;
      weekEnd = e2;
      render();
    });

    // Cast week select
    content.querySelector('#cast-week-select')?.addEventListener('change', (e) => {
      const [s, e2] = e.target.value.split('|');
      weekStart = s;
      weekEnd = e2;
      render();
    });

    // Cast month select
    content.querySelector('#cast-month-select')?.addEventListener('change', (e) => {
      currentMonth = e.target.value;
      render();
    });

    // Month select (monthly tab)
    content.querySelector('#month-select')?.addEventListener('change', (e) => {
      currentMonth = e.target.value;
      render();
    });
  }

  render();
}

// ============================================
// ヘルパー: 週範囲（月曜〜日曜）を取得
// ============================================
function getCurrentWeekRange(todayKey) {
  const [y, m, d] = todayKey.split('-').map(Number);
  const base = new Date(y, m - 1, d);
  const dow = base.getDay(); // 0=日 ... 6=土
  // 月曜始まり
  const offsetFromMonday = (dow + 6) % 7;
  const monday = new Date(base);
  monday.setDate(base.getDate() - offsetFromMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  return { weekStart: fmt(monday), weekEnd: fmt(sunday) };
}

// ============================================
// ヘルパー: 週オプション（過去N週）
// ============================================
function generateWeekOptions(count) {
  const options = [];
  const now = new Date();
  const dow = now.getDay();
  const offsetFromMonday = (dow + 6) % 7;
  const thisMonday = new Date(now);
  thisMonday.setHours(0, 0, 0, 0);
  thisMonday.setDate(now.getDate() - offsetFromMonday);

  for (let i = 0; i < count; i++) {
    const mon = new Date(thisMonday);
    mon.setDate(thisMonday.getDate() - 7 * i);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const fmt = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const start = fmt(mon);
    const end = fmt(sun);
    const label = i === 0
      ? `今週 (${mon.getMonth() + 1}/${mon.getDate()} - ${sun.getMonth() + 1}/${sun.getDate()})`
      : `${mon.getMonth() + 1}/${mon.getDate()} - ${sun.getMonth() + 1}/${sun.getDate()}`;
    options.push({ start, end, label });
  }
  return options;
}

// ============================================
// ヘルパー: 月オプション（過去N月）
// ============================================
function generateMonthOptions(count) {
  const options = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    options.push({ val, label });
  }
  return options;
}

// ============================================
// 日別売上 折れ線グラフ（Canvas アニメーション）
// ============================================
function drawDailyLineChart(data) {
  const canvas = document.getElementById('daily-chart');
  if (!canvas) return;
  if (data.length < 2) {
    canvas.parentElement.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:var(--space-xl) 0;font-size:var(--text-sm);">グラフ表示には2日以上のデータが必要です</div>';
    return;
  }

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const container = canvas.parentElement;
  const w = container.clientWidth;
  const h = 260;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.scale(dpr, dpr);

  const pad = { t: 25, r: 25, b: 45, l: 75 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;
  const maxVal = Math.max(...data.map(d => d.total)) * 1.15 || 1;

  function getX(i) { return pad.l + (cw / Math.max(data.length - 1, 1)) * i; }
  function getY(v) { return pad.t + ch - (v / maxVal) * ch; }

  function fmtY(n) {
    if (n >= 10000) return '\u00a5' + Math.round(n / 10000) + '\u4e07';
    if (n >= 1000) return '\u00a5' + Math.round(n / 1000) + 'K';
    return '\u00a5' + Math.round(n);
  }

  function fmtMoney(n) {
    return '\u00a5' + n.toLocaleString();
  }

  const pts = data.map((d, i) => ({ x: getX(i), y: getY(d.total), total: d.total, date: d.date }));

  // Hover state
  let hoverIndex = -1;
  let animDone = false;

  // Tooltip element
  let tooltip = container.querySelector('.chart-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'chart-tooltip';
    tooltip.style.cssText = 'position:absolute;pointer-events:none;background:rgba(22,22,34,0.95);border:1px solid rgba(200,169,96,0.5);border-radius:6px;padding:8px 12px;font-size:12px;color:#eeeef2;white-space:nowrap;opacity:0;transition:opacity 0.15s;z-index:10;box-shadow:0 4px 12px rgba(0,0,0,0.4);';
    container.style.position = 'relative';
    container.appendChild(tooltip);
  }

  function drawFrame(progress, hovIdx) {
    ctx.clearRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(100,100,130,0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (ch / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(pad.l + cw, y);
      ctx.stroke();
      ctx.fillStyle = '#686878';
      ctx.font = '11px system-ui,sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(fmtY(maxVal - (maxVal / 4) * i), pad.l - 10, y + 4);
    }

    // X labels
    ctx.textAlign = 'center';
    ctx.fillStyle = '#686878';
    ctx.font = '10px system-ui,sans-serif';
    const step = Math.max(1, Math.ceil(data.length / 10));
    data.forEach((d, i) => {
      if (i % step === 0 || i === data.length - 1) {
        ctx.fillText(d.date.substring(5).replace('-', '/'), getX(i), h - 10);
      }
    });

    // Clip for animation (reveal left to right)
    const clipX = pad.l + cw * progress;
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad.l - 6, 0, clipX - pad.l + 12, h);
    ctx.clip();

    if (pts.length > 1) {
      // Area fill
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.lineTo(pts[pts.length - 1].x, pad.t + ch);
      ctx.lineTo(pts[0].x, pad.t + ch);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch);
      grad.addColorStop(0, 'rgba(200,169,96,0.25)');
      grad.addColorStop(1, 'rgba(200,169,96,0.02)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Line
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = '#c8a960';
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();

      // Hover vertical guide line
      if (hovIdx >= 0 && hovIdx < pts.length) {
        ctx.strokeStyle = 'rgba(200,169,96,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(pts[hovIdx].x, pad.t);
        ctx.lineTo(pts[hovIdx].x, pad.t + ch);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Dots
      pts.forEach((p, i) => {
        const isHover = i === hovIdx;
        const outerR = isHover ? 7 : 4.5;
        const innerR = isHover ? 3 : 2;

        ctx.beginPath();
        ctx.arc(p.x, p.y, outerR, 0, Math.PI * 2);
        ctx.fillStyle = isHover ? '#dcc07a' : '#c8a960';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, innerR, 0, Math.PI * 2);
        ctx.fillStyle = '#161622';
        ctx.fill();
      });
    }

    ctx.restore();
  }

  // Mouse interaction
  function getHoverIndex(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let closest = -1;
    let minDist = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const dx = mx - pts[i].x;
      const dy = my - pts[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist && dist < 30) {
        minDist = dist;
        closest = i;
      }
    }
    return closest;
  }

  canvas.addEventListener('mousemove', (e) => {
    if (!animDone) return;
    const idx = getHoverIndex(e);
    if (idx === hoverIndex) return;
    hoverIndex = idx;
    drawFrame(1, hoverIndex);

    if (idx >= 0 && idx < pts.length) {
      const p = pts[idx];
      const dateLabel = p.date.replace(/-/g, '/');
      tooltip.innerHTML = `<div style="font-weight:700;color:var(--gold-light);margin-bottom:2px;">${dateLabel}</div><div style="font-family:var(--font-mono);font-size:14px;font-weight:800;">${fmtMoney(p.total)}</div>`;
      tooltip.style.opacity = '1';

      // Position tooltip
      const tx = p.x;
      const ty = p.y - 16;
      const ttW = tooltip.offsetWidth;
      const ttH = tooltip.offsetHeight;
      let left = tx - ttW / 2;
      if (left < 0) left = 4;
      if (left + ttW > w) left = w - ttW - 4;
      let top = ty - ttH - 4;
      if (top < 0) top = ty + 20;
      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';

      canvas.style.cursor = 'pointer';
    } else {
      tooltip.style.opacity = '0';
      canvas.style.cursor = '';
    }
  });

  canvas.addEventListener('mouseleave', () => {
    if (!animDone) return;
    hoverIndex = -1;
    tooltip.style.opacity = '0';
    canvas.style.cursor = '';
    drawFrame(1, -1);
  });

  // Animation
  const dur = 1200;
  const start = performance.now();
  function tick(ts) {
    const p = Math.min((ts - start) / dur, 1);
    drawFrame(1 - Math.pow(1 - p, 3), -1); // ease-out cubic
    if (p < 1) requestAnimationFrame(tick);
    else animDone = true;
  }
  requestAnimationFrame(tick);
}
