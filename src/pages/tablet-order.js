// ============================================
// Tablet Order Page - 各卓タブレット設置用 注文専用画面
// ============================================
import { store } from '../store/index.js';
import { formatMoney, todayKey, now } from '../utils/format.js';

let currentCategory = 'all';
let cart = [];
let currentView = 'top'; // 'top', 'menu', 'cast_drink'
let pollInterval = null;

export function renderTabletOrder(params) {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }

  // params.id は卓番号（1, 2, 3...）
  const tableNumber = parseInt(params.id);
  const app = document.getElementById('app');

  if (!tableNumber || isNaN(tableNumber)) {
    app.innerHTML = renderErrorScreen('無効なURLです', '正しい卓番号のURLでアクセスしてください。');
    if (window.lucide) lucide.createIcons();
    return;
  }

  // 卓番号からテーブルを検索
  const table = store.query('tables', t => t.number === tableNumber && t.active)[0];

  if (!table) {
    app.innerHTML = renderErrorScreen(`${tableNumber}番卓が見つかりません`, 'システム管理者に確認してください。');
    if (window.lucide) lucide.createIcons();
    return;
  }

  // アクティブなセッションを検索
  const session = store.query('table_sessions', s =>
    s.tableId === table.id && (s.status === 'active' || s.status === 'extended' || s.status === 'billing')
  )[0];

  if (!session) {
    // POS側で卓を開くまで待機
    app.innerHTML = renderPOSWaitingScreen(table);
    if (window.lucide) lucide.createIcons();

    // 3秒ごとにポーリング
    pollInterval = setInterval(() => {
      const newSession = store.query('table_sessions', s =>
        s.tableId === table.id && (s.status === 'active' || s.status === 'extended' || s.status === 'billing')
      )[0];
      if (newSession) {
        clearInterval(pollInterval);
        pollInterval = null;
        renderTabletOrder(params);
      }
    }, 3000);
    return;
  }

  // 状態リセット
  cart = [];
  currentView = 'top';
  currentCategory = 'all';

  renderTopMenu(app, table, session, params);
}

