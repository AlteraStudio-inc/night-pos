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
  
  // Auto-refresh every 30s
  timerInterval = setInterval(() => renderTablesContent(content), 30000);
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
    let setType = '';

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
      setType = session.setType;
    }

    return { table, session, status, statusLabel, guestCount, entryTime, elapsed, estimatedTotal, nominations, setType };
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

    <!-- Table Grid -->
    <div class="table-grid" id="tables-grid">
      ${filteredData.map(td => renderTableCard(td)).join('')}
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

  container.querySelectorAll('.table-card').forEach(card => {
    card.addEventListener('click', () => {
      const tableId = card.dataset.tableId;
      router.navigate('/tables/' + tableId);
    });
  });

  document.getElementById('open-table-btn')?.addEventListener('click', () => showOpenTableModal());

  document.getElementById('table-search')?.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    container.querySelectorAll('.table-card').forEach(card => {
      const num = card.querySelector('.tc-number')?.textContent || '';
      card.style.display = num.includes(query) || !query ? '' : 'none';
    });
  });
}

function renderTableCard(td) {
  const { table, status, statusLabel, guestCount, entryTime, elapsed, estimatedTotal, nominations, setType } = td;
  
  const hasHonshimei = nominations.some(n => n.type === 'honshimei');
  const hasDouhan = nominations.some(n => n.type === 'douhan');
  const settings = store.getSettings();
  const setDuration = settings.setDuration || 60;

  let timeClass = '';
  if (status !== 'vacant') {
    const ratio = elapsed / setDuration;
    if (ratio >= 1) timeClass = 'time-danger';
    else if (ratio >= 0.8) timeClass = 'time-warning';
  }

  return `
    <div class="table-card status-${status === 'billing' ? 'billing' : status}" data-table-id="${table.id}">
      <div class="tc-header">
        <div>
          <div class="tc-number">${table.number}番</div>
        </div>
        <span class="badge badge-${status === 'active' ? 'active' : status === 'extended' ? 'extended' : status === 'billing' ? 'billing' : status === 'completed' ? 'completed' : 'vacant'}">${statusLabel}</span>
      </div>

      ${status !== 'vacant' ? `
        <div class="tc-info">
          <div>
            <div class="tc-info-label">人数</div>
            <div class="tc-info-value">${guestCount}名</div>
          </div>
          <div>
            <div class="tc-info-label">入店</div>
            <div class="tc-info-value">${entryTime}</div>
          </div>
          <div>
            <div class="tc-info-label">経過</div>
            <div class="tc-info-value tc-time ${timeClass}">${elapsed}分</div>
          </div>
          <div>
            <div class="tc-info-label">セット</div>
            <div class="tc-info-value">${setType === 'first' ? '初回' : '通常'}</div>
          </div>
        </div>
        <div class="tc-footer">
          <div class="tc-amount">${formatMoney(estimatedTotal)}</div>
          <div style="display:flex;gap:var(--space-sm);">
            ${hasHonshimei ? '<span class="tc-nomination">★ 本指名</span>' : ''}
            ${hasDouhan ? '<span class="tc-nomination" style="background:rgba(78,205,196,0.12);border-color:rgba(78,205,196,0.25);color:var(--cyan);">同伴</span>' : ''}
          </div>
        </div>
      ` : `
        <div style="padding: var(--space-xl) 0; text-align: center; color: var(--text-muted);">
          <i data-lucide="armchair" style="width:32px;height:32px;margin-bottom:var(--space-sm);opacity:0.3;"></i>
          <div style="font-size:var(--text-sm);">空席</div>
        </div>
      `}
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
