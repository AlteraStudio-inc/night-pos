// ============================================
// Cast List Page - キャスト一覧画面
// ============================================
import { renderLayout, setPageTitle } from '../components/layout.js';
import { store } from '../store/index.js';
import { router } from '../router.js';
import { formatMoney, formatNumber, todayKey } from '../utils/format.js';
import { showModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export function renderCasts() {
  renderLayout('', 'casts');
  setPageTitle('キャスト一覧');

  const content = document.getElementById('page-content');
  const today = todayKey();
  const settings = store.getSettings();

  const casts = store.query('casts', c => c.active);

  // Gather stats for each cast
  const castData = casts.map(cast => {
    const attendance = store.query('cast_attendance', a => a.castId === cast.id && a.date === today)[0];
    const todayDrinks = store.query('order_items', oi => 
      oi.date === today && oi.castId === cast.id && oi.category === 'cast_drink' && !oi.cancelled
    );
    const drinkCount = todayDrinks.reduce((sum, d) => sum + (d.quantity || 0), 0);
    
    const nominations = store.query('nominations', n => n.castId === cast.id && n.date === today);
    const honshimeiCount = nominations.filter(n => n.type === 'honshimei').length;
    const banaiCount = nominations.filter(n => n.type === 'banai').length;
    const douhanCount = nominations.filter(n => n.type === 'douhan').length;

    return { cast, attendance, drinkCount, honshimeiCount, banaiCount, douhanCount };
  });

  content.innerHTML = `
    <div class="filter-bar">
      <div class="search-input">
        <i data-lucide="search"></i>
        <input type="text" class="form-input" id="cast-search" placeholder="キャスト名で検索...">
      </div>
      <div style="margin-left:auto;">
        <button class="btn btn-primary" id="add-cast-btn">
          <i data-lucide="user-plus"></i> キャスト追加
        </button>
      </div>
    </div>

    <div class="card">
      <table class="data-table">
        <thead>
          <tr>
            <th>キャスト名</th>
            <th class="text-center">出勤状況</th>
            <th class="text-center">本指名</th>
            <th class="text-center">場内指名</th>
            <th class="text-center">同伴</th>
            <th class="text-center">ドリンク</th>
            <th class="text-right">時給</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${castData.map(cd => `
            <tr style="cursor:pointer;" onclick="location.hash='#/casts/${cd.cast.id}'">
              <td>
                <div style="display:flex;align-items:center;gap:var(--space-md);">
                  <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold-dim));display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--bg-deepest);font-size:var(--text-sm);">
                    ${cd.cast.name.charAt(0)}
                  </div>
                  <strong>${cd.cast.name}</strong>
                </div>
              </td>
              <td class="text-center">
                ${cd.attendance 
                  ? (cd.attendance.clockOut 
                    ? '<span class="badge badge-completed">退勤済</span>'
                    : '<span class="badge badge-active">出勤中</span>')
                  : '<span class="badge badge-vacant">未出勤</span>'
                }
              </td>
              <td class="text-center"><strong style="color:${cd.honshimeiCount > 0 ? 'var(--gold-light)' : 'var(--text-tertiary)'};">${cd.honshimeiCount}</strong></td>
              <td class="text-center">${cd.banaiCount}</td>
              <td class="text-center">${cd.douhanCount}</td>
              <td class="text-center"><strong style="color:${cd.drinkCount > 0 ? 'var(--cyan)' : 'var(--text-tertiary)'};">${cd.drinkCount}</strong></td>
              <td class="text-right money">${formatMoney(cd.cast.hourlyRate)}/h</td>
              <td class="text-center"><i data-lucide="chevron-right" style="width:16px;height:16px;color:var(--text-tertiary);"></i></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  if (window.lucide) lucide.createIcons();

  // Search
  document.getElementById('cast-search')?.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    content.querySelectorAll('tbody tr').forEach(row => {
      const name = row.querySelector('strong')?.textContent?.toLowerCase() || '';
      row.style.display = name.includes(query) || !query ? '' : 'none';
    });
  });

  // Add cast
  document.getElementById('add-cast-btn')?.addEventListener('click', () => {
    const modalContent = `
      <div class="form-group">
        <label class="form-label">キャスト名 <span style="color:var(--danger)">*</span></label>
        <input type="text" class="form-input" id="modal-cast-name" placeholder="名前を入力">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-lg);">
        <div class="form-group">
          <label class="form-label">時給</label>
          <input type="number" class="form-input" id="modal-cast-hourly" value="${settings.defaultHourlyRate}" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">ドリンクバック単価</label>
          <input type="number" class="form-input" id="modal-cast-drink-back" value="${settings.drinkBackPrice}" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">シャンパンバック単価</label>
          <input type="number" class="form-input" id="modal-cast-champ-back" value="${settings.champagneBackPrice}" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">ワインバック単価</label>
          <input type="number" class="form-input" id="modal-cast-wine-back" value="${settings.wineBackPrice}" min="0">
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-secondary modal-cancel-btn">キャンセル</button>
      <button class="btn btn-primary" id="modal-save-cast">保存</button>
    `;

    const overlay = showModal({ title: 'キャスト追加', content: modalContent, footer });
    overlay.querySelector('.modal-cancel-btn')?.addEventListener('click', () => closeModal(overlay));
    overlay.querySelector('#modal-save-cast')?.addEventListener('click', () => {
      const name = overlay.querySelector('#modal-cast-name').value.trim();
      if (!name) { showToast('名前を入力してください', 'error'); return; }

      store.add('casts', {
        name,
        hourlyRate: parseInt(overlay.querySelector('#modal-cast-hourly').value) || settings.defaultHourlyRate,
        drinkBackPrice: parseInt(overlay.querySelector('#modal-cast-drink-back').value) || settings.drinkBackPrice,
        champagneBackPrice: parseInt(overlay.querySelector('#modal-cast-champ-back').value) || settings.champagneBackPrice,
        wineBackPrice: parseInt(overlay.querySelector('#modal-cast-wine-back').value) || settings.wineBackPrice,
        active: true
      });

      closeModal(overlay);
      showToast('キャストを追加しました', 'success');
      renderCasts();
    });
  });
}