// ============================================
// 待機画面: POS側の操作を待つ
// ============================================
function renderPOSWaitingScreen(table) {
  return `
    <div class="tablet-screen">
      <div class="tablet-waiting">
        <div class="tablet-waiting-icon">
          <i data-lucide="monitor" style="width:64px;height:64px;color:var(--gold);opacity:0.7;"></i>
        </div>
        <h1 class="tablet-waiting-title">${table.number}番卓</h1>
        <p class="tablet-waiting-sub" style="color:var(--text-secondary);font-size:var(--text-lg);">POS側の操作を待っています</p>
        <p style="color:var(--text-muted);font-size:var(--text-sm);margin-top:var(--space-md);">管理画面で「卓を開く」操作が完了すると<br>自動的にメニュー画面が表示されます</p>
        <div class="tablet-waiting-dots" style="margin-top:var(--space-2xl);">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// エラー画面
// ============================================
function renderErrorScreen(title, message) {
  return `
    <div class="tablet-screen">
      <div class="tablet-waiting">
        <i data-lucide="alert-circle" style="width:48px;height:48px;color:var(--danger);margin-bottom:var(--space-lg);"></i>
        <h1 class="tablet-waiting-title" style="font-size:var(--text-2xl);">${title}</h1>
        <p class="tablet-waiting-sub">${message}</p>
      </div>
    </div>
  `;
}

// ============================================
// トップメニュー: GRAND MENU / CAST DRINK
// ============================================
function renderTopMenu(app, table, session, params) {
  currentView = 'top';

  app.innerHTML = `
    <div class="tablet-screen">
      <!-- Header -->
      <header class="tablet-header">
        <div class="tablet-header-left">
          <div class="tablet-table-badge">${table.number}</div>
          <div>
            <div class="tablet-header-title">ご注文</div>
            <div class="tablet-header-sub">${table.number}番卓</div>
          </div>
        </div>
      </header>

      <!-- Top Menu Buttons -->
      <div class="tablet-body" style="display:flex;align-items:center;justify-content:center;">
        <div class="tablet-top-menu">
          <button class="tablet-top-btn" id="btn-grand-menu">
            <div class="tablet-top-btn-icon">
              <i data-lucide="book-open" style="width:48px;height:48px;"></i>
            </div>
            <div class="tablet-top-btn-label">GRAND MENU</div>
            <div class="tablet-top-btn-sub">フード・ドリンクメニュー</div>
          </button>
          <button class="tablet-top-btn tablet-top-btn-cast" id="btn-cast-drink">
            <div class="tablet-top-btn-icon">
              <i data-lucide="wine" style="width:48px;height:48px;"></i>
            </div>
            <div class="tablet-top-btn-label">CAST DRINK</div>
            <div class="tablet-top-btn-sub">キャストドリンク</div>
          </button>
        </div>
      </div>

      <!-- Cart Footer (if items in cart) -->
      ${renderCartFooter()}

      ${renderSuccessOverlay()}
    </div>
  `;

  if (window.lucide) lucide.createIcons();

  app.querySelector('#btn-grand-menu')?.addEventListener('click', () => {
    renderMenuScreen(app, table, session, params);
  });

  app.querySelector('#btn-cast-drink')?.addEventListener('click', () => {
    renderCastDrinkScreen(app, table, session, params);
  });

  attachCartEvents(app, table, session, params);
}

// ============================================
// GRAND MENU: メニュー注文画面
// ============================================
function renderMenuScreen(app, table, session, params) {
  currentView = 'menu';

  const settings = store.getSettings();
  const categories = store.query('menu_categories', c => !c.isCastDrink).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const allMenus = store.query('menus', m => m.active && m.category !== 'cast_drink');

  function render() {
    const filteredMenus = currentCategory === 'all'
      ? allMenus
      : allMenus.filter(m => m.categoryId === currentCategory);

    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    app.innerHTML = `
      <div class="tablet-screen">
        <header class="tablet-header">
          <div class="tablet-header-left">
            <button class="tablet-back-btn" id="btn-back">
              <i data-lucide="arrow-left" style="width:20px;height:20px;"></i>
            </button>
            <div class="tablet-table-badge">${table.number}</div>
            <div>
              <div class="tablet-header-title">GRAND MENU</div>
              <div class="tablet-header-sub">${table.number}番卓</div>
            </div>
          </div>
        </header>

        <div class="tablet-body">
          <nav class="tablet-categories">
            <button class="tablet-cat-btn ${currentCategory === 'all' ? 'active' : ''}" data-cat="all">すべて</button>
            ${categories.map(c => `
              <button class="tablet-cat-btn ${currentCategory === c.id ? 'active' : ''}" data-cat="${c.id}">${c.name}</button>
            `).join('')}
          </nav>

          <div class="tablet-content">
            <div class="tablet-menu-grid">
              ${filteredMenus.map(menu => {
                const inCart = cart.find(c => c.menuId === menu.id);
                return `
                  <button class="tablet-menu-item ${inCart ? 'in-cart' : ''}" data-menu-id="${menu.id}">
                    <span class="tablet-menu-name">${menu.name}</span>
                    <span class="tablet-menu-price">${formatMoney(menu.price)}</span>
                    ${inCart ? `<span class="tablet-menu-badge">${inCart.quantity}</span>` : ''}
                  </button>
                `;
              }).join('')}
              ${filteredMenus.length === 0 ? '<div class="tablet-empty">このカテゴリにメニューがありません</div>' : ''}
            </div>
          </div>
        </div>

        ${renderCartFooter()}
        ${renderSuccessOverlay()}
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    // Back button
    app.querySelector('#btn-back')?.addEventListener('click', () => {
      renderTopMenu(app, table, session, params);
    });

    // Category select
    app.querySelectorAll('.tablet-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentCategory = btn.dataset.cat;
        render();
      });
    });

    // Menu item click
    app.querySelectorAll('.tablet-menu-item').forEach(el => {
      el.addEventListener('click', () => {
        const menuId = el.dataset.menuId;
        const menu = store.getById('menus', menuId);
        if (!menu) return;

        const existing = cart.find(c => c.menuId === menuId);
        if (existing) {
          existing.quantity++;
        } else {
          cart.push({
            menuId,
            name: menu.name,
            price: menu.price,
            quantity: 1,
            category: menu.category,
            categoryId: menu.categoryId
          });
        }
        render();
      });
    });

    attachCartEvents(app, table, session, params, render);
  }

  render();
}

