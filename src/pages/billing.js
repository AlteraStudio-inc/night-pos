// ============================================
// Billing Page - 会計画面
// ============================================
import { renderLayout, setPageTitle } from '../components/layout.js';
import { store } from '../store/index.js';
import { router } from '../router.js';
import { formatMoney, todayKey, now } from '../utils/format.js';
import { calcBillingSummary } from '../utils/calc.js';
import { showConfirm } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export function renderBilling(params) {
  const tableId = params.tableId;
  const sessionId = params.sessionId;

  const table = store.getById('tables', tableId);
  const session = store.getById('table_sessions', sessionId);
  if (!table || !session) { router.navigate('/tables'); return; }

  renderLayout('', 'tables');
  setPageTitle(`会計 - ${table.number}番卓`);

  const settings = store.getSettings();
  const sets = store.query('session_sets', s => s.sessionId === sessionId);
  const orderItems = store.query('order_items', oi => oi.sessionId === sessionId && !oi.cancelled);
  const summary = calcBillingSummary(session, sets, orderItems, settings);

  let selectedPayment = '';

  const content = document.getElementById('page-content');

  function render() {
    content.innerHTML = `
      <div style="margin-bottom:var(--space-lg);">
        <button class="btn btn-ghost" onclick="location.hash='#/tables/${tableId}'">
          <i data-lucide="arrow-left"></i> ${table.number}番卓へ戻る
        </button>
      </div>

      <div class="detail-layout" style="grid-template-columns:1fr 420px;">
        <!-- Detail Side -->
        <div class="detail-main">
          <div class="card mb-xl">
            <div class="card-header">
              <h3 class="card-title"><i data-lucide="receipt" style="width:18px;height:18px;color:var(--gold)"></i> 会計明細</h3>
            </div>

            <!-- Items list -->
            ${orderItems.length > 0 ? `
            <table class="data-table">
              <thead>
                <tr><th>商品名</th><th class="text-center">数量</th><th class="text-right">単価</th><th class="text-right">小計</th><th class="text-right">税率</th></tr>
              </thead>
              <tbody>
                ${orderItems.map(item => `
                  <tr>
                    <td>
                      ${item.menuName}
                      ${item.castName ? `<span style="color:var(--gold);font-size:var(--text-xs);">(${item.castName})</span>` : ''}
                    </td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-right money">${formatMoney(item.price)}</td>
                    <td class="text-right money">${formatMoney(item.price * item.quantity)}</td>
                    <td class="text-right" style="color:var(--text-tertiary);font-size:var(--text-xs);">${(item.taxRate * 100).toFixed(0)}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ` : '<div class="empty-state"><p>注文がありません</p></div>'}
          </div>

          <!-- Payment Method -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title"><i data-lucide="credit-card" style="width:18px;height:18px;color:var(--cyan)"></i> 決済方法</h3>
            </div>
            <div class="payment-grid">
              <button class="payment-btn ${selectedPayment === 'cash' ? 'selected' : ''}" data-method="cash">
                <i data-lucide="banknote"></i>
                現金
              </button>
              <button class="payment-btn ${selectedPayment === 'card' ? 'selected' : ''}" data-method="card">
                <i data-lucide="credit-card"></i>
                カード
              </button>
              <button class="payment-btn ${selectedPayment === 'other' ? 'selected' : ''}" data-method="other">
                <i data-lucide="smartphone"></i>
                その他
              </button>
            </div>
          </div>
        </div>

        <!-- Billing Summary -->
        <div class="detail-side">
          <div class="billing-summary" style="position:sticky;top:0;">
            <div style="padding:var(--space-lg) var(--space-xl);background:rgba(200,169,96,0.05);border-bottom:1px solid var(--border-subtle);">
              <div style="font-size:var(--text-sm);font-weight:700;color:var(--text-secondary);">${table.number}番卓 会計</div>
              <div style="font-size:var(--text-xs);color:var(--text-tertiary);margin-top:4px;">${session.guestCount}名 | ${session.setType === 'first' ? '初回' : '通常'} | セット${sets.length}回</div>
            </div>
            
            <div class="billing-row">
              <span class="billing-label">セット料金</span>
              <span class="billing-value">${formatMoney(summary.setCharges)}</span>
            </div>
            ${summary.extensionCharges > 0 ? `
            <div class="billing-row">
              <span class="billing-label">延長料金 (${summary.extensionCount}回)</span>
              <span class="billing-value">${formatMoney(summary.extensionCharges)}</span>
            </div>` : ''}
            ${summary.menuTotal > 0 ? `
            <div class="billing-row">
              <span class="billing-label">メニュー注文</span>
              <span class="billing-value">${formatMoney(summary.menuTotal)}</span>
            </div>` : ''}
            ${summary.castDrinkTotal > 0 ? `
            <div class="billing-row">
              <span class="billing-label">キャストドリンク (${summary.castDrinkCount}杯)</span>
              <span class="billing-value">${formatMoney(summary.castDrinkTotal)}</span>
            </div>` : ''}
            ${summary.champagneTotal > 0 ? `
            <div class="billing-row">
              <span class="billing-label">シャンパン (${summary.champagneCount}本)</span>
              <span class="billing-value">${formatMoney(summary.champagneTotal)}</span>
            </div>` : ''}
            ${summary.wineTotal > 0 ? `
            <div class="billing-row">
              <span class="billing-label">ワイン (${summary.wineCount}本)</span>
              <span class="billing-value">${formatMoney(summary.wineTotal)}</span>
            </div>` : ''}
            
            <div style="border-top:1px solid var(--border-default);"></div>
            
            <div class="billing-row">
              <span class="billing-label">小計</span>
              <span class="billing-value">${formatMoney(summary.subtotal)}</span>
            </div>
            <div class="billing-row">
              <span class="billing-label">TAX</span>
              <span class="billing-value">${formatMoney(summary.taxTotal)}</span>
            </div>
            <div class="billing-row">
              <span class="billing-label">サービス料</span>
              <span class="billing-value">${formatMoney(summary.serviceTotal)}</span>
            </div>
            
            <div class="billing-row billing-total">
              <span class="billing-label">総合計</span>
              <span class="billing-value">${formatMoney(summary.grandTotal)}</span>
            </div>

            <div style="padding:var(--space-xl);">
              <button class="btn btn-primary btn-xl w-full" id="confirm-billing" ${!selectedPayment ? 'disabled' : ''}>
                <i data-lucide="check-circle"></i> 会計確定
              </button>
              ${!selectedPayment ? '<p style="text-align:center;font-size:var(--text-xs);color:var(--text-tertiary);margin-top:var(--space-sm);">決済方法を選択してください</p>' : ''}
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    // Payment method selection
    content.querySelectorAll('.payment-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedPayment = btn.dataset.method;
        render();
      });
    });

    // Confirm billing
    content.querySelector('#confirm-billing')?.addEventListener('click', async () => {
      if (!selectedPayment) return;

      const methodLabels = { cash: '現金', card: 'カード', other: 'その他' };
      const confirmed = await showConfirm({
        title: '会計確定',
        message: `${table.number}番卓の会計を確定しますか？`,
        subMessage: `総合計: ${formatMoney(summary.grandTotal)} / 決済: ${methodLabels[selectedPayment]}`,
        type: 'warning',
        confirmText: '会計確定'
      });

      if (confirmed) {
        // Record payment
        store.add('payment_records', {
          sessionId,
          tableId,
          amount: summary.grandTotal,
          method: selectedPayment,
          date: todayKey(),
          summary: { ...summary },
          guestCount: session.guestCount,
          confirmedAt: now()
        });

        // Update session status
        store.update('table_sessions', sessionId, { 
          status: 'completed', 
          completedAt: now(),
          paymentMethod: selectedPayment,
          totalAmount: summary.grandTotal
        });

        // End current set
        const currentSet = sets[sets.length - 1];
        if (currentSet) {
          store.update('session_sets', currentSet.id, { endTime: now(), active: false });
        }

        // Reset table status
        store.update('tables', tableId, { status: 'vacant' });

        store.addAuditLog('billing_complete', {
          tableId, sessionId,
          amount: summary.grandTotal,
          method: selectedPayment,
          summary
        });

        showToast(`${table.number}番卓の会計が完了しました (${formatMoney(summary.grandTotal)})`, 'success');
        router.navigate('/tables');
      }
    });
  }

  render();
}
