// ============================================
// Daily Pay Page - 日払い管理画面
// ============================================
import { renderLayout, setPageTitle } from '../components/layout.js';
import { store } from '../store/index.js';
import { formatMoney, formatTime, formatDate, todayKey } from '../utils/format.js';

export function renderDailyPay() {
  renderLayout('', 'daily-pay');
  setPageTitle('日払い管理');

  const content = document.getElementById('page-content');
  const today = todayKey();

  const payments = store.query('cast_payments', p => p.type === 'daily').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const todayPayments = payments.filter(p => p.date === today);
  const todayTotal = todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  content.innerHTML = `
    <div class="stats-grid" style="grid-template-columns:repeat(2,1fr);">
      <div class="stat-card stat-highlight">
        <div class="stat-label">本日日払い合計</div>
        <div class="stat-value">${formatMoney(todayTotal)}</div>
        <div class="stat-sub">${todayPayments.length}件</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">全期間日払い合計</div>
        <div class="stat-value">${formatMoney(payments.reduce((s, p) => s + (p.amount || 0), 0))}</div>
        <div class="stat-sub">${payments.length}件</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title"><i data-lucide="wallet" style="width:18px;height:18px;color:var(--gold)"></i> 日払い履歴</h3>
      </div>
      ${payments.length > 0 ? `
      <table class="data-table">
        <thead>
          <tr>
            <th>日付</th>
            <th>時刻</th>
            <th>キャスト</th>
            <th class="text-right">金額</th>
          </tr>
        </thead>
        <tbody>
          ${payments.slice(0, 100).map(p => {
            const cast = store.getById('casts', p.castId);
            return `
              <tr>
                <td>${formatDate(p.date)}</td>
                <td style="font-family:var(--font-mono);">${formatTime(p.createdAt)}</td>
                <td><strong>${cast?.name || '-'}</strong></td>
                <td class="text-right money" style="font-weight:700;">${formatMoney(p.amount)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      ` : '<div class="empty-state"><p>日払い履歴がありません</p></div>'}
    </div>
  `;

  if (window.lucide) lucide.createIcons();
}
