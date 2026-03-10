// ============================================
// Closing Page - 締め作業画面
// ============================================
import { renderLayout, setPageTitle } from '../components/layout.js';
import { store } from '../store/index.js';
import { formatMoney, formatNumber, todayKey, now } from '../utils/format.js';
import { showConfirm } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let cashOnHand = '';

export function renderClosing() {
  renderLayout('', 'closing');
  setPageTitle('締め作業 - レジクローズ');

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
  const averageSpend = totalGuests > 0 ? Math.round(totalSales / totalGuests) : 0;

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

  // Fake static data for layout similarity (normally from state/settings)
  const taxTotal = Math.round(totalSales * 0.1); 
  const netSales = totalSales - taxTotal;
  const openingCash = 40000; // Simulated
  const expectedCash = openingCash + cashSales;

  function render() {
    const inputCash = parseInt(cashOnHand || '0', 10);
    const difference = inputCash - expectedCash;

    content.innerHTML = `
      ${existingClosing ? `
      <div style="background:var(--status-completed);border:1px solid var(--status-completed-border);border-radius:var(--radius-lg);padding:var(--space-lg) var(--space-xl);margin-bottom:var(--space-xl);display:flex;align-items:center;gap:var(--space-md);">
        <i data-lucide="check-circle" style="width:20px;height:20px;color:var(--success);flex-shrink:0;"></i>
        <span style="color:var(--success);font-weight:600;">本日の締め作業は完了しています</span>
      </div>
      ` : ''}

      <div class="pos-layout-closing">
        
        <!-- Left: Settlement Report -->
        <div class="pos-col">
          <div class="pos-col-header" style="background:var(--cyan);color:#fff;border-color:var(--cyan);">
            <span><i data-lucide="bar-chart-2" style="width:16px;height:16px;vertical-align:middle;"></i> 精算レポート</span>
          </div>
          <div class="pos-col-body" style="padding:0;">
            <ul class="billing-item-list">
              <li class="billing-item-row"><div class="billing-item-name">組数</div><div class="billing-item-price">${completedSessions.length}組</div></li>
              <li class="billing-item-row"><div class="billing-item-name">客数</div><div class="billing-item-price">${totalGuests}名</div></li>
              <li class="billing-item-row"><div class="billing-item-name">客単価</div><div class="billing-item-price">${formatMoney(averageSpend)}</div></li>
              <li class="billing-item-row"><div class="billing-item-name">総売上点数</div><div class="billing-item-price">${totalOrders}点</div></li>
              <li class="billing-item-row"><div class="billing-item-name" style="font-weight:800;color:var(--gold);">売上合計</div><div class="billing-item-price" style="font-weight:800;color:var(--gold);">${formatMoney(totalSales)}</div></li>
              <li class="billing-item-row"><div class="billing-item-name text-muted">消費税</div><div class="billing-item-price text-muted">${formatMoney(taxTotal)}</div></li>
              <li class="billing-item-row"><div class="billing-item-name text-muted">純売上</div><div class="billing-item-price text-muted">${formatMoney(netSales)}</div></li>
              <li class="billing-item-row"><div class="billing-item-name text-muted">セット数</div><div class="billing-item-price text-muted">${allSets.length}回</div></li>
              <li class="billing-item-row"><div class="billing-item-name text-muted">延長数</div><div class="billing-item-price text-muted">${extensionCount}回</div></li>
              <li class="billing-item-row"><div class="billing-item-name text-muted">キャストドリンク</div><div class="billing-item-price text-muted">${castDrinkCount}杯</div></li>
              <li class="billing-item-row"><div class="billing-item-name text-muted">シャンパン・ワイン</div><div class="billing-item-price text-muted">${champagneCount + wineCount}本</div></li>
              <li class="billing-item-row"><div class="billing-item-name text-muted">本指名・同伴</div><div class="billing-item-price text-muted">${honshimeiCount + douhanCount}件</div></li>
            </ul>
          </div>
        </div>

        <!-- Center: Cash Flow History -->
        <div class="pos-col">
          <div class="pos-col-header" style="background:var(--cyan);color:#fff;border-color:var(--cyan);">
            <span><i data-lucide="arrow-left-right" style="width:16px;height:16px;vertical-align:middle;"></i> 入出金履歴</span>
          </div>
          <div class="pos-col-body" style="padding:0;">
            <ul class="billing-item-list">
              <li class="billing-item-row">
                <div class="billing-item-name">レジオープン時現金</div>
                <div class="billing-item-qty">1件</div>
                <div class="billing-item-price">${formatMoney(openingCash)}</div>
              </li>
              <li class="billing-item-row">
                <div class="billing-item-name">現金売上</div>
                <div class="billing-item-qty">${payments.filter(p=>p.method==='cash').length}件</div>
                <div class="billing-item-price">${formatMoney(cashSales)}</div>
              </li>
              <div style="padding:var(--space-md);background:var(--bg-elevated);border-bottom:1px solid var(--border-subtle);font-weight:700;display:flex;justify-content:space-between;">
                <span>現金在高（理論値）</span>
                <span style="font-family:var(--font-mono);">${formatMoney(expectedCash)}</span>
              </div>
              <li class="billing-item-row" style="margin-top:var(--space-sm);">
                <div class="billing-item-name">クレジット売上</div>
                <div class="billing-item-qty">${payments.filter(p=>p.method==='card').length}件</div>
                <div class="billing-item-price">${formatMoney(cardSales)}</div>
              </li>
              <li class="billing-item-row">
                <div class="billing-item-name">その他売上</div>
                <div class="billing-item-qty">${payments.filter(p=>p.method==='other').length}件</div>
                <div class="billing-item-price">${formatMoney(otherSales)}</div>
              </li>
            </ul>
          </div>
        </div>

        <!-- Right: Register Output / Input -->
        <div class="pos-col">
          <div class="pos-col-header" style="background:var(--cyan);color:#fff;border-color:var(--cyan);">
            <span>レジクローズ時レジ実績入力</span>
            <span style="font-family:var(--font-mono);">POS: 001</span>
          </div>
          <div class="pos-col-body" style="display:flex;flex-direction:column;gap:var(--space-md);">
            
            <div style="display:flex;justify-content:flex-end;font-size:var(--text-xs);color:var(--text-tertiary);">差異</div>
            
            <!-- Cash Input -->
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span style="font-size:var(--text-sm);font-weight:600;">現金在高</span>
              <div style="display:flex;align-items:center;gap:var(--space-md);">
                <div style="width:140px;height:40px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-md);display:flex;align-items:center;padding:0 var(--space-md);justify-content:flex-end;font-family:var(--font-mono);font-size:var(--text-base);font-weight:700;">
                  ${formatMoney(inputCash)}
                </div>
                <span class="${difference < 0 ? 'text-danger' : difference > 0 ? 'text-success' : 'text-muted'}" style="width:60px;text-align:right;font-family:var(--font-mono);font-weight:700;font-size:var(--text-sm);">
                  ${difference > 0 ? '+' : ''}${formatMoney(difference)}
                </span>
              </div>
            </div>
            
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-lg);">
              <span style="font-size:var(--text-xs);color:var(--text-tertiary);">内 レジオープン時現金:</span>
              <span style="font-family:var(--font-mono);font-size:var(--text-sm);color:var(--text-secondary);width:140px;text-align:right;margin-right:76px;">${formatMoney(openingCash)}</span>
            </div>

            <!-- Numpad -->
            <div class="numpad">
              <button class="numpad-btn secondary" style="grid-column:span 3;height:40px;font-size:var(--text-sm);" id="copy-expected">理論値を入力</button>
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

            <div style="flex:1;display:flex;align-items:center;justify-content:center;text-align:center;">
              ${activeSessions.length > 0 ? `
                <div style="color:var(--warning);">
                  <i data-lucide="alert-triangle" style="width:48px;height:48px;margin-bottom:var(--space-sm);opacity:0.8;"></i>
                  <h3 style="font-size:var(--text-lg);font-weight:700;margin-bottom:var(--space-xs);">未会計の伝票があります。</h3>
                  <p style="font-size:var(--text-sm);opacity:0.8;">会計後にレジクローズしてください。</p>
                </div>
              ` : `
                <div style="color:var(--text-tertiary);">
                  <i data-lucide="check-circle" style="width:48px;height:48px;margin-bottom:var(--space-sm);opacity:0.3;"></i>
                  <p style="font-size:var(--text-sm);">すべての会計が完了しています。<br>在高を入力して確定してください。</p>
                </div>
              `}
            </div>

          </div>
          <div class="pos-col-footer">
            <button class="btn btn-accent btn-xl w-full" id="close-day-btn" ${activeSessions.length > 0 || existingClosing ? 'disabled' : ''} style="min-height:64px;font-size:var(--text-xl);">
              確定
            </button>
          </div>
        </div>

      </div>
    `;

    if (window.lucide) lucide.createIcons();
    attachEvents();
  }

  function attachEvents() {
    // Numpad events
    content.querySelectorAll('.numpad-btn.num').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.val;
        if (cashOnHand === '0' || !cashOnHand) cashOnHand = val;
        else cashOnHand += val;
        if (cashOnHand.length > 8) cashOnHand = cashOnHand.slice(0, 8);
        render();
      });
    });

    content.querySelector('.numpad-btn.clear')?.addEventListener('click', () => {
      cashOnHand = '';
      render();
    });

    content.querySelector('#copy-expected')?.addEventListener('click', () => {
      cashOnHand = expectedCash.toString();
      render();
    });

    const closeBtn = document.getElementById('close-day-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', async () => {
        const confirmed = await showConfirm({
          title: '日次締め確定',
          message: '本日の営業を締め、レジをクローズしますか？',
          subMessage: `売上合計: ${formatMoney(totalSales)} | 現金在高: ${formatMoney(parseInt(cashOnHand||0))}`,
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
            expectedCash,
            actualCash: parseInt(cashOnHand||0),
            cashDifference: parseInt(cashOnHand||0) - expectedCash,
            confirmedAt: now(),
            confirmedBy: store.getCurrentUserId()
          });

          store.addAuditLog('daily_close', { date: today, totalSales });
          showToast('レジクローズ作業が完了しました', 'success');
          renderClosing();
        }
      });
    }
  }

  render();
}
