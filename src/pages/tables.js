// ============================================
// Tables List Page - 卓一覧（最重要画面）
// ============================================
import { renderLayout, setPageTitle } from '../components/layout.js';
import { store } from '../store/index.js';
import { router } from '../router.js';
import { formatMoney, formatTime, todayKey, generateId, now } from '../utils/format.js';
import { showModal, closeModal, showConfirm } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { calcBillingSummary } from '../utils/calc.js';

let timerInterval = null;

export function renderTables() {
  if (timerInterval) clearInterval(timerInterval);

  renderLayout('', 'tables');
  setPageTitle('卓一覧');

  const content = document.getElementById('page-content');
  renderTablesContent(content);

  // Auto-refresh every 10s (faster for elapsed time updates)
  timerInterval = setInterval(() => renderTablesContent(content), 10000);
}

function renderTablesContent(container) {
  const tables = store.query('tables', t => t.active);
  const today = todayKey();
  const settings = store.getSettings();

  // Get active sessions for each table
  const tableData = tables.map(table => {
    const session = store.query('table_sessions', s =>
      s.tableId === table.id && (s.status === 'active' || s.status === 'extended' || s.status === 'billing')
    )[0];

    let elapsed = 0;
    let status = 'vacant';
    let statusLabel = '空席';
    let guestCount = 0;
    let entryTime = '';
    let estimatedTotal = 0;
    let nominations = [];
    let setCount = 0;

    if (session) {
      status = session.status;
      statusLabel = {
        'active': '入店中',
        'extended': '延長中',
        'billing': '会計待ち',
        'completed': '会計済み'
      }[session.status] || session.status;

      guestCount = session.guestCount;
      entryTime = formatTime(session.entryTime);
      elapsed = Math.floor((Date.now() - new Date(session.entryTime).getTime()) / 60000);

      // Get nominations
      nominations = store.query('nominations', n => n.sessionId === session.id);

      // Calculate estimate
      const sets = store.query('session_sets', st => st.sessionId === session.id);
      const orderItems = store.query('order_items', oi => oi.sessionId === session.id && !oi.cancelled);
      const summary = calcBillingSummary(session, sets, orderItems, settings);
      estimatedTotal = summary.grandTotal;
      setCount = sets.length;
    }

    return { table, session, status, statusLabel, guestCount, entryTime, elapsed, estimatedTotal, nominations, setCount };
  }).sort((a, b) => a.table.number - b.table.number);

  const activeCount = tableData.filter(t => t.status !== 'vacant').length;
  const vacantCount = tableData.filter(t => t.status === 'vacant').length;

  // Current filter
  const currentFilter = container.dataset.filter || 'all';

  // フィルタリング
  const filteredData = currentFilter === 'all'
    ? tableData
    : tableData.filter(td => td.status === currentFilter);

  const activeFilterCount = tableData.filter(t => t.status === 'active').length;
  const extendedFilterCount = tableData.filter(t => t.status === 'extended').length;
  const billingFilterCount = tableData.filter(t => t.status === 'billing').length;

  // 会計済み卓の取得（当日分、会計完了時間降順）
  // 深夜をまたぐケース（昨日入店→今日会計）も表示するため completedAt のローカル日付もチェック
  const completedSessions = store.query('table_sessions', s => {
    if (s.status !== 'completed' || !s.completedAt) return false;
    if (s.date === today) return true;
    const cd = new Date(s.completedAt);
    const completedDate = `${cd.getFullYear()}-${String(cd.getMonth() + 1).padStart(2, '0')}-${String(cd.getDate()).padStart(2, '0')}`;
    return completedDate === today;
  }).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

  const completedData = completedSessions.map(session => {
    const table = store.getById('tables', session.tableId);
    return {
      session,
      tableNumber: table ? table.number : '?',
      guestCount: session.guestCount,
      entryTime: formatTime(session.entryTime),
      completedTime: formatTime(session.completedAt),
      totalAmount: session.totalAmount || 0
    };
  });

  container.innerHTML = `
    <!-- Filter Bar -->
    <div class="filter-bar">
      <div class="search-input">
        <i data-lucide="search"></i>
        <input type="text" class="form-input" id="table-search" placeholder="卓番号で検索...">
      </div>
      <div class="filter-chip ${currentFilter === 'all' ? 'active' : ''}" data-filter="all">すべて (${tableData.length})</div>
      <div class="filter-chip ${currentFilter === 'active' ? 'active' : ''}" data-filter="active">入店中 (${activeFilterCount})</div>
      <div class="filter-chip ${currentFilter === 'extended' ? 'active' : ''}" data-filter="extended">延長中 (${extendedFilterCount})</div>
      <div class="filter-chip ${currentFilter === 'billing' ? 'active' : ''}" data-filter="billing">会計待ち (${billingFilterCount})</div>
      <div class="filter-chip ${currentFilter === 'vacant' ? 'active' : ''}" data-filter="vacant">空席 (${vacantCount})</div>
      <div style="margin-left:auto;">
        <button class="btn btn-primary btn-lg" id="open-table-btn">
          <i data-lucide="plus-circle"></i> 卓を開く
        </button>
      </div>
    </div>

    <!-- Table List (横1列リスト表示) -->
    <div class="table-list" id="tables-list">
      ${filteredData.length > 0 ? `
        <div class="table-list-header">
          <div class="tl-col tl-col-number">卓番号</div>
          <div class="tl-col tl-col-status">ステータス</div>
          <div class="tl-col tl-col-guests">人数</div>
          <div class="tl-col tl-col-entry">入店時間</div>
          <div class="tl-col tl-col-elapsed">経過時間</div>
          <div class="tl-col tl-col-set">セット</div>
          <div class="tl-col tl-col-amount">見積金額</div>
          <div class="tl-col tl-col-nomination">指名</div>
        </div>
        ${filteredData.map(td => renderTableRow(td, settings)).join('')}
      ` : `
        <div class="empty-state" style="padding:var(--space-3xl);">
          <i data-lucide="inbox" style="width:36px;height:36px;"></i>
          <p>該当する卓がありません</p>
        </div>
      `}
    </div>

    <!-- 会計済み卓の履歴（常に表示） -->
    <div style="margin-top:var(--space-2xl);">
      <h3 style="font-size:var(--text-lg);font-weight:700;margin-bottom:var(--space-md);display:flex;align-items:center;gap:var(--space-sm);">
        <i data-lucide="check-circle" style="width:18px;height:18px;color:var(--success);"></i>
        会計済み（本日 ${completedData.length}組）
      </h3>
      <div class="table-list completed-list">
        <div class="table-list-header completed-header">
          <div class="tl-col tl-col-number">卓番号</div>
          <div class="tl-col tl-col-guests">人数</div>
          <div class="tl-col tl-col-entry">入店時間</div>
          <div class="tl-col tl-col-completed">会計完了</div>
          <div class="tl-col tl-col-amount">会計金額</div>
        </div>
        ${completedData.length > 0 ? completedData.map(cd => `
          <div class="table-list-row completed-row">
            <div class="tl-col tl-col-number">
              <span class="tl-number">${cd.tableNumber}番</span>
            </div>
            <div class="tl-col tl-col-guests">${cd.guestCount}名</div>
            <div class="tl-col tl-col-entry" style="font-family:var(--font-mono);">${cd.entryTime}</div>
            <div class="tl-col tl-col-completed" style="font-family:var(--font-mono);">${cd.completedTime}</div>
            <div class="tl-col tl-col-amount" style="font-family:var(--font-mono);color:var(--gold-light);">${formatMoney(cd.totalAmount)}</div>
          </div>
        `).join('') : `
          <div class="empty-state" style="padding:var(--space-xl);">
            <p style="color:var(--text-tertiary);font-size:var(--text-sm);">本日の会計済み卓はまだありません</p>
          </div>
        `}
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();

  // Event listeners
  container.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.dataset.filter = chip.dataset.filter;
      renderTablesContent(container);
    });
  });

  container.querySelectorAll('.table-list-row:not(.completed-row)').forEach(row => {
    row.addEventListener('click', () => {
      const tableId = row.dataset.tableId;
      router.navigate('/tables/' + tableId);
    });
  });

  document.getElementById('open-table-btn')?.addEventListener('click', () => showOpenTableModal());

  document.getElementById('table-search')?.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    container.querySelectorAll('.table-list-row:not(.completed-row)').forEach(row => {
      const num = row.querySelector('.tl-number')?.textContent || '';
      row.style.display = num.includes(query) || !query ? '' : 'none';
    });
  });
}

function renderTableRow(td, settings) {
  const { table, status, statusLabel, guestCount, entryTime, elapsed, estimatedTotal, nominations, setCount } = td;

  const hasHonshimei = nominations.some(n => n.type === 'honshimei');
  const hasDouhan = nominations.some(n => n.type === 'douhan');
  const setDuration = settings.setDuration || 60;

  let timeClass = '';
  if (status !== 'vacant') {
    const ratio = elapsed / setDuration;
    if (ratio >= 1) timeClass = 'time-danger';
    else if (ratio >= 0.8) timeClass = 'time-warning';
  }

  const badgeClass = status === 'active' ? 'badge-active' : status === 'extended' ? 'badge-extended' : status === 'billing' ? 'badge-billing' : 'badge-vacant';

  return `
    <div class="table-list-row status-${status === 'billing' ? 'billing' : status}" data-table-id="${table.id}">
      <div class="tl-col tl-col-number">
        <span class="tl-number">${table.number}番</span>
      </div>
      <div class="tl-col tl-col-status">
        <span class="badge ${badgeClass}">${statusLabel}</span>
      </div>
      <div class="tl-col tl-col-guests">
        ${status !== 'vacant' ? `${guestCount}名` : '-'}
      </div>
      <div class="tl-col tl-col-entry" style="font-family:var(--font-mono);">
        ${status !== 'vacant' ? entryTime : '-'}
      </div>
      <div class="tl-col tl-col-elapsed">
        ${status !== 'vacant' ? `<span class="tl-elapsed ${timeClass}">経過 ${elapsed}分</span>` : '-'}
      </div>
      <div class="tl-col tl-col-set">
        ${status !== 'vacant' ? `<span class="tl-set-count">${setCount}</span>` : '-'}
      </div>
      <div class="tl-col tl-col-amount">
        ${status !== 'vacant' ? `<span style="font-family:var(--font-mono);color:var(--gold-light);font-weight:700;">${formatMoney(estimatedTotal)}</span>` : '-'}
      </div>
      <div class="tl-col tl-col-nomination">
        ${hasHonshimei ? '<span class="tl-nom-badge">★ 本指名</span>' : ''}
        ${hasDouhan ? '<span class="tl-nom-badge tl-nom-douhan">同伴</span>' : ''}
        ${!hasHonshimei && !hasDouhan && status !== 'vacant' ? '-' : ''}
      </div>
    </div>
  `;
}

function showOpenTableModal() {
  const tables = store.query('tables', t => t.active);
  const vacantTables = tables.filter(t => {
    const session = store.query('table_sessions', s =>
      s.tableId === t.id && (s.status === 'active' || s.status === 'extended' || s.status === 'billing')
    );
    return session.length === 0;
  }).sort((a, b) => a.number - b.number);

  const settings = store.getSettings();
  const activeCasts = store.query('casts', c => c.active);

  // セット時間の選択肢（30〜90分）
  const durationOptions = [30, 40, 45, 50, 60, 70, 80, 90];

  const content = `
    <div class="form-group">
      <label class="form-label">卓番号 <span style="color:var(--danger)">*</span></label>
      <select class="form-select" id="modal-table-select">
        <option value="">選択してください</option>
        ${vacantTables.map(t => `<option value="${t.id}">${t.number}番卓</option>`).join('')}
      </select>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-lg);">
      <div class="form-group">
        <label class="form-label">来店人数 <span style="color:var(--danger)">*</span></label>
        <input type="number" class="form-input" id="modal-guest-count" min="1" value="1">
      </div>
      <div class="form-group">
        <label class="form-label">入店時間</label>
        <input type="time" class="form-input" id="modal-entry-time" value="${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}">
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-lg);">
      <div class="form-group">
        <label class="form-label">セット料金（円）</label>
        <input type="number" class="form-input" id="modal-set-price" value="${settings.firstSetPrice}" min="0" step="100">
      </div>
      <div class="form-group">
        <label class="form-label">セット時間</label>
        <select class="form-select" id="modal-set-duration">
          ${durationOptions.map(d => `<option value="${d}" ${d === settings.setDuration ? 'selected' : ''}>${d}分</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-lg);">
      <div class="form-group">
        <label class="form-label">同伴</label>
        <select class="form-select" id="modal-douhan">
          <option value="no">なし</option>
          <option value="yes">あり</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">本指名</label>
        <select class="form-select" id="modal-honshimei-cast">
          <option value="">なし</option>
          ${activeCasts.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-lg);">
      <div class="form-group">
        <label class="form-label">TAX率 (%)</label>
        <input type="number" class="form-input" id="modal-tax-rate" value="${settings.defaultTaxRate * 100}" min="0" max="100" step="1">
      </div>
      <div class="form-group">
        <label class="form-label">サービス料 (%)</label>
        <input type="number" class="form-input" id="modal-service-rate" value="${settings.defaultServiceRate * 100}" min="0" max="100" step="1">
      </div>
    </div>
    <div id="douhan-cast-section" style="display:none;">
      <div class="form-group">
        <label class="form-label">同伴キャスト</label>
        <select class="form-select" id="modal-douhan-cast">
          <option value="">選択してください</option>
          ${activeCasts.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
      </div>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary modal-cancel-btn">キャンセル</button>
    <button class="btn btn-primary btn-lg" id="modal-open-table-confirm">
      <i data-lucide="door-open"></i> 卓を開く
    </button>
  `;

  const overlay = showModal({ title: '卓を開く', content, footer, persistent: true });

  // Douhan toggle — セット料金もデフォルト変更
  overlay.querySelector('#modal-douhan')?.addEventListener('change', (e) => {
    const section = overlay.querySelector('#douhan-cast-section');
    const priceInput = overlay.querySelector('#modal-set-price');
    if (section) section.style.display = e.target.value === 'yes' ? '' : 'none';
    if (priceInput) priceInput.value = e.target.value === 'yes' ? settings.douhanSetPrice : settings.firstSetPrice;
  });

  overlay.querySelector('.modal-cancel-btn')?.addEventListener('click', () => closeModal(overlay));

  overlay.querySelector('#modal-open-table-confirm')?.addEventListener('click', () => {
    const tableId = overlay.querySelector('#modal-table-select').value;
    const guestCount = parseInt(overlay.querySelector('#modal-guest-count').value);
    const entryTimeStr = overlay.querySelector('#modal-entry-time').value;
    const isDouhan = overlay.querySelector('#modal-douhan').value === 'yes';
    const setPrice = parseInt(overlay.querySelector('#modal-set-price').value) || settings.firstSetPrice;
    const setDuration = parseInt(overlay.querySelector('#modal-set-duration').value) || settings.setDuration;
    const taxRate = parseFloat(overlay.querySelector('#modal-tax-rate').value) / 100;
    const serviceRate = parseFloat(overlay.querySelector('#modal-service-rate').value) / 100;
    const douhanCastId = overlay.querySelector('#modal-douhan-cast')?.value || null;
    const honshimeiCastId = overlay.querySelector('#modal-honshimei-cast')?.value || null;

    // Validation
    if (!tableId) { showToast('卓番号を選択してください', 'error'); return; }
    if (!guestCount || guestCount < 1) { showToast('来店人数は1名以上で入力してください', 'error'); return; }

    const today = todayKey();
    const entryDate = new Date();
    if (entryTimeStr) {
      const [h, m] = entryTimeStr.split(':');
      entryDate.setHours(parseInt(h), parseInt(m), 0, 0);
    }

    const settings = store.getSettings();

    // Create session
    const session = store.add('table_sessions', {
      tableId,
      date: today,
      guestCount,
      entryTime: entryDate.toISOString(),
      setType: 'first',
      isDouhan,
      status: 'active',
      douhanCastId,
      honshimeiCastId,
      setDuration,
      douhanFee: isDouhan ? (settings.douhanFee || 5000) : 0
    });

    // Create first set
    store.add('session_sets', {
      sessionId: session.id,
      setNumber: 1,
      setType: 'first',
      taxRate,
      serviceRate,
      setPrice,
      setDuration,
      startTime: entryDate.toISOString(),
      endTime: null,
      active: true
    });

    // Update table status
    store.update('tables', tableId, { status: 'active' });

    // Add douhan nomination if applicable
    if (isDouhan && douhanCastId) {
      store.add('nominations', {
        sessionId: session.id,
        tableId,
        castId: douhanCastId,
        type: 'douhan',
        date: today
      });
    }

    // Add honshimei nomination if applicable
    if (honshimeiCastId) {
      store.add('nominations', {
        sessionId: session.id,
        tableId,
        castId: honshimeiCastId,
        type: 'honshimei',
        date: today
      });
    }

    store.addAuditLog('table_open', {
      tableId,
      sessionId: session.id,
      guestCount,
      setType: 'first',
      isDouhan,
      setPrice,
      setDuration,
      honshimeiCastId
    });

    closeModal(overlay);
    showToast('卓を開きました', 'success');
    const contentEl = document.getElementById('page-content');
    if (contentEl) renderTablesContent(contentEl);
  });
}
