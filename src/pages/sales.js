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
  // 現在タブ
  let activeTab = 'daily';
  // チャート用データ
  let _dailyChartData = [];

  function render() {
    content.innerHTML = `
      <!-- Tabs -->
      <div class="filter-bar" style="margin-bottom:var(--space-xl);">
        <div class="filter-chip ${activeTab === 'daily' ? 'active' : ''}" data-tab="daily">日別売上</div>
        <div class="filter-chip ${activeTab === 'monthly' ? 'active' : ''}" data-tab="monthly">月間集計</div>
        <div class="filter-chip ${activeTab === 'cast' ? 'active' : ''}" data-tab="cast">キャスト別</div>
      </div>

      ${activeTab === 'daily' ? renderDailyTab() : ''}
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
          <h3 class="card-title"><i data-lucide="calendar" style="width:18px;height:18px;color:var(--gold)"></i> 期間指定</h3>
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
    const monthOptions = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
      monthOptions.push({ val, label });
    }

    return `
      <div class="card mb-xl">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="calendar" style="width:18px;height:18px;color:var(--cyan)"></i> 月選択</h3>
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
    const settings = store.getSettings();
    const casts = store.query('casts', c => c.active);

    const castSales = casts.map(cast => {
      const allNominations = store.query('nominations', n => n.castId === cast.id && n.type === 'honshimei');
      const todayNominations = allNominations.filter(n => n.date === today);

      let todaysSales = 0;
      allNominations.forEach(nom => {
        const session = store.getById('table_sessions', nom.sessionId);
        if (session && session.totalAmount && nom.date === today) todaysSales += session.totalAmount;
      });

      const todayDrinks = store.query('order_items', oi => oi.castId === cast.id && oi.date === today && !oi.cancelled);
      const drinkCount = todayDrinks.filter(oi => oi.category === 'cast_drink').reduce((s, d) => s + d.quantity, 0);
      const champagneCount = todayDrinks.filter(oi => oi.category === 'champagne').reduce((s, d) => s + d.quantity, 0);
      const wineCount = todayDrinks.filter(oi => oi.category === 'wine').reduce((s, d) => s + d.quantity, 0);
      const banaiCount = store.query('nominations', n => n.castId === cast.id && n.type === 'banai' && n.date === today).length;
      const douhanCount = store.query('nominations', n => n.castId === cast.id && n.type === 'douhan' && n.date === today).length;

      return {
        cast,
        honshimeiCount: todayNominations.length,
        banaiCount,
        douhanCount,
        todaysSales,
        drinkCount,
        champagneCount,
        wineCount
      };
    }).sort((a, b) => b.todaysSales - a.todaysSales);

    const maxSales = castSales.length > 0 ? castSales[0].todaysSales : 0;

    return `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="trending-up" style="width:18px;height:18px;color:var(--gold)"></i> キャスト別売上（本日）</h3>
        </div>
        ${castSales.length > 0 && maxSales > 0 ? `
        <div style="padding:var(--space-lg);border-bottom:1px solid var(--border-subtle);">
          ${castSales.map((cs, idx) => `
            <div style="display:flex;align-items:center;gap:12px;${idx < castSales.length - 1 ? 'margin-bottom:8px;' : ''}">
              <div style="width:70px;text-align:right;font-weight:700;font-size:13px;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${cs.cast.name}</div>
              <div style="flex:1;height:24px;background:rgba(255,255,255,0.04);border-radius:6px;overflow:hidden;">
                <div class="cast-bar-fill" data-width="${Math.round((cs.todaysSales / maxSales) * 100)}" style="width:0;height:100%;background:linear-gradient(90deg,var(--gold-dim),var(--gold));border-radius:6px;transition:width 0.8s cubic-bezier(0.22,1,0.36,1);"></div>
              </div>
              <div style="min-width:90px;text-align:right;font-weight:700;font-family:var(--font-mono);font-size:13px;color:var(--gold-light);">${formatMoney(cs.todaysSales)}</div>
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
              <th class="text-right">本日売上</th>
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
                <td class="text-right money" style="font-weight:700;color:var(--gold-light);">${formatMoney(cs.todaysSales)}</td>
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

    // Daily search
    content.querySelector('#btn-search-daily')?.addEventListener('click', () => {
      dateFrom = content.querySelector('#date-from')?.value || today;
      dateTo = content.querySelector('#date-to')?.value || today;
      render();
    });

    // Month select
    content.querySelector('#month-select')?.addEventListener('change', (e) => {
      currentMonth = e.target.value;
      render();
    });
  }

  render();
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

  const pts = data.map((d, i) => ({ x: getX(i), y: getY(d.total), total: d.total }));

  function drawFrame(progress) {
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

      // Dots
      pts.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#c8a960';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#161622';
        ctx.fill();
      });

      // Value labels (show if 14 or fewer data points)
      if (data.length <= 14) {
        ctx.fillStyle = '#dcc07a';
        ctx.font = 'bold 10px system-ui,sans-serif';
        ctx.textAlign = 'center';
        pts.forEach(p => {
          ctx.fillText(fmtY(p.total), p.x, p.y - 10);
        });
      }
    }

    ctx.restore();
  }

  // Animation
  const dur = 1200;
  const start = performance.now();
  function tick(ts) {
    const p = Math.min((ts - start) / dur, 1);
    drawFrame(1 - Math.pow(1 - p, 3)); // ease-out cubic
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
