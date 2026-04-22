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
import { generateReceiptPDF } from '../utils/receipt-pdf.js';

let selectedPayment = 'cash';
let receivedAmount = '';

export function renderBilling(params) {
  const tableId = params.tableId;
  const sessionId = params.sessionId;

  const table = store.getById('tables', tableId);
  const session = store.getById('table_sessions', sessionId);
  if (!table || !session) { router.navigate('/tables'); return; }

  renderLayout('', 'tables');
  setPageTitle(`会計 - ${table.number}番卓`);

  const content = document.getElementById('page-content');
  
  // Initialize state
  selectedPayment = 'cash';
  receivedAmount = '';

  function render() {
    const settings = store.getSettings();
    const sets = store.query('session_sets', s => s.sessionId === sessionId);
    const orderItems = store.query('order_items', oi => oi.sessionId === sessionId && !oi.cancelled);
    const summary = calcBillingSummary(session, sets, orderItems, settings);
    const displayTaxRate = sets[0]?.taxRate || settings.defaultTaxRate || 0;
    const displayServiceRate = sets[0]?.serviceRate || settings.defaultServiceRate || 0;

    // Calculate change
    const cashReceived = parseInt(receivedAmount || '0', 10);
    const change = cashReceived >= summary.grandTotal ? cashReceived - summary.grandTotal : 0;
    const missing = cashReceived < summary.grandTotal ? summary.grandTotal - cashReceived : 0;

    content.innerHTML = `
      <div style="margin-bottom:var(--space-md);display:flex;align-items:center;justify-content:space-between;">
        <button class="btn btn-ghost" onclick="location.hash='#/tables/${tableId}'">
          <i data-lucide="arrow-left"></i> ${table.number}番卓へ戻る
        </button>
      </div>

      <div class="pos-layout">
        
        <!-- Left Column: Item List (Cart) -->
        <div class="pos-col">
          <div class="pos-col-header">
            <span>担当者: 店長</span>
            <span style="color:var(--gold);"><i data-lucide="receipt"></i> 明細</span>
          </div>
          <div class="pos-col-body" style="padding:0;">
            <ul class="billing-item-list">
              <!-- Set Charge -->
              <li class="billing-item-row">
                <div class="billing-item-name">セット料金</div>
                <div class="billing-item-qty">1</div>
                <div class="billing-item-price">${formatMoney(summary.setCharges)}</div>
              </li>
              ${summary.douhanFeeTotal > 0 ? `
              <li class="billing-item-row">
                <div class="billing-item-name">同伴料金</div>
                <div class="billing-item-qty">1</div>
                <div class="billing-item-price">${formatMoney(summary.douhanFeeTotal)}</div>
              </li>` : ''}
              ${summary.extensionCharges > 0 ? `
              <li class="billing-item-row">
                <div class="billing-item-name">延長料金</div>
                <div class="billing-item-qty">${summary.extensionCount}</div>
                <div class="billing-item-price">${formatMoney(summary.extensionCharges)}</div>
              </li>` : ''}

              <!-- Order Items -->
              ${orderItems.map(item => `
              <li class="billing-item-row">
                <div class="billing-item-name" style="display:flex;flex-direction:column;">
                  <span>${item.menuName}</span>
                  ${item.castName ? `<span style="font-size:var(--text-xs);color:var(--text-tertiary);">${item.castName}</span>` : ''}
                </div>
                <div class="billing-item-qty">${item.quantity}</div>
                <div class="billing-item-price">${formatMoney(item.price * item.quantity)}</div>
              </li>
              `).join('')}
            </ul>
          </div>
          <div class="pos-col-footer">
          </div>
        </div>

        <!-- Center Column: Summary & Payment -->
        <div class="pos-col">
          <div class="pos-col-header">
            <span>計算書</span>
            <span></span>
          </div>
          <div class="pos-col-body">
            
            <div class="billing-calc-row">
              <span>小計</span>
              <strong>${formatMoney(summary.subtotal)}</strong>
            </div>
            <div class="billing-calc-row">
              <span style="color:var(--text-tertiary);">サービス料金 (${(displayServiceRate * 100).toFixed(0)}%)</span>
              <span style="color:var(--text-tertiary);">${formatMoney(summary.serviceTotal)}</span>
            </div>
            <div class="billing-calc-row">
              <span style="color:var(--text-tertiary);">消費税 (${(displayTaxRate * 100).toFixed(0)}%)</span>
              <span style="color:var(--text-tertiary);">${formatMoney(summary.taxTotal)}</span>
            </div>

            <div style="margin:var(--space-md) 0;border-bottom:1px solid var(--border-subtle);"></div>

            <div class="billing-calc-total">
              <div style="display:flex;justify-content:space-between;align-items:flex-end;">
                <span style="font-size:var(--text-sm);font-weight:700;color:var(--text-secondary);">お支払い金額</span>
                <span style="font-size:var(--text-3xl);font-family:var(--font-mono);font-weight:800;color:var(--gold);line-height:1;">${formatMoney(summary.grandTotal)}</span>
              </div>
            </div>

            <div style="font-size:var(--text-xs);color:var(--text-tertiary);margin-bottom:var(--space-xs);font-weight:700;">支払</div>
            <div style="background:var(--bg-elevated);border-radius:var(--radius-md);padding:var(--space-xl) var(--space-md);text-align:center;color:var(--text-secondary);font-size:var(--text-sm);">
              ${selectedPayment === 'cash' ? '現金払いが選択されています' : selectedPayment === 'card' ? 'カード払いが選択されています' : 'その他決済が選択されています'}
            </div>

          </div>
          <div class="pos-col-footer">
            <div class="billing-calc-row" style="padding:var(--space-xs) 0;">
              <span style="color:var(--cyan);">お預かり金額</span>
              <strong style="color:var(--cyan);font-size:var(--text-xl);">${selectedPayment === 'cash' ? formatMoney(cashReceived) : formatMoney(summary.grandTotal)}</strong>
            </div>
            ${selectedPayment === 'cash' && missing > 0 ? `
            <div class="billing-calc-row" style="padding:var(--space-xs) 0;">
              <span style="color:var(--danger);">残額</span>
              <strong style="color:var(--danger);">${formatMoney(missing)}</strong>
            </div>` : ''}
            <div class="billing-calc-row" style="padding:var(--space-xs) 0;border-top:1px dashed var(--border-subtle);margin-top:var(--space-xs);">
              <span>おつり</span>
              <strong style="font-size:var(--text-xl);">${selectedPayment === 'cash' ? formatMoney(change) : '¥0'}</strong>
            </div>
          </div>
        </div>

        <!-- Right Column: Numpad & Actions -->
        <div class="pos-col">
          <div class="pos-col-header">
            <span>顧客: 未登録</span>
            <span>人数: ${session.guestCount}人</span>
          </div>
          <div class="pos-col-body" style="display:flex;flex-direction:column;">
            
            <div class="payment-method-grid">
              <button class="payment-method-btn ${selectedPayment === 'cash' ? 'active' : ''}" data-method="cash">現金</button>
              <button class="payment-method-btn ${selectedPayment === 'card' ? 'active' : ''}" data-method="card">カード</button>
              <button class="payment-method-btn ${selectedPayment === 'other' ? 'active' : ''}" style="grid-column:span 2;" data-method="other">その他支払</button>
            </div>

            <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;">
              
              <!-- Display input area -->
              <div style="background:#000;border-radius:var(--radius-md);padding:var(--space-md) var(--space-lg);display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-sm);">
                <span style="color:#fff;font-size:var(--text-lg);font-weight:700;">¥</span>
                <span style="color:#fff;font-size:var(--text-2xl);font-family:var(--font-mono);font-weight:800;letter-spacing:1px;">${receivedAmount ? parseInt(receivedAmount, 10).toLocaleString() : '0'}</span>
              </div>

              <!-- Quick amount buttons -->
              <div class="numpad-control-row">
                <button class="numpad-btn secondary" style="flex:1;height:48px;font-size:var(--text-base);" data-val="1000">¥1,000</button>
                <button class="numpad-btn secondary" style="flex:1;height:48px;font-size:var(--text-base);" data-val="5000">¥5,000</button>
                <button class="numpad-btn secondary" style="flex:1;height:48px;font-size:var(--text-base);" data-val="10000">¥10,000</button>
              </div>

              <!-- Numpad -->
              <div class="numpad">
                <button class="numpad-btn num" data-val="7">7</button>
                <button class="numpad-btn num" data-val="8">8</button>
                <button class="numpad-btn num" data-val="9">9</button>
                <button class="numpad-btn num" data-val="4">4</button>
                <button class="numpad-btn num" data-val="5">5</button>
                <button class="numpad-btn num" data-val="6">6</button>
                <button class="numpad-btn num" data-val="1">1</button>
                <button class="numpad-btn num" data-val="2">2</button>
                <button class="numpad-btn num" data-val="3">3</button>
                <button class="numpad-btn num" data-val="0">0</button>
                <button class="numpad-btn num" data-val="00">00</button>
                <button class="numpad-btn clear" data-val="C">C</button>
              </div>

            </div>
          </div>
          
          <div class="pos-col-footer">
            <button class="btn btn-accent btn-xl w-full" id="confirm-billing" style="min-height:64px;font-size:var(--text-xl);">
              会計完了
            </button>
          </div>
        </div>

      </div>

      <!-- Card Auth Overlay -->
      <div id="card-auth-overlay" style="display:none;position:fixed;inset:0;background:rgba(8,8,13,0.85);backdrop-filter:blur(4px);z-index:9999;align-items:center;justify-content:center;flex-direction:column;">
        <div style="background:var(--bg-card);border:1px solid var(--border-default);border-radius:var(--radius-xl);padding:var(--space-3xl);text-align:center;width:400px;box-shadow:var(--shadow-xl);">
          <i data-lucide="credit-card" style="width:64px;height:64px;color:var(--cyan);margin-bottom:var(--space-lg);animation:pulse 1.5s infinite;"></i>
          <h3 style="font-size:var(--text-2xl);font-weight:700;margin-bottom:var(--space-md);">クレジットカードを<br>端末に通してください</h3>
          <p style="color:var(--text-tertiary);margin-bottom:var(--space-2xl);">認証中...</p>
          <button class="btn btn-secondary w-full" id="skip-card-auth">スキップして完了する</button>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    attachEvents(summary, cashReceived);
  }

  function attachEvents(summary, cashReceived) {
    // Payment method selection
    content.querySelectorAll('.payment-method-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedPayment = btn.dataset.method;
        // Reset input on switch
        if (selectedPayment !== 'cash') receivedAmount = summary.grandTotal.toString();
        else receivedAmount = '';
        render();
      });
    });

    // Numpad input
    content.querySelectorAll('.numpad-btn.num').forEach(btn => {
      btn.addEventListener('click', () => {
        if (selectedPayment !== 'cash') return; // Only allow numpad for cash
        const val = btn.dataset.val;
        if (receivedAmount === '0') receivedAmount = val;
        else receivedAmount += val;
        
        // Prevent extremely long numbers
        if (receivedAmount.length > 8) receivedAmount = receivedAmount.slice(0, 8);
        render();
      });
    });

    // Quick amount shortcut
    content.querySelectorAll('.numpad-btn.secondary').forEach(btn => {
      btn.addEventListener('click', () => {
        if (selectedPayment !== 'cash') return;
        const val = parseInt(btn.dataset.val, 10);
        let curr = receivedAmount ? parseInt(receivedAmount, 10) : 0;
        curr += val;
        receivedAmount = curr.toString();
        render();
      });
    });

    // Numpad Clear
    content.querySelector('.numpad-btn.clear')?.addEventListener('click', () => {
      if (selectedPayment !== 'cash') return;
      receivedAmount = '';
      render();
    });

    // Confirm billing
    content.querySelector('#confirm-billing')?.addEventListener('click', async () => {
      if (selectedPayment === 'cash' && cashReceived < summary.grandTotal) {
        showToast('お預かり金額が不足しています', 'error');
        return;
      }

      const methodLabels = { cash: '現金', card: 'カード', other: 'その他' };
      const confirmed = await showConfirm({
        title: '会計完了',
        message: `${table.number}番卓の会計を完了しますか？`,
        subMessage: `総合計: ${formatMoney(summary.grandTotal)} / 決済: ${methodLabels[selectedPayment]}`,
        type: 'warning',
        confirmText: '会計へ進む'
      });

      if (confirmed) {
        if (selectedPayment === 'card') {
          // Show auth overlay
          const authOverlay = document.getElementById('card-auth-overlay');
          const skipBtn = document.getElementById('skip-card-auth');
          if (authOverlay && skipBtn) {
            authOverlay.style.display = 'flex';
            if (window.lucide) lucide.createIcons();
            
            skipBtn.onclick = () => {
              authOverlay.style.display = 'none';
              processBilling(selectedPayment);
            };
          }
        } else {
          processBilling(selectedPayment);
        }
      }
    });

    async function processBilling(paymentMethod) {
      const sets = store.query('session_sets', s => s.sessionId === sessionId);
      const orderItems = store.query('order_items', oi => oi.sessionId === sessionId && !oi.cancelled);
      const billingSettings = store.getSettings();
      const billingNominations = store.query('nominations', n => n.sessionId === sessionId);

      // Record payment
      store.add('payment_records', {
        sessionId,
        tableId,
        amount: summary.grandTotal,
        method: paymentMethod,
        date: todayKey(),
        summary: { ...summary },
        guestCount: session.guestCount,
        confirmedAt: now()
      });

      // Update session status
      store.update('table_sessions', sessionId, {
        status: 'completed',
        completedAt: now(),
        paymentMethod: paymentMethod,
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
        method: paymentMethod,
        summary
      });

      showToast(`${table.number}番卓の会計が完了しました (${formatMoney(summary.grandTotal)})`, 'success');

      // 領収書発行確認ダイアログ
      const issueReceipt = await showConfirm({
        title: '領収書の発行',
        message: '領収書を発行しますか？',
        subMessage: `${table.number}番卓 / ${formatMoney(summary.grandTotal)}`,
        confirmText: '発行する',
        cancelText: '発行しない'
      });

      if (issueReceipt) {
        generateReceiptPDF({
          table,
          session,
          sets,
          orderItems,
          nominations: billingNominations,
          summary,
          settings: billingSettings,
          paymentMethod
        });
      }

      router.navigate('/tables');
    }
  }

  render();
}
