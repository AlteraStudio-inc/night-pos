// ============================================
// Salary Page - 給与計算画面
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

  const salaryData = casts.map(cast => {
    const attendance = store.query('cast_attendance', a => a.castId === cast.id && a.date === today)[0];
    if (!attendance) return { cast, attendance: null, payCalc: null, dailyPaid: 0 };

    const todayDrinks = store.query('order_items', oi => oi.date === today && oi.castId === cast.id && !oi.cancelled);
    const backItems = [
      ...todayDrinks.filter(oi => oi.category === 'cast_drink').map(d => ({ type: 'drink', quantity: d.quantity, backPrice: cast.drinkBackPrice })),
      ...todayDrinks.filter(oi => oi.category === 'champagne').map(d => ({ type: 'champagne', quantity: d.quantity, backPrice: cast.champagneBackPrice })),
      ...todayDrinks.filter(oi => oi.category === 'wine').map(d => ({ type: 'wine', quantity: d.quantity, backPrice: cast.wineBackPrice }))
    ];

    const nominations = store.query('nominations', n => n.castId === cast.id && n.date === today);
    const hasHonshimei = nominations.some(n => n.type === 'honshimei');

    const payCalc = calcCastDailyPay({ ...attendance, hasHonshimei }, backItems, settings);
    const dailyPayments = store.query('cast_payments', p => p.castId === cast.id && p.date === today);
    const dailyPaid = dailyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    return { cast, attendance, payCalc, dailyPaid };
  }).filter(d => d.attendance);

  const totalGross = salaryData.reduce((s, d) => s + (d.payCalc?.grossPay || 0), 0);
  const totalDailyPaid = salaryData.reduce((s, d) => s + d.dailyPaid, 0);
  const totalNet = totalGross - totalDailyPaid;

  content.innerHTML = `
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
              <td class="text-center">${d.payCalc.hasSlide ? '<span class="badge badge-gold">●</span>' : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : '<div class="empty-state"><p>本日出勤のキャストがいません</p></div>'}
    </div>
  `;

  if (window.lucide) lucide.createIcons();
}