// ============================================
// CAST DRINK: キャストドリンク注文画面
// ============================================
function renderCastDrinkScreen(app, table, session, params) {
  currentView = 'cast_drink';

  const settings = store.getSettings();
  const casts = store.query('casts', c => c.active);
  const castDrinkMenu = store.query('menus', m => m.active && m.category === 'cast_drink')[0];
  const sets = store.query('session_sets', s => s.sessionId === session.id);
  const currentSet = sets[sets.length - 1];
  const taxRate = currentSet?.taxRate || settings.defaultTaxRate;
  const serviceRate = currentSet?.serviceRate || settings.defaultServiceRate;

  function render() {
    app.innerHTML = `
      <div class="tablet-screen">
        <header class="tablet-header">
          <div class="tablet-header-left">
            <button class="tablet-back-btn" id="btn-back">
              <i data-lucide="arrow-left" style="width:20px;height:20px;"></i>
            </button>
            <div class="tablet-table-badge">${table.number}</div>
            <div>
              <div class="tablet-header-title">CAST DRINK</div>
              <div class="tablet-header-sub">${table.number}番卓</div>
            </div>
          </div>
        </header>

        <div class="tablet-body">
          <div class="tablet-content" style="padding-top:var(--space-xl);">
            <div class="tablet-cast-header">
              <h2>キャストを選択してドリンクを注文</h2>
              <p>キャストを選択後、確認画面が表示されます</p>
            </div>
            <div class="tablet-cast-grid">
              ${casts.map(cast => `
                <button class="tablet-cast-card" data-cast-id="${cast.id}">
                  <div class="tablet-cast-avatar">${cast.name.charAt(0)}</div>
                  <div class="tablet-cast-name">${cast.name}</div>
                  <div class="tablet-cast-price">${formatMoney(castDrinkMenu?.price || 1000)}</div>
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        ${renderCartFooter()}
        ${renderSuccessOverlay()}
        
        <!-- Confirmation Overlay -->
        <div class="tablet-confirm-overlay" id="cast-confirm-overlay" style="display:none;">
          <div class="tablet-confirm-content">
            <h2 id="cast-confirm-title">キャストドリンクの注文</h2>
            <p id="cast-confirm-msg">さんにドリンクを注文しますか？</p>
            <div class="tablet-cart-actions" style="border:none;padding:var(--space-xl) 0 0 0;gap:var(--space-md);">
              <button class="tablet-btn-clear" id="cast-confirm-cancel">キャンセル</button>
              <button class="tablet-btn-confirm" id="cast-confirm-ok">注文を確定する</button>
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    // Back button
    app.querySelector('#btn-back')?.addEventListener('click', () => {
      renderTopMenu(app, table, session, params);
    });

    // Cast drink
    app.querySelectorAll('.tablet-cast-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const castId = btn.dataset.castId;
        const cast = store.getById('casts', castId);
        if (!cast || !castDrinkMenu) return;

        const overlay = app.querySelector('#cast-confirm-overlay');
        const msg = app.querySelector('#cast-confirm-msg');
        if (overlay && msg) {
          msg.textContent = `${cast.name} さんにドリンクを注文しますか？`;
          overlay.style.display = 'flex';
          
          const cancelBtn = app.querySelector('#cast-confirm-cancel');
          const okBtn = app.querySelector('#cast-confirm-ok');
          
          const closeOverlay = () => {
            overlay.style.display = 'none';
          };
          
          cancelBtn.onclick = closeOverlay;
          
          okBtn.onclick = () => {
            closeOverlay();
            store.add('order_items', {
              sessionId: session.id,
              tableId: table.id,
              menuId: castDrinkMenu.id,
              menuName: `キャストドリンク (${cast.name})`,
              price: castDrinkMenu.price,
              quantity: 1,
              category: 'cast_drink',
              categoryId: castDrinkMenu.categoryId,
              castId,
              castName: cast.name,
              taxRate: currentSet?.taxRate || taxRate,
              serviceRate: currentSet?.serviceRate || serviceRate,
              setId: currentSet?.id,
              setNumber: currentSet?.setNumber || 1,
              orderTime: now(),
              date: todayKey(),
              cancelled: false,
              orderedBy: 'tablet'
            });

            store.addAuditLog('tablet_cast_drink', {
              sessionId: session.id,
              tableId: table.id,
              castId,
              castName: cast.name
            });

            showSuccessAnimation(app, () => render());
          };
        }
      });
    });

    attachCartEvents(app, table, session, params, render);
  }

  render();
}

