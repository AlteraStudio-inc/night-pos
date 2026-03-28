// ============================================
// Table Detail Page - 卓詳細画面
// ============================================
import { renderLayout, setPageTitle } from '../components/layout.js';
import { store } from '../store/index.js';
import { router } from '../router.js';
import { formatMoney, formatTime, formatDuration, todayKey, now } from '../utils/format.js';
import { calcBillingSummary } from '../utils/calc.js';
import { showModal, closeModal, showConfirm } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let refreshInterval = null;

export function renderTableDetail(params) {
  if (refreshInterval) clearInterval(refreshInterval);

  const tableId = params.id;
  const table = store.getById('tables', tableId);
  if (!table) { router.navigate('/tables'); return; }

  renderLayout('', 'tables');
  setPageTitle(`${table.number}番卓`);

  const content = document.getElementById('page-content');
  renderDetailContent(content, tableId);

  refreshInterval = setInterval(() => renderDetailContent(content, tableId), 15000);
}

function renderDetailContent(container, tableId) {
  const table = store.getById('tables', tableId);
  const settings = store.getSettings();
  
  // Find active session
  const session = store.query('table_sessions', s =>
    s.tableId === tableId && (s.status === 'active' || s.status === 'extended' || s.status === 'billing')
  )[0];

  if (!session) {
    container.innerHTML = `
      <div class="empty-state">
        <i data-lucide="armchair"></i>
        <p>${table.number}番卓は現在空席です</p>
        <button class="btn btn-primary btn-lg mt-xl" onclick="location.hash='#/tables'">
          <i data-lucide="arrow-left"></i> 卓一覧へ戻る
        </button>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  const sets = store.query('session_sets', s => s.sessionId === session.id).sort((a, b) => a.setNumber - b.setNumber);
  const orderItems = store.query('order_items', oi => oi.sessionId === session.id);
  const activeItems = orderItems.filter(oi => !oi.cancelled);
  const nominations = store.query('nominations', n => n.sessionId === session.id);
  const summary = calcBillingSummary(session, sets, activeItems, settings);

  const elapsed = Math.floor((Date.now() - new Date(session.entryTime).getTime()) / 60000);
  const currentSet = sets[sets.length - 1];
  // セッション固有のセット時間を使用（延長時はextensionDuration）
  const currentSetDuration = currentSet?.setDuration || currentSet?.extensionDuration || session.setDuration || settings.setDuration || 60;
  const setElapsed = currentSet ? Math.floor((Date.now() - new Date(currentSet.startTime).getTime()) / 60000) : 0;
  const remaining = currentSetDuration - setElapsed;

  const statusLabel = {
    'active': '入店中', 'extended': '延長中', 'billing': '会計待ち', 'completed': '会計済み'
  }[session.status];

  const honshimeiCast = nominations.find(n => n.type === 'honshimei');
  const honshimeiCastName = honshimeiCast ? store.getById('casts', honshimeiCast.castId)?.name : null;

  container.innerHTML = `
    <div style="margin-bottom:var(--space-lg);">
      <button class="btn btn-ghost" onclick="location.hash='#/tables'">
        <i data-lucide="arrow-left"></i> 卓一覧へ戻る
      </button>
    </div>

    <div class="detail-layout">
      <div class="detail-main">
        <!-- Table Status Header -->
        <div class="card mb-xl">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--space-lg);">
            <div>
              <div style="display:flex;align-items:center;gap:var(--space-md);margin-bottom:var(--space-sm);">
                <span style="font-size:var(--text-3xl);font-weight:800;">${table.number}番卓</span>
                <span class="badge badge-${session.status === 'extended' ? 'extended' : session.status === 'billing' ? 'billing' : 'active'}">${statusLabel}</span>
                ${session.isDouhan ? '<span class="badge badge-gold">同伴</span>' : ''}
              </div>
              <div style="display:flex;gap:var(--space-xl);font-size:var(--text-sm);color:var(--text-secondary);">
                <span><strong>${session.guestCount}</strong>名</span>
                <span>入店 <strong>${formatTime(session.entryTime)}</strong></span>
                <span>経過 <strong style="font-family:var(--font-mono);color:${remaining <= 10 ? 'var(--danger)' : remaining <= 15 ? 'var(--warning)' : 'var(--text-primary)'}">${elapsed}分</strong></span>
                <span>セット <strong>${sets.length}</strong> (${session.setType === 'first' ? '初回' : '通常'})</span>
                ${honshimeiCastName ? `<span style="color:var(--gold-light);">★ 本指名: <strong>${honshimeiCastName}</strong></span>` : ''}
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:var(--space-md);font-family:var(--font-mono);">
              <div style="text-align:right;">
                <div style="font-size:var(--text-xs);color:var(--text-tertiary);">残り時間</div>
                <div style="font-size:var(--text-2xl);font-weight:800;color:${remaining <= 5 ? 'var(--danger)' : remaining <= 10 ? 'var(--warning)' : 'var(--cyan)'};">${remaining > 0 ? remaining + '分' : '超過'}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Set Info -->
        <div class="card mb-xl">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="clock" style="width:18px;height:18px;color:var(--gold)"></i> セット情報</h3>
          </div>
          <table class="data-table">
            <thead>
              <tr><th>セット</th><th>種別</th><th>開始</th><th>税率</th><th>サービス料</th><th>料金</th></tr>
            </thead>
            <tbody>
              ${sets.map((s, i) => `
                <tr>
                  <td><strong>${i + 1}セット目</strong></td>
                  <td>${i === 0 ? (session.setType === 'first' ? '初回' : '通常') : '延長'}</td>
                  <td style="font-family:var(--font-mono);">${formatTime(s.startTime)}</td>
                  <td>${(s.taxRate * 100).toFixed(0)}%</td>
                  <td>${(s.serviceRate * 100).toFixed(0)}%</td>
                  <td class="money">${formatMoney(i === 0 ? s.setPrice : (s.extensionPrice || settings.extensionPrice))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Order History -->
        <div class="card mb-xl">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="receipt" style="width:18px;height:18px;color:var(--cyan)"></i> 注文履歴</h3>
            <span style="font-size:var(--text-sm);color:var(--text-secondary);">${activeItems.length}件</span>
          </div>
          ${orderItems.length > 0 ? `
            <ul class="order-list">
              ${orderItems.sort((a, b) => new Date(b.orderTime) - new Date(a.orderTime)).map(item => `
                <li class="order-item ${item.cancelled ? 'cancelled' : ''}">
                  <span class="order-time">${formatTime(item.orderTime)}</span>
                  <span class="order-name">
                    ${item.menuName}
                    ${item.castName ? `<span style="color:var(--gold);font-size:var(--text-xs);margin-left:4px;">(${item.castName})</span>` : ''}
                    ${item.cancelled ? '<span class="badge badge-danger" style="margin-left:8px;">取消</span>' : ''}
                  </span>
                  <span class="order-qty">×${item.quantity}</span>
                  <span class="order-price">${formatMoney(item.price * item.quantity)}</span>
                  ${!item.cancelled ? `<button class="btn btn-ghost btn-icon cancel-order-btn" data-item-id="${item.id}" title="取消"><i data-lucide="x" style="width:14px;height:14px;"></i></button>` : ''}
                </li>
              `).join('')}
            </ul>
          ` : `
            <div class="empty-state" style="padding:var(--space-xl);">
              <p>注文はまだありません</p>
            </div>
          `}
        </div>
      </div>

      <!-- Sidebar: Billing + Actions -->
      <div class="detail-side">
        <!-- Billing Summary -->
        <div class="billing-summary mb-xl">
          <div style="padding:var(--space-lg) var(--space-xl);border-bottom:1px solid var(--border-subtle);">
            <div style="font-size:var(--text-sm);font-weight:700;color:var(--text-secondary);">会計サマリー</div>
          </div>
          <div class="billing-row">
            <span class="billing-label">セット料金</span>
            <span class="billing-value">${formatMoney(summary.setCharges)}</span>
          </div>
          ${summary.douhanFeeTotal > 0 ? `
          <div class="billing-row">
            <span class="billing-label">同伴料金</span>
            <span class="billing-value">${formatMoney(summary.douhanFeeTotal)}</span>
          </div>` : ''}
          ${summary.extensionCharges > 0 ? `
          <div class="billing-row">
            <span class="billing-label">延長料金</span>
            <span class="billing-value">${formatMoney(summary.extensionCharges)}</span>
          </div>` : ''}
          ${summary.menuTotal > 0 ? `
          <div class="billing-row">
            <span class="billing-label">メニュー</span>
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
          <div class="billing-row">
            <span class="billing-label">TAX</span>
            <span class="billing-value">${formatMoney(summary.taxTotal)}</span>
          </div>
          <div class="billing-row">
            <span class="billing-label">サービス料</span>
            <span class="billing-value">${formatMoney(summary.serviceTotal)}</span>
          </div>
          <div class="billing-row billing-total">
            <span class="billing-label">合計</span>
            <span class="billing-value">${formatMoney(summary.grandTotal)}</span>
          </div>
        </div>

        <!-- Tablet Order Link -->
        <div style="background:var(--bg-elevated);border:1px solid var(--border-default);border-radius:var(--radius-lg);padding:var(--space-lg);margin-bottom:var(--space-lg);">
          <div style="display:flex;align-items:center;gap:var(--space-md);margin-bottom:var(--space-md);">
            <i data-lucide="tablet-smartphone" style="width:18px;height:18px;color:var(--gold);"></i>
            <span style="font-size:var(--text-sm);font-weight:700;color:var(--text-secondary);">タブレット注文</span>
          </div>
          <p style="font-size:var(--text-xs);color:var(--text-tertiary);margin-bottom:var(--space-md);">注文は各卓のタブレットから行えます</p>
          <div style="background:var(--bg-input);border:1px solid var(--border-subtle);border-radius:var(--radius-md);padding:var(--space-md);font-family:var(--font-mono);font-size:var(--text-xs);color:var(--text-secondary);word-break:break-all;">
            ${window.location.origin}/#/tablet/${table.number}
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display:flex;flex-direction:column;gap:var(--space-md);">
          <button class="btn btn-secondary btn-lg w-full" id="btn-extend">
            <i data-lucide="timer-reset"></i> 延長
          </button>
          <button class="btn btn-secondary btn-lg w-full" id="btn-nomination">
            <i data-lucide="star"></i> 指名登録
          </button>
          <div style="border-top:1px solid var(--border-subtle);padding-top:var(--space-md);margin-top:var(--space-sm);">
            <button class="btn btn-primary btn-xl w-full" id="btn-billing" style="background:linear-gradient(135deg,var(--cyan),var(--cyan-dim));border-color:var(--cyan);">
              <i data-lucide="calculator"></i> 会計へ進む
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();

  // Cancel order
  container.querySelectorAll('.cancel-order-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const itemId = btn.dataset.itemId;
      const confirmed = await showConfirm({
        title: '注文取消',
        message: 'この注文を取り消しますか？',
        subMessage: '取消履歴は残ります',
        type: 'warning',
        confirmText: '取消する'
      });
      if (confirmed) {
        store.update('order_items', itemId, { cancelled: true, cancelledAt: now() });
        store.addAuditLog('order_cancel', { itemId, sessionId: session.id });
        showToast('注文を取り消しました', 'warning');
        renderDetailContent(container, tableId);
      }
    });
  });

  // Extend — カスタムモーダルで料金・時間を変更可能
  document.getElementById('btn-extend')?.addEventListener('click', () => {
    const durationOptions = [30, 40, 45, 50, 60, 70, 80, 90];
    const defaultExtDuration = settings.extensionDuration || settings.setDuration || 60;
    const extContent = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-lg);">
        <div class="form-group">
          <label class="form-label">延長料金（円）</label>
          <input type="number" class="form-input" id="ext-price" value="${settings.extensionPrice}" min="0" step="100">
        </div>
        <div class="form-group">
          <label class="form-label">延長時間</label>
          <select class="form-select" id="ext-duration">
            ${durationOptions.map(d => `<option value="${d}" ${d === defaultExtDuration ? 'selected' : ''}>${d}分</option>`).join('')}
          </select>
        </div>
      </div>
      <p style="font-size:var(--text-sm);color:var(--text-secondary);margin-top:var(--space-md);">${table.number}番卓を延長します。料金と時間を確認してください。</p>
    `;
    const extFooter = `
      <button class="btn btn-secondary modal-cancel-btn">キャンセル</button>
      <button class="btn btn-primary" id="ext-confirm">延長する</button>
    `;
    const extOverlay = showModal({ title: '延長設定', content: extContent, footer: extFooter });
    extOverlay.querySelector('.modal-cancel-btn')?.addEventListener('click', () => closeModal(extOverlay));
    extOverlay.querySelector('#ext-confirm')?.addEventListener('click', () => {
      const extPrice = parseInt(extOverlay.querySelector('#ext-price').value) || settings.extensionPrice;
      const extDuration = parseInt(extOverlay.querySelector('#ext-duration').value) || defaultExtDuration;

      // End current set
      if (currentSet) {
        store.update('session_sets', currentSet.id, { endTime: now(), active: false });
      }
      // Create new set
      store.add('session_sets', {
        sessionId: session.id,
        setNumber: sets.length + 1,
        setType: 'extension',
        taxRate: currentSet?.taxRate || settings.defaultTaxRate,
        serviceRate: currentSet?.serviceRate || settings.defaultServiceRate,
        extensionPrice: extPrice,
        extensionDuration: extDuration,
        startTime: now(),
        endTime: null,
        active: true
      });
      store.update('table_sessions', session.id, { status: 'extended' });
      store.update('tables', tableId, { status: 'extended' });
      store.addAuditLog('table_extend', { tableId, sessionId: session.id, setNumber: sets.length + 1, extensionPrice: extPrice, extensionDuration: extDuration });
      closeModal(extOverlay);
      showToast('延長しました', 'success');
      renderDetailContent(container, tableId);
    });
  });

  // Nomination
  document.getElementById('btn-nomination')?.addEventListener('click', () => {
    showNominationModal(session, tableId, container);
  });

  // Billing
  document.getElementById('btn-billing')?.addEventListener('click', () => {
    router.navigate(`/billing?tableId=${tableId}&sessionId=${session.id}`);
  });
}

function showNominationModal(session, tableId, mainContainer) {
  const casts = store.query('casts', c => c.active);
  const existingNoms = store.query('nominations', n => n.sessionId === session.id);

  const content = `
    <div class="form-group">
      <label class="form-label">キャスト</label>
      <select class="form-select" id="nom-cast">
        <option value="">選択してください</option>
        ${casts.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
      </select>
    </div>
    ${existingNoms.length > 0 ? `
    <div style="margin-top:var(--space-lg);padding-top:var(--space-lg);border-top:1px solid var(--border-subtle);">
      <div style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-md);">登録済み指名</div>
      ${existingNoms.map(n => {
        const cast = store.getById('casts', n.castId);
        const typeLabel = { honshimei: '本指名', banai: '場内指名', douhan: '同伴' }[n.type];
        return `<div style="display:flex;align-items:center;gap:var(--space-md);padding:var(--space-sm) 0;"><span class="badge badge-gold">${typeLabel}</span><span>${cast?.name || '-'}</span></div>`;
      }).join('')}
    </div>
    ` : ''}
  `;

  const footer = `
    <button class="btn btn-secondary modal-cancel-btn">キャンセル</button>
    <button class="btn btn-primary" id="nom-confirm">場内指名を登録</button>
  `;

  const overlay = showModal({ title: '場内指名登録', content, footer });
  overlay.querySelector('.modal-cancel-btn')?.addEventListener('click', () => closeModal(overlay));

  overlay.querySelector('#nom-confirm')?.addEventListener('click', () => {
    const castId = overlay.querySelector('#nom-cast').value;
    if (!castId) { showToast('キャストを選択してください', 'error'); return; }

    store.add('nominations', {
      sessionId: session.id,
      tableId,
      castId,
      type: 'banai',
      date: todayKey()
    });

    store.addAuditLog('nomination_add', { sessionId: session.id, castId, type: 'banai' });
    closeModal(overlay);
    showToast('場内指名を登録しました', 'success');
    renderDetailContent(mainContainer, tableId);
  });
}
