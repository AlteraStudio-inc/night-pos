// ============================================
// Closing Page - 締め作業画面
// ============================================
import { renderLayout, setPageTitle } from '../components/layout.js';
import { store } from '../store/index.js';
import { formatMoney, formatNumber, todayKey, now } from '../utils/format.js';
import { showConfirm } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export function renderClosing() {
  renderLayout('', 'closing');
  setPageTitle('締め作業');

  const content = document.getElementById('page-content');
  const today = todayKey();
  const settings = store.getSettings();

  // Check if already closed
  const existingClosing = store.query('daily_closings', c => c.date === today)[0];

  // Gather all today's data
  const sessions = store.query('table_sessions', s => s.date === today);
  const activeSessions = sessions.filter(s => s.status === 'active' || s.status === 'extended' || s.status === 'billing');
  const completedSessions = sessions.filter(s => s.status === 'completed');

  const payments = store.query('payment_records', p => p.date === today);
  const totalSales = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const cashSales = payments.filter(p => p.method === 'cash').reduce((s, p) => s + (p.amount || 0), 0);
  const cardSales = payments.filter(p => p.method === 'card').reduce((s, p) => s + (p.amount || 0), 0);
  const otherSales = payments.filter(p => p.method === 'other').reduce((s, p) => s + (p.amount || 0), 0);

  const totalGuests = sessions.reduce((s, se) => s + (se.guestCount || 0), 0);

  const todayOrders = store.query('order_items', oi => oi.date === today && !oi.cancelled);
  const totalOrders = todayOrders.length;
  const castDrinkCount = todayOrders.filter(oi => oi.category === 'cast_drink').reduce((s, d) => s + d.quantity, 0);
  const champagneCount = todayOrders.filter(oi => oi.category === 'champagne').reduce((s, d) => s + d.quantity, 0);
  const wineCount = todayOrders.filter(oi => oi.category === 'wine').reduce((s, d) => s + d.quantity, 0);

  const nominations = store.query('nominations', n => n.date === today);
  const honshimeiCount = nominations.filter(n => n.type === 'honshimei').length;
  const douhanCount = nominations.filter(n => n.type === 'douhan').length;

  const allSets = store.query('session_sets', s => {
    const session = store.getById('table_sessions', s.sessionId);
    return session && session.date === today;
  });
  const extensionCount = allSets.filter(s => s.setNumber > 1).length;

  content.innerHTML = `
    ${activeSessions.length > 0 ? `
    <div style="background:var(--status-warning);border:1px solid var(--status-warning-border);border-radius:var(--radius-lg);padding:var(--space-lg) var(--space-xl);margin-bottom:var(--space-xl);display:flex;align-items:center;gap:var(--space-md);">
      <i data-lucide="alert-triangle" style="width:20px;height:20px;color:var(--warning);flex-shrink:0;"></i>
      <span style="color:var(--warning);font-weight:600;">未会計の卓が${activeSessions.length}件あります。締め作業前にすべての卓を会計してください。</span>
    </div>
    ` : ''}

    ${existingClosing ? `
    <div style="background:var(--status-completed);border:1px solid var(--status-completed-border);border-radius:var(--radius-lg);padding:var(--space-lg) var(--space-xl);margin-bottom:var(--space-xl);display:flex;align-items:center;gap:var(--space-md);">
      <i data-lucide="check-circle" style="width:20px;height:20px;color:var(--success);flex-shrink:0;"></i>
      <span style="color:var(--success);font-weight:600;">本日の締め作業は完了しています</span>
    </div>
    ` : ''}

    <!-- KPI Grid -->
    <div class="stats-grid" style="grid-template-columns:repeat(5,1fr);">
      <div class="stat-card stat-highlight">
        <div class="stat-label">売上合計</div>
        <div class="stat-value">${formatMoney(totalSales)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">現金</div>
        <div class="stat-value">${formatMoney(cashSales)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">カード</div>
        <div class="stat-value">${formatMoney(cardSales)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">その他</div>
        <div class="stat-value">${formatMoney(otherSales)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">来店組数</div>
        <div class="stat-value">${sessions.length}<span style="font-size:var(--text-sm);color:var(--text-secondary);">組</span></div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-xl);">
      <!-- Detail Numbers -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="bar-chart-3" style="width:18px;height:18px;color:var(--gold)"></i> 詳細数値</h3>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md);">
          ${[
            ['来店人数', totalGuests + '名'],
            ['会計済み', completedSessions.length + '組'],
            ['未会計', activeSessions.length + '組'],
            ['注文総数', totalOrders + '件'],
            ['セット数', allSets.length + '回'],
            ['延長数', extensionCount + '回'],
            ['キャストドリンク', castDrinkCount + '杯'],
            ['シャンパン', champagneCount + '本'],
            ['ワイン', wineCount + '本'],
            ['本指名', honshimeiCount + '件'],
            ['同伴', douhanCount + '件'],
          ].map(([label, value]) => `
            <div style="display:flex;justify-content:space-between;padding:var(--space-md);background:var(--bg-elevated);border-radius:var(--radius-md);">
              <span style="font-size:var(--text-sm);color:var(--text-secondary);">${label}</span>
              <strong style="font-family:var(--font-mono);">${value}</strong>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Payment Breakdown -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="credit-card" style="width:18px;height:18px;color:var(--cyan)"></i> 決済別内訳</h3>
        </div>
        ${payments.length > 0 ? `
        <table class="data-table">
          <thead>
            <tr><th>卓番号</th><th>人数</th><th>決済</th><th class="text-right">金額</th></tr>
          </thead>
          <tbody>
            ${payments.map(p => {
              const table = store.getById('tables', p.tableId);
              const methodLabel = { cash: '現金', card: 'カード', other: 'その他' }[p.method];
              const methodColor = p.method === 'cash' ? 'var(--success)' : p.method === 'card' ? 'var(--cyan)' : 'var(--text-secondary)';
              return `
                <tr>
                  <td><strong>${table?.number || '-'}番</strong></td>
                  <td>${p.guestCount || '-'}名</td>
                  <td><span style="color:${methodColor};font-weight:600;">${methodLabel}</span></td>
                  <td class="text-right money" style="font-weight:700;">${formatMoney(p.amount)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        ` : '<div class="empty-state"><p>本日の決済記録がありません</p></div>'}
      </div>
    </div>

    <!-- Close Button -->
    ${!existingClosing ? `
    <div style="margin-top:var(--space-2xl);text-align:center;">
      <button class="btn btn-danger btn-xl" id="close-day-btn" ${activeSessions.length > 0 ? 'disabled' : ''} style="min-width:300px;">
        <i data-lucide="lock"></i> 本日の締めを確定する
      </button>
      ${activeSessions.length > 0 ? '<p style="font-size:var(--text-sm);color:var(--text-tertiary);margin-top:var(--space-sm);">未会計卓がある間は締め作業を実行できません</p>' : ''}
    </div>
    ` : ''}
  `;

  if (window.lucide) lucide.createIcons();

  document.getElementById('close-day-btn')?.addEventListener('click', async () => {
    const confirmed = await showConfirm({
      title: '日次締め確定',
      message: '本日の営業を締めますか？',
      subMessage: `売上合計: ${formatMoney(totalSales)} | ${sessions.length}組 ${totalGuests}名`,
      type: 'danger',
      confirmText: '締め確定'
    });

    if (confirmed) {
      store.add('daily_closings', {
        date: today,
        totalSales,
        cashSales,
        cardSales,
        otherSales,
        sessionCount: sessions.length,
        guestCount: totalGuests,
        completedCount: completedSessions.length,
        orderCount: totalOrders,
        setCount: allSets.length,
        extensionCount,
        castDrinkCount,
        champagneCount,
        wineCount,
        honshimeiCount,
        douhanCount,
        confirmedAt: now(),
        confirmedBy: store.getCurrentUserId()
      });

      store.addAuditLog('daily_close', { date: today, totalSales });
      showToast('本日の締め作業が完了しました', 'success');
      renderClosing();
    }
  });
}