// ============================================
// カートフッター（共通）
// ============================================
function renderCartFooter() {
  if (cart.length === 0) return '';

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return `
    <footer class="tablet-footer">
      <div class="tablet-cart-summary" id="toggle-cart">
        <div class="tablet-cart-count">${cartCount}</div>
        <div class="tablet-cart-label">注文内容を確認</div>
        <div class="tablet-cart-total">${formatMoney(cartTotal)}</div>
      </div>
      <div class="tablet-cart-detail" id="cart-detail" style="display:none;">
        <div class="tablet-cart-items">
          ${cart.map((item, i) => `
            <div class="tablet-cart-item">
              <span class="tablet-cart-item-name">${item.name}</span>
              <div class="tablet-cart-item-controls">
                <button class="tablet-qty-btn" data-action="minus" data-index="${i}">−</button>
                <span class="tablet-qty-value">${item.quantity}</span>
                <button class="tablet-qty-btn" data-action="plus" data-index="${i}">+</button>
              </div>
              <span class="tablet-cart-item-price">${formatMoney(item.price * item.quantity)}</span>
            </div>
          `).join('')}
        </div>
        <div class="tablet-cart-actions">
          <button class="tablet-btn-clear" id="clear-cart">注文をクリア</button>
          <button class="tablet-btn-confirm" id="confirm-order">
            <i data-lucide="check-circle"></i>
            注文を確定する（${formatMoney(cartTotal)}）
          </button>
        </div>
      </div>
    </footer>
  `;
}

function renderSuccessOverlay() {
  return `
    <div class="tablet-success-overlay" id="success-overlay" style="display:none;">
      <div class="tablet-success-content">
        <div class="tablet-success-icon">
          <i data-lucide="check" style="width:48px;height:48px;"></i>
        </div>
        <h2>ご注文ありがとうございます</h2>
        <p>注文が確定されました</p>
      </div>
    </div>
  `;
}

// ============================================
// カートイベント（共通）
// ============================================
function attachCartEvents(app, table, session, params, rerender) {
  const settings = store.getSettings();

  // Toggle cart detail
  app.querySelector('#toggle-cart')?.addEventListener('click', () => {
    const detail = app.querySelector('#cart-detail');
    if (detail) detail.style.display = detail.style.display === 'none' ? '' : 'none';
  });

  // Qty controls
  app.querySelectorAll('.tablet-qty-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index);
      const action = btn.dataset.action;
      if (action === 'plus') {
        cart[idx].quantity++;
      } else {
        cart[idx].quantity--;
        if (cart[idx].quantity <= 0) cart.splice(idx, 1);
      }
      if (rerender) rerender();
      else renderTopMenu(app, table, session, params);
    });
  });

  // Clear cart
  app.querySelector('#clear-cart')?.addEventListener('click', () => {
    cart = [];
    if (rerender) rerender();
    else renderTopMenu(app, table, session, params);
  });

  // Confirm order
  app.querySelector('#confirm-order')?.addEventListener('click', () => {
    if (cart.length === 0) return;

    const sets = store.query('session_sets', s => s.sessionId === session.id);
    const currentSet = sets[sets.length - 1];
    const taxRate = currentSet?.taxRate || settings.defaultTaxRate;
    const serviceRate = currentSet?.serviceRate || settings.defaultServiceRate;

    cart.forEach(item => {
      store.add('order_items', {
        sessionId: session.id,
        tableId: table.id,
        menuId: item.menuId,
        menuName: item.name,
        price: item.price,
        quantity: item.quantity,
        category: item.category,
        categoryId: item.categoryId,
        taxRate,
        serviceRate,
        setId: currentSet?.id,
        setNumber: currentSet?.setNumber || 1,
        orderTime: now(),
        date: todayKey(),
        cancelled: false,
        orderedBy: 'tablet'
      });
    });

    store.addAuditLog('tablet_order', {
      sessionId: session.id,
      tableId: table.id,
      items: cart.map(c => ({ name: c.name, qty: c.quantity }))
    });

    cart = [];
    showSuccessAnimation(app, () => {
      if (rerender) rerender();
      else renderTopMenu(app, table, session, params);
    });
  });
}

function showSuccessAnimation(app, callback) {
  const overlay = app.querySelector('#success-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    setTimeout(() => {
      overlay.style.display = 'none';
      callback();
    }, 1800);
  }
}
