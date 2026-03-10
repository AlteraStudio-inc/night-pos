// ============================================
// Menu Management Page - メニュー管理画面
// ============================================
import { renderLayout, setPageTitle } from '../components/layout.js';
import { store } from '../store/index.js';
import { formatMoney } from '../utils/format.js';
import { showModal, closeModal, showConfirm } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export function renderMenuMgmt() {
  renderLayout('', 'menu-mgmt');
  setPageTitle('メニュー管理');

  const content = document.getElementById('page-content');
  renderMenuContent(content);
}

function renderMenuContent(container) {
  const categories = store.query('menu_categories', c => true).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const menus = store.query('menus', m => m.active);

  let selectedCategory = 'all';

  function render() {
    const filtered = selectedCategory === 'all' ? menus : menus.filter(m => m.categoryId === selectedCategory);

    container.innerHTML = `
      <div class="filter-bar">
        <div class="search-input">
          <i data-lucide="search"></i>
          <input type="text" class="form-input" id="menu-search" placeholder="メニュー名で検索...">
        </div>
        <div class="filter-chip ${selectedCategory === 'all' ? 'active' : ''}" data-cat="all">すべて (${menus.length})</div>
        ${categories.map(c => {
          const count = menus.filter(m => m.categoryId === c.id).length;
          return `<div class="filter-chip ${selectedCategory === c.id ? 'active' : ''}" data-cat="${c.id}">${c.name} (${count})</div>`;
        }).join('')}
        <div style="margin-left:auto;display:flex;gap:var(--space-md);">
          <button class="btn btn-secondary" id="add-category-btn">
            <i data-lucide="folder-plus"></i> カテゴリ追加
          </button>
          <button class="btn btn-primary" id="add-menu-btn">
            <i data-lucide="plus-circle"></i> メニュー追加
          </button>
        </div>
      </div>

      <div class="card">
        <table class="data-table">
          <thead>
            <tr>
              <th>メニュー名</th>
              <th>カテゴリ</th>
              <th class="text-right">価格（税込）</th>
              <th>種別</th>
              <th class="text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(m => {
              const cat = store.getById('menu_categories', m.categoryId);
              const typeLabel = { cast_drink: 'キャストドリンク', champagne: 'シャンパン', wine: 'ワイン', menu: 'メニュー' }[m.category] || 'メニュー';
              return `
                <tr>
                  <td><strong>${m.name}</strong></td>
                  <td><span class="badge badge-vacant">${cat?.name || '-'}</span></td>
                  <td class="text-right money" style="font-weight:700;">${formatMoney(m.price)}</td>
                  <td><span style="font-size:var(--text-xs);color:var(--text-secondary);">${typeLabel}</span></td>
                  <td class="text-center">
                    <button class="btn btn-ghost btn-icon edit-menu" data-id="${m.id}" title="編集"><i data-lucide="edit-2" style="width:14px;height:14px;"></i></button>
                    <button class="btn btn-ghost btn-icon delete-menu" data-id="${m.id}" title="無効化"><i data-lucide="trash-2" style="width:14px;height:14px;color:var(--danger);"></i></button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        ${filtered.length === 0 ? '<div class="empty-state"><p>メニューがありません</p></div>' : ''}
      </div>
    `;

    if (window.lucide) lucide.createIcons();

    // Category filter
    container.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => { selectedCategory = chip.dataset.cat; render(); });
    });

    // Search
    container.querySelector('#menu-search')?.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      container.querySelectorAll('tbody tr').forEach(row => {
        const name = row.querySelector('strong')?.textContent?.toLowerCase() || '';
        row.style.display = name.includes(q) || !q ? '' : 'none';
      });
    });

    // Add menu
    container.querySelector('#add-menu-btn')?.addEventListener('click', () => showMenuModal(null, container));

    // Add category
    container.querySelector('#add-category-btn')?.addEventListener('click', () => {
      const catContent = `
        <div class="form-group">
          <label class="form-label">カテゴリ名</label>
          <input type="text" class="form-input" id="modal-cat-name" placeholder="カテゴリ名">
        </div>
        <div class="form-group">
          <label class="form-label">表示順</label>
          <input type="number" class="form-input" id="modal-cat-order" value="${categories.length + 1}">
        </div>
      `;
      const footer = `<button class="btn btn-secondary modal-cancel-btn">キャンセル</button><button class="btn btn-primary" id="modal-save-cat">保存</button>`;
      const overlay = showModal({ title: 'カテゴリ追加', content: catContent, footer });
      overlay.querySelector('.modal-cancel-btn')?.addEventListener('click', () => closeModal(overlay));
      overlay.querySelector('#modal-save-cat')?.addEventListener('click', () => {
        const name = overlay.querySelector('#modal-cat-name').value.trim();
        if (!name) { showToast('名前を入力してください', 'error'); return; }
        store.add('menu_categories', { name, sortOrder: parseInt(overlay.querySelector('#modal-cat-order').value) || 0 });
        closeModal(overlay);
        showToast('カテゴリを追加しました', 'success');
        renderMenuContent(container);
      });
    });

    // Edit menu
    container.querySelectorAll('.edit-menu').forEach(btn => {
      btn.addEventListener('click', () => {
        const menu = store.getById('menus', btn.dataset.id);
        if (menu) showMenuModal(menu, container);
      });
    });

    // Delete menu
    container.querySelectorAll('.delete-menu').forEach(btn => {
      btn.addEventListener('click', async () => {
        const confirmed = await showConfirm({ title: 'メニュー無効化', message: 'このメニューを無効化しますか？', type: 'danger', confirmText: '無効化' });
        if (confirmed) {
          store.update('menus', btn.dataset.id, { active: false });
          showToast('メニューを無効化しました', 'warning');
          renderMenuContent(container);
        }
      });
    });
  }

  render();
}

function showMenuModal(menu, mainContainer) {
  const categories = store.query('menu_categories', c => true).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const isEdit = !!menu;

  const modalContent = `
    <div class="form-group">
      <label class="form-label">メニュー名 <span style="color:var(--danger)">*</span></label>
      <input type="text" class="form-input" id="modal-menu-name" value="${isEdit ? menu.name : ''}" placeholder="メニュー名">
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-lg);">
      <div class="form-group">
        <label class="form-label">価格（税込） <span style="color:var(--danger)">*</span></label>
        <input type="number" class="form-input" id="modal-menu-price" value="${isEdit ? menu.price : ''}" min="0" placeholder="0">
      </div>
      <div class="form-group">
        <label class="form-label">カテゴリ</label>
        <select class="form-select" id="modal-menu-cat">
          ${categories.map(c => `<option value="${c.id}" ${isEdit && menu.categoryId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">種別</label>
      <select class="form-select" id="modal-menu-type">
        <option value="menu" ${isEdit && menu.category === 'menu' ? 'selected' : ''}>通常メニュー</option>
        <option value="cast_drink" ${isEdit && menu.category === 'cast_drink' ? 'selected' : ''}>キャストドリンク</option>
        <option value="champagne" ${isEdit && menu.category === 'champagne' ? 'selected' : ''}>シャンパン</option>
        <option value="wine" ${isEdit && menu.category === 'wine' ? 'selected' : ''}>ワイン</option>
      </select>
    </div>
  `;

  const footer = `
    <button class="btn btn-secondary modal-cancel-btn">キャンセル</button>
    <button class="btn btn-primary" id="modal-save-menu">${isEdit ? '更新' : '追加'}</button>
  `;

  const overlay = showModal({ title: isEdit ? 'メニュー編集' : 'メニュー追加', content: modalContent, footer });
  overlay.querySelector('.modal-cancel-btn')?.addEventListener('click', () => closeModal(overlay));

  overlay.querySelector('#modal-save-menu')?.addEventListener('click', () => {
    const name = overlay.querySelector('#modal-menu-name').value.trim();
    const price = parseInt(overlay.querySelector('#modal-menu-price').value);
    const categoryId = overlay.querySelector('#modal-menu-cat').value;
    const category = overlay.querySelector('#modal-menu-type').value;

    if (!name) { showToast('メニュー名を入力してください', 'error'); return; }
    if (!price || price < 0) { showToast('正しい価格を入力してください', 'error'); return; }

    if (isEdit) {
      store.update('menus', menu.id, { name, price, categoryId, category });
    } else {
      store.add('menus', { name, price, categoryId, category, active: true });
    }

    closeModal(overlay);
    showToast(isEdit ? 'メニューを更新しました' : 'メニューを追加しました', 'success');
    renderMenuContent(mainContainer);
  });
}
