// ============================================
// Salary Page - 給与計算画面（本日の給与 + 日払い履歴）
// ============================================
import { renderLayout, setPageTitle } from '../components/layout.js';
import { store } from '../store/index.js';
import { formatMoney, formatDate, todayKey } from '../utils/format.js';
import { calcCastDailyPay } from '../utils/calc.js';

export function renderSalary() {
  renderLayout('', 'salary');
  setPageTitle('給与計算');

  const content = document.getElementById('page-content');
  const today = todayKey();
  const settings = store.getSettings();
  const casts = store.query('casts', c => c.active);

  let activeTab = 'today';
  let historyMonth = today.substring(0, 7);

  function render() {
    content.innerHTML = `
      <div class="filter-bar" style="margin-bottom:var(--space-xl);">
        <div class="filter-chip ${activeTab === 'today' ? 'active' : ''}" data-tab="today">本日の給与</div>
        <div class="filter-chip ${activeTab === 'history' ? 'active' : ''}" data-tab="history">日払い履歴</div>
      </div>
      ${activeTab === 'today' ? renderTodayTab() : ''}
      ${activeTab === 'history' ? renderHistoryTab() : ''}
    `;

    if (window.lucide) lucide.createIcons();
    attachEvents();
  }

  function renderTodayTab() {
    const salaryData = casts.map(cast => {
      const attendance = store.query('cast_attendance', a => a.castId === cast.id && a.date === today)[0];
      if (!attendance) return { cast, attendance: null, payCalc: null, dailyPaid: 0 };

      const todayDrinks = store.query('order_items', oi => oi.date === today && oi.castId === cast.id && !oi.cancelled);
      const nominations = store.query('nominations', n => n.castId === cast.id && n.date === today);
      const hasHonshimei = nominations.some(n => n.type === 'honshimei');
      const honshimeiNoms = nominations.filter(n => n.type === 'honshimei');
      const banaiNoms = nominations.filter(n => n.type === 'banai');
      const douhanNoms = nominations.filter(n => n.type === 'douhan');

      const backItems = [
        ...todayDrinks.filter(oi => oi.category === 'cast_drink').map(d => ({ type: 'drink', quantity: d.quantity, backPrice: cast.drinkBackPrice })),
        ...todayDrinks.filter(oi => oi.category === 'champagne').map(d => ({ type: 'champagne', quantity: d.quantity, backPrice: cast.champagneBackPrice })),
        ...todayDrinks.filter(oi => oi.category === 'wine').map(d => ({ type: 'wine', quantity: d.quantity, backPrice: cast.wineBackPrice })),
        ...todayDrinks.filter(oi => oi.category === 'bottle').map(d => ({ type: 'bottle', quantity: d.quantity, backPrice: cast.bottleBackPrice || 0 })),
        ...honshimeiNoms.map(() => ({ type: 'nomination', quantity: 1, backPrice: cast.nominationBackPrice || 0 })),
        ...banaiNoms.map(() => ({ type: 'banai', quantity: 1, backPrice: cast.banaiBackPrice || 0 })),
        ...douhanNoms.map(() => ({ type: 'douhan', quantity: 1, backPrice: cast.douhanBackPrice || 0 }))
      ];

      const payCalc = calcCastDailyPay({ ...attendance, hasHonshimei }, backItems, settings);
      const dailyPayments = store.query('cast_payments', p => p.castId === cast.id && p.date === today);
      const dailyPaid = dailyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      return { cast, attendance, payCalc, dailyPaid };
    }).filter(d => d.attendance);

    const totalGross = salaryData.reduce((s, d) => s + (d.payCalc?.grossPay || 0), 0);
    const totalDailyPaid = salaryData.reduce((s, d) => s + d.dailyPaid, 0);
    const totalNet = totalGross - totalDailyPaid;

    return `
      <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);">
        <div class="stat-card stat-highlight">
          <div class="stat-label">総支給額合計</div>
          <div class="stat-value">${formatMoney(totalGross)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">日払い合計</div>
          <div class="stat-value" style="color:var(--danger);">${formatMoney(totalDailyPaid)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">差引合計</div>
          <div class="stat-value" style="color:var(--cyan);">${formatMoney(totalNet)}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="calculator" style="width:18px;height:18px;color:var(--gold)"></i> 本日の給与一覧</h3>
          <span style="font-size:var(--text-sm);color:var(--text-secondary);">${salaryData.length}名</span>
        </div>
        ${salaryData.length > 0 ? `
        <table class="data-table">
          <thead>
            <tr>
              <th>キャスト</th>
              <th class="text-right">時給</th>
              <th class="text-right">勤務時間</th>
              <th class="text-right">時給合計</th>
              <th class="text-right">バック合計</th>
              <th class="text-right">総支給額</th>
              <th class="text-right">日払い済</th>
              <th class="text-right">差引</th>
              <th class="text-center">スライド</th>
            </tr>
          </thead>
          <tbody>
            ${salaryData.map(d => `
              <tr style="cursor:pointer;" onclick="location.hash='#/casts/${d.cast.id}'">
                <td><strong>${d.cast.name}</strong></td>
                <td class="text-right money">${formatMoney(d.payCalc.hourlyRate)}</td>
                <td class="text-right">${d.payCalc.hoursWorked.toFixed(1)}h</td>
                <td class="text-right money">${formatMoney(d.payCalc.basePay)}</td>
                <td class="text-right money">${formatMoney(d.payCalc.totalBack)}</td>
                <td class="text-right money">${formatMoney(d.payCalc.grossPay)}</td>
                <td class="text-right money" style="color:var(--danger);">${d.dailyPaid > 0 ? '-' + formatMoney(d.dailyPaid) : '-'}</td>
                <td class="text-right money" style="font-weight:700;color:var(--gold-light);">${formatMoney(d.payCalc.grossPay - d.dailyPaid)}</td>
                <td class="text-center">${d.payCalc.hasSlide ? '<span class="badge badge-gold">\u25CF</span>' : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : '<div class="empty-state"><p>本日出勤のキャストがいません</p></div>'}
      </div>
    `;
  }

  function renderHistoryTab() {
    // Month options (past 12 months)
    const monthOptions = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      const label = d.getFullYear() + '\u5E74' + (d.getMonth() + 1) + '\u6708';
      monthOptions.push({ val, label });
    }

    // Get all daily payments for the selected month
    const allPayments = store.query('cast_payments', p => p.date && p.date.startsWith(historyMonth));
    allPayments.sort((a, b) => b.date.localeCompare(a.date));

    // Per-cast summary
    const castSummaryMap = {};
    allPayments.forEach(p => {
      if (!castSummaryMap[p.castId]) {
        castSummaryMap[p.castId] = {
          castId: p.castId,
          castName: p.castName || store.getById('casts', p.castId)?.name || '-',
          count: 0,
          total: 0
        };
      }
      castSummaryMap[p.castId].count++;
      castSummaryMap[p.castId].total += p.amount || 0;
    });
    const castSummaries = Object.values(castSummaryMap).sort((a, b) => b.total - a.total);
    const grandTotal = castSummaries.reduce((s, c) => s + c.total, 0);

    return `
      <div class="card mb-xl">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="calendar" style="width:18px;height:18px;color:var(--cyan)"></i> \u6708\u9078\u629E</h3>
        </div>
        <div class="form-group" style="max-width:300px;margin:0;">
          <select class="form-select" id="history-month-select">
            ${monthOptions.map(o => `<option value="${o.val}" ${o.val === historyMonth ? 'selected' : ''}>${o.label}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:var(--space-xl);">
        <div class="stat-card stat-highlight">
          <div class="stat-label">\u6708\u9593\u65E5\u6255\u3044\u5408\u8A08</div>
          <div class="stat-value" style="color:var(--danger);">${formatMoney(grandTotal)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">\u652F\u6255\u56DE\u6570</div>
          <div class="stat-value">${allPayments.length}\u56DE</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">\u5BFE\u8C61\u30AD\u30E3\u30B9\u30C8</div>
          <div class="stat-value">${castSummaries.length}\u540D</div>
        </div>
      </div>

      <!-- Per-cast summary -->
      <div class="card mb-xl">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="users" style="width:18px;height:18px;color:var(--gold)"></i> \u30AD\u30E3\u30B9\u30C8\u5225\u6708\u9593\u5408\u8A08</h3>
        </div>
        ${castSummaries.length > 0 ? `
        <table class="data-table">
          <thead>
            <tr>
              <th>\u30AD\u30E3\u30B9\u30C8</th>
              <th class="text-center">\u652F\u6255\u56DE\u6570</th>
              <th class="text-right">\u6708\u9593\u5408\u8A08</th>
            </tr>
          </thead>
          <tbody>
            ${castSummaries.map(cs => `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:var(--space-md);">
                    <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold-dim));display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--bg-deepest);font-size:var(--text-xs);">${cs.castName.charAt(0)}</div>
                    <strong>${cs.castName}</strong>
                  </div>
                </td>
                <td class="text-center">${cs.count}\u56DE</td>
                <td class="text-right money" style="font-weight:700;color:var(--danger);">${formatMoney(cs.total)}</td>
              </tr>
            `).join('')}
            <tr style="border-top:2px solid var(--border-default);">
              <td><strong>\u5408\u8A08</strong></td>
              <td class="text-center"><strong>${allPayments.length}\u56DE</strong></td>
              <td class="text-right money" style="font-weight:700;color:var(--gold-light);">${formatMoney(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
        ` : '<div class="empty-state"><p>\u3053\u306E\u6708\u306E\u65E5\u6255\u3044\u5C65\u6B74\u304C\u3042\u308A\u307E\u305B\u3093</p></div>'}
      </div>

      <!-- Detail list -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="list" style="width:18px;height:18px;color:var(--cyan)"></i> \u65E5\u6255\u3044\u660E\u7D30</h3>
          <span style="font-size:var(--text-sm);color:var(--text-secondary);">${allPayments.length}\u4EF6</span>
        </div>
        ${allPayments.length > 0 ? `
        <table class="data-table">
          <thead>
            <tr>
              <th>\u65E5\u4ED8</th>
              <th>\u30AD\u30E3\u30B9\u30C8</th>
              <th class="text-right">\u91D1\u984D</th>
              <th>\u30E1\u30E2</th>
            </tr>
          </thead>
          <tbody>
            ${allPayments.map(p => `
              <tr>
                <td style="font-family:var(--font-mono);font-size:var(--text-sm);">${formatDate(p.date)}</td>
                <td><strong>${p.castName || store.getById('casts', p.castId)?.name || '-'}</strong></td>
                <td class="text-right money" style="color:var(--danger);">${formatMoney(p.amount)}</td>
                <td style="font-size:var(--text-sm);color:var(--text-secondary);">${p.note || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : '<div class="empty-state"><p>\u3053\u306E\u6708\u306E\u65E5\u6255\u3044\u5C65\u6B74\u304C\u3042\u308A\u307E\u305B\u3093</p></div>'}
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

    // History month select
    content.querySelector('#history-month-select')?.addEventListener('change', (e) => {
      historyMonth = e.target.value;
      render();
    });
  }

  render();
}
