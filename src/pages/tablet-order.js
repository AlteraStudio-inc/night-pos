// ============================================
// Tablet Order Page - 各卓タブレット設置用 注文専用画面
// ============================================
import { store } from '../store/index.js';
import { formatMoney, todayKey, now, generateId } from '../utils/format.js';

let currentCategory = 'all';
let cart = [];
let castDrinkMode = false;

export function renderTabletOrder(params) {
  const tableId = params.id;
  const table = store.getById('tables', tableId);

  const app = document.getElementById('app');

  if (!table) {
    app.innerHTML = renderErrorScreen('卓が見つかりません', '正しいURLでアクセスしてください。');
    return;
  }

  // Find active session
  const session = store.query('table_sessions', s =>
    s.tableId === tableId && (s.status === 'active' || s.status === 'extended' || s.status === 'billing')
  )[0];

  if (!session) {
    app.innerHTML = renderWaitingScreen(table);
    if (window.lucide) lucide.createIcons();
    // Poll for session
    const poll = setInterval(() => {
      const newSession = store.query('table_sessions', s =>
        s.tableId === tableId && (s.status === 'active' || s.status === 'extended' || s.status === 'billing')
      )[0];
      if (newSession) {
        clearInterval(poll);
        renderTabletOrder(params);
      }
    }, 3000);
    return;
  }

  // Reset state
  cart = [];
  castDrinkMode = false;
  currentCategory = 'all';

  renderOrderScreen(app, table, session);
}

function renderWaitingScreen(table) {
  return `
    <div class="tablet-screen">
      <div class="tablet-waiting">
        <div class="tablet-waiting-icon">
          <i data-lucide="wine" style="width:64px;height:64px;color:var(--gold);"></i>
        </div>
        <h1 class="tablet-waiting-title">${table.number}番卓</h1>
        <p class="tablet-waiting-sub">ご来店お待ちしております</p>
        <div class="tablet-waiting-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  `;
}

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

function renderOrderScreen(app, table, session) {
  const settings = store.getSettings();
  const categories = store.query('menu_categories', c => !c.isCastDrink).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const allMenus = store.query('menus', m => m.active && m.category !== 'cast_drink');
  const casts = store.query('casts', c => c.active);
  const castDrinkMenu = store.query('menus', m => m.active && m.category === 'cast_drink')[0];
  const sets = store.query('session_sets', s => s.sessionId === session.id);
  const currentSet = sets[sets.length - 1];
  const taxRate = currentSet?.taxRate || settings.defaultTaxRate;
  const serviceRate = currentSet?.serviceRate || settings.defaultServiceRate;

  function render() {
    const filteredMenus = currentCategory === 'all'
      ? allMenus
      : allMenus.filter(m => m.categoryId === currentCategory);

    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

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
          <div class="tablet-header-right">
            <div class="tablet-mode-toggle">
              <button class="tablet-mode-btn ${!castDrinkMode ? 'active' : ''}" id="mode-menu">
                <i data-lucide="book-open"></i> メニュー
              </button>
              <button class="tablet-mode-btn ${castDrinkMode ? 'active' : ''}" id="mode-cast">
                <i data-lucide="wine"></i> キャストドリンク
              </button>
            </div>
          </div>
        </header>

        ${!castDrinkMode ? `
        <!-- Menu Order Mode -->
        <div class="tablet-body">
          <!-- Categories -->
          <nav class="tablet-categories">
            <button class="tablet-cat-btn ${currentCategory === 'all' ? 'active' : ''}" data-cat="all">すべて</button>
            ${categories.map(c => `
              <button class="tablet-cat-btn ${currentCategory === c.id ? 'active' : ''}" data-cat="${c.id}">${c.name}</button>
            `).join('')}
          </nav>

          <!-- Menu Grid -->
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
        ` : `
        <!-- Cast Drink Mode -->
        <div class="tablet-body">
          <div class="tablet-content" style="padding-top:var(--space-xl);">
            <div class="tablet-cast-header">
              <h2>キャストを選択してドリンクを注文</h2>
              <p>タップするとドリンクが注文されます</p>
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
        `}

        <!-- Cart Footer -->
        ${cart.length > 0 ? `
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
        ` : ''}

        <!-- Success Overlay -->
        <div class="tablet-success-overlay" id="success-overlay" style="display:none;">
          <div class="tablet-success-content">
            <div class="tablet-success-icon">
              <i data-lucide="check" style="width:48px;height:48px;"></i>
            </div>
            <h2>ご注文ありがとうございます</h2>
            <p>注文が確定されました</p>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
    attachEvents(app, table, session, taxRate, serviceRate, settings, castDrinkMenu, render);
  }

  render();
}

function attachEvents(app, table, session, taxRate, serviceRate, settings, castDrinkMenu, rerender) {
  // Mode toggle
  app.querySelector('#mode-menu')?.addEventListener('click', () => {
    castDrinkMode = false;
    rerender();
  });
  app.querySelector('#mode-cast')?.addEventListener('click', () => {
    castDrinkMode = true;
    rerender();
  });

  // Category select
  app.querySelectorAll('.tablet-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentCategory = btn.dataset.cat;
      rerender();
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
      rerender();
    });
  });

  // Cast drink
  app.querySelectorAll('.tablet-cast-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const castId = btn.dataset.castId;
      const cast = store.getById('casts', castId);
      if (!cast || !castDrinkMenu) return;

      const sets = store.query('session_sets', s => s.sessionId === session.id);
      const currentSet = sets[sets.length - 1];

      // Directly place cast drink order
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

      showSuccessAnimation(app, () => rerender());
    });
  });

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
      rerender();
    });
  });

  // Clear cart
  app.querySelector('#clear-cart')?.addEventListener('click', () => {
    cart = [];
    rerender();
  });

  // Confirm order
  app.querySelector('#confirm-order')?.addEventListener('click', () => {
    if (cart.length === 0) return;

    const sets = store.query('session_sets', s => s.sessionId === session.id);
    const currentSet = sets[sets.length - 1];

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
        taxRate: currentSet?.taxRate || taxRate,
        serviceRate: currentSet?.serviceRate || serviceRate,
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
    showSuccessAnimation(app, () => rerender());
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
