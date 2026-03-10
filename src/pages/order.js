// ============================================
// Order Page - 注文入力画面
// ============================================
import { renderLayout, setPageTitle } from '../components/layout.js';
import { store } from '../store/index.js';
import { router } from '../router.js';
import { formatMoney, todayKey, now } from '../utils/format.js';
import { showModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export function renderOrder(params) {
  const tableId = params.tableId;
  const sessionId = params.sessionId;
  const initialType = params.type || 'menu'; // 'menu' or 'cast_drink'

  const table = store.getById('tables', tableId);
  const session = store.getById('table_sessions', sessionId);
  if (!table || !session) { router.navigate('/tables'); return; }

  renderLayout('', 'tables');
  setPageTitle(`注文入力 - ${table.number}番卓`);

  const content = document.getElementById('page-content');
  
  if (initialType === 'cast_drink') {
    renderCastDrinkOrder(content, tableId, sessionId, session);
  } else {
    renderMenuOrder(content, tableId, sessionId, session);
  }
}

function renderMenuOrder(container, tableId, sessionId, session) {
  const categories = store.query('menu_categories', c => !c.isCastDrink).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const allMenus = store.query('menus', m => m.active && m.category !== 'cast_drink');
  const settings = store.getSettings();

  // Get current set for tax/service rate
  const sets = store.query('session_sets', s => s.sessionId === sessionId);
  const currentSet = sets[sets.length - 1];
  const taxRate = currentSet?.taxRate || settings.defaultTaxRate;
  const serviceRate = currentSet?.serviceRate || settings.defaultServiceRate;

  let selectedCategory = categories[0]?.id || '';
  let cart = [];

  function render() {
    const filteredMenus = selectedCategory 
      ? allMenus.filter(m => m.categoryId === selectedCategory)
      : allMenus;

    container.innerHTML = `
      <div style="margin-bottom:var(--space-lg);display:flex;align-items:center;justify-content:space-between;">
        <button class="btn btn-ghost" id="back-btn">
          <i data-lucide="arrow-left"></i> ${table.number}番卓へ戻る
        </button>
        <div style="display:flex;gap:var(--space-md);">
          <button class="btn btn-secondary active-tab" id="tab-menu">
            <i data-lucide="book-open"></i> メニュー
          </button>
          <button class="btn btn-ghost" id="tab-cast-drink">
            <i data-lucide="wine"></i> キャストドリンク
          </button>
        </div>
      </div>

      <div class="detail-layout" style="grid-template-columns:200px 1fr 320px;">
        <!-- Category sidebar -->
        <div>
          <div class="card" style="padding:var(--space-md);">
            <div style="font-size:var(--text-xs);font-weight:700;color:var(--text-tertiary);padding:var(--space-sm) var(--space-md);margin-bottom:var(--space-sm);">カテゴリ</div>
            ${categories.map(cat => `
              <div class="nav-item ${cat.id === selectedCategory ? 'active' : ''}" data-cat-id="${cat.id}" style="padding:var(--space-md);border-left-width:3px;cursor:pointer;border-radius:0;">
                ${cat.name}
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Menu grid -->
        <div>
          <div class="menu-grid">
            ${filteredMenus.map(menu => `
              <div class="menu-item-card" data-menu-id="${menu.id}">
                <div class="item-name">${menu.name}</div>
                <div class="item-price">${formatMoney(menu.price)}</div>
              </div>
            `).join('')}
            ${filteredMenus.length === 0 ? '<div class="empty-state"><p>このカテゴリにメニューがありません</p></div>' : ''}
          </div>
        </div>

        <!-- Cart -->
        <div>
          <div class="card" style="position:sticky;top:0;">
            <div class="card-header">
              <h3 class="card-title">注文内容</h3>
              <span style="font-size:var(--text-sm);color:var(--text-secondary);">${cart.length}品</span>
            </div>
            ${cart.length > 0 ? `
              <ul class="order-list" style="margin-bottom:var(--space-lg);">
                ${cart.map((item, i) => `
                  <li class="order-item">
                    <span class="order-name" style="flex:1;">${item.name}</span>
                    <div class="qty-control">
                      <button class="qty-btn" data-action="minus" data-index="${i}">−</button>
                      <span class="qty-value">${item.quantity}</span>
                      <button class="qty-btn" data-action="plus" data-index="${i}">+</button>
                    </div>
                    <span class="order-price">${formatMoney(item.price * item.quantity)}</span>
                  </li>
                `).join('')}
              </ul>
              <div style="border-top:1px solid var(--border-subtle);padding-top:var(--space-md);margin-bottom:var(--space-lg);">
                <div style="display:flex;justify-content:space-between;font-size:var(--text-lg);font-weight:700;">
                  <span>小計</span>
                  <span class="font-mono text-gold">${formatMoney(cart.reduce((sum, item) => sum + item.price * item.quantity, 0))}</span>
                </div>
              </div>
              <button class="btn btn-primary btn-xl w-full" id="confirm-order-btn">
                <i data-lucide="check-circle"></i> 注文確定
              </button>
            ` : `
              <div class="empty-state" style="padding:var(--space-xl);">
                <p>メニューを選択してください</p>
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    // Event: back
    container.querySelector('#back-btn')?.addEventListener('click', () => {
      router.navigate('/tables/' + tableId);
    });

    // Event: tab switch
    container.querySelector('#tab-cast-drink')?.addEventListener('click', () => {
      renderCastDrinkOrder(container, tableId, sessionId, session);
    });

    // Event: category select
    container.querySelectorAll('[data-cat-id]').forEach(el => {
      el.addEventListener('click', () => {
        selectedCategory = el.dataset.catId;
        render();
      });
    });

    // Event: menu item click
    container.querySelectorAll('.menu-item-card').forEach(el => {
      el.addEventListener('click', () => {
        const menuId = el.dataset.menuId;
        const menu = store.getById('menus', menuId);
        if (!menu) return;

        const existing = cart.find(c => c.menuId === menuId);
        if (existing) {
          existing.quantity++;
        } else {
          cart.push({ menuId, name: menu.name, price: menu.price, quantity: 1, category: menu.category, categoryId: menu.categoryId });
        }
        render();
      });
    });

    // Event: qty buttons
    container.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        const action = btn.dataset.action;
        if (action === 'plus') cart[idx].quantity++;
        else {
          cart[idx].quantity--;
          if (cart[idx].quantity <= 0) cart.splice(idx, 1);
        }
        render();
      });
    });

    // Event: confirm order
    container.querySelector('#confirm-order-btn')?.addEventListener('click', () => {
      cart.forEach(item => {
        store.add('order_items', {
          sessionId,
          tableId,
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
          orderedBy: store.getCurrentUserId()
        });
      });

      store.addAuditLog('order_add', { sessionId, tableId, items: cart.map(c => ({ name: c.name, qty: c.quantity })) });
      showToast(`${cart.length}品の注文を確定しました`, 'success');
      router.navigate('/tables/' + tableId);
    });
  }

  const table = store.getById('tables', tableId);
  render();
}

function renderCastDrinkOrder(container, tableId, sessionId, session) {
  const casts = store.query('casts', c => c.active);
  const castDrinkMenu = store.query('menus', m => m.active && m.category === 'cast_drink')[0];
  const settings = store.getSettings();
  const sets = store.query('session_sets', s => s.sessionId === sessionId);
  const currentSet = sets[sets.length - 1];
  const taxRate = currentSet?.taxRate || settings.defaultTaxRate;
  const serviceRate = currentSet?.serviceRate || settings.defaultServiceRate;
  const table = store.getById('tables', tableId);

  container.innerHTML = `
    <div style="margin-bottom:var(--space-lg);display:flex;align-items:center;justify-content:space-between;">
      <button class="btn btn-ghost" id="back-btn">
        <i data-lucide="arrow-left"></i> ${table.number}番卓へ戻る
      </button>
      <div style="display:flex;gap:var(--space-md);">
        <button class="btn btn-ghost" id="tab-menu">
          <i data-lucide="book-open"></i> メニュー
        </button>
        <button class="btn btn-secondary active-tab" id="tab-cast-drink">
          <i data-lucide="wine"></i> キャストドリンク
        </button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title"><i data-lucide="wine" style="width:18px;height:18px;color:var(--gold)"></i> キャストドリンク注文</h3>
        <span style="font-size:var(--text-sm);color:var(--text-secondary);">${formatMoney(castDrinkMenu?.price || 1000)} / 杯</span>
      </div>
      <p style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-xl);">キャストを選択してドリンクを注文します。バックが自動的に加算されます。</p>
      
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:var(--space-md);">
        ${casts.map(cast => `
          <button class="menu-item-card cast-drink-btn" data-cast-id="${cast.id}" style="text-align:center;padding:var(--space-xl);">
            <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold-dim));display:inline-flex;align-items:center;justify-content:center;font-size:var(--text-lg);font-weight:700;color:var(--bg-deepest);margin-bottom:var(--space-md);">
              ${cast.name.charAt(0)}
            </div>
            <div class="item-name" style="font-size:var(--text-base);">${cast.name}</div>
            <div style="font-size:var(--text-xs);color:var(--text-tertiary);margin-top:4px;">バック: ${formatMoney(cast.drinkBackPrice || settings.drinkBackPrice)}</div>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();

  container.querySelector('#back-btn')?.addEventListener('click', () => {
    router.navigate('/tables/' + tableId);
  });

  container.querySelector('#tab-menu')?.addEventListener('click', () => {
    renderMenuOrder(container, tableId, sessionId, session);
  });

  container.querySelectorAll('.cast-drink-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const castId = btn.dataset.castId;
      const cast = store.getById('casts', castId);
      if (!cast || !castDrinkMenu) return;

      // Add order item
      store.add('order_items', {
        sessionId,
        tableId,
        menuId: castDrinkMenu.id,
        menuName: `キャストドリンク (${cast.name})`,
        price: castDrinkMenu.price,
        quantity: 1,
        category: 'cast_drink',
        categoryId: castDrinkMenu.categoryId,
        castId,
        castName: cast.name,
        taxRate,
        serviceRate,
        setId: currentSet?.id,
        setNumber: currentSet?.setNumber || 1,
        orderTime: now(),
        date: todayKey(),
        cancelled: false,
        orderedBy: store.getCurrentUserId()
      });

      store.addAuditLog('cast_drink_order', { sessionId, tableId, castId, castName: cast.name });
      
      // Flash effect
      btn.style.borderColor = 'var(--gold)';
      btn.style.background = 'rgba(200,169,96,0.2)';
      setTimeout(() => {
        btn.style.borderColor = '';
        btn.style.background = '';
      }, 500);

      showToast(`${cast.name}のドリンクを注文しました`, 'success');
    });
  });
}
