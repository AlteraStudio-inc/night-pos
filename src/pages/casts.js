// ============================================
// Cast List Page - キャスト一覧画面
// ============================================
import { renderLayout, setPageTitle } from '../components/layout.js';
import { store } from '../store/index.js';
import { router } from '../router.js';
import { formatMoney, formatTime, todayKey } from '../utils/format.js';
import { showModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

export function renderCasts() {
  renderLayout('', 'casts');
  setPageTitle('キャスト一覧');

  const content = document.getElementById('page-content');
  const today = todayKey();

  const casts = store.query('casts', c => c.active);

  // 出退勤情報を集計
  const castData = casts.map(cast => {
    const attendance = store.query('cast_attendance', a => a.castId === cast.id && a.date === today)[0];

    let workingHours = 0;
    if (attendance?.clockIn) {
      const start = new Date(attendance.clockIn);
      const end = attendance.clockOut ? new Date(attendance.clockOut) : new Date();
      workingHours = (end - start) / (1000 * 60 * 60);
    }

    return { cast, attendance, workingHours };
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
            <th class="text-center">ステータス</th>
            <th class="text-center">出勤時間</th>
            <th class="text-center">退勤時間</th>
            <th class="text-right">本日の労働時間</th>
            <th class="text-right">時給</th>
            <th class="text-center">出退勤操作</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${castData.map(cd => {
            const clockInLabel = cd.attendance?.clockIn ? formatTime(cd.attendance.clockIn) : '-';
            const clockOutLabel = cd.attendance?.clockOut ? formatTime(cd.attendance.clockOut) : (cd.attendance ? '勤務中' : '-');
            const hoursLabel = cd.attendance?.clockIn ? `${cd.workingHours.toFixed(1)}h` : '-';
            let statusBadge = '<span class="badge badge-vacant">未出勤</span>';
            if (cd.attendance) {
              statusBadge = cd.attendance.clockOut
                ? '<span class="badge badge-completed">退勤済</span>'
                : '<span class="badge badge-active">出勤中</span>';
            }
            // 出退勤操作ボタン
            let actionBtn = '';
            if (!cd.attendance) {
              actionBtn = `<button class="btn btn-ghost btn-icon cast-clockin-btn" data-cast-id="${cd.cast.id}" title="出勤時間を選択" style="color:#ffffff;"><i data-lucide="clock" style="width:18px;height:18px;color:#ffffff;"></i></button>`;
            } else if (!cd.attendance.clockOut) {
              actionBtn = `<button class="btn btn-ghost btn-icon cast-clockout-btn" data-cast-id="${cd.cast.id}" data-attendance-id="${cd.attendance.id}" title="退勤時間を選択" style="color:#ffffff;"><i data-lucide="clock" style="width:18px;height:18px;color:#ffffff;"></i></button>`;
            } else {
              actionBtn = '<span style="color:var(--text-tertiary);font-size:var(--text-xs);">完了</span>';
            }
            return `
            <tr class="cast-row" data-cast-id="${cd.cast.id}" style="cursor:pointer;">
              <td data-link="1">
                <div style="display:flex;align-items:center;gap:var(--space-md);">
                  <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold-dim));display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--bg-deepest);font-size:var(--text-sm);">
                    ${cd.cast.name.charAt(0)}
                  </div>
                  <strong>${cd.cast.name}</strong>
                </div>
              </td>
              <td class="text-center" data-link="1">${statusBadge}</td>
              <td class="text-center" data-link="1" style="font-family:var(--font-mono);">${clockInLabel}</td>
              <td class="text-center" data-link="1" style="font-family:var(--font-mono);color:${cd.attendance && !cd.attendance.clockOut ? 'var(--cyan)' : 'var(--text-primary)'};">${clockOutLabel}</td>
              <td class="text-right" data-link="1" style="font-family:var(--font-mono);font-weight:700;">${hoursLabel}</td>
              <td class="text-right money" data-link="1">${formatMoney(cd.cast.hourlyRate || 0)}/h</td>
              <td class="text-center cast-action-cell">${actionBtn}</td>
              <td class="text-center" data-link="1"><i data-lucide="chevron-right" style="width:16px;height:16px;color:var(--text-tertiary);"></i></td>
            </tr>
          `;}).join('')}
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

  // 行クリックで詳細へ遷移（操作セルクリック時は除外）
  content.querySelectorAll('.cast-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.cast-action-cell')) return;
      const castId = row.dataset.castId;
      location.hash = `#/casts/${castId}`;
    });
  });

  // 出勤時計ボタン
  content.querySelectorAll('.cast-clockin-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const castId = btn.dataset.castId;
      const cast = store.getById('casts', castId);
      if (!cast) return;
      showClockInModal(cast);
    });
  });

  // 退勤時計ボタン
  content.querySelectorAll('.cast-clockout-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const castId = btn.dataset.castId;
      const attendanceId = btn.dataset.attendanceId;
      const cast = store.getById('casts', castId);
      if (!cast) return;
      showClockOutModal(cast, attendanceId);
    });
  });

  // Add cast
  document.getElementById('add-cast-btn')?.addEventListener('click', () => {
    const modalContent = `
      <div class="form-group">
        <label class="form-label">キャスト名 <span style="color:var(--danger)">*</span></label>
        <input type="text" class="form-input" id="modal-cast-name" placeholder="名前を入力">
      </div>
      <p style="font-size:var(--text-sm);color:var(--text-tertiary);margin-bottom:var(--space-md);">給与設定はキャスト単位で管理されます。全項目デフォルト値は0円です。必要に応じて入力してください。</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-lg);">
        <div class="form-group">
          <label class="form-label">時給</label>
          <input type="number" class="form-input" id="modal-cast-hourly" value="0" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">ドリンクバック</label>
          <input type="number" class="form-input" id="modal-cast-drink-back" value="0" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">シャンパンバック</label>
          <input type="number" class="form-input" id="modal-cast-champ-back" value="0" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">ワインバック</label>
          <input type="number" class="form-input" id="modal-cast-wine-back" value="0" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">指名バック</label>
          <input type="number" class="form-input" id="modal-cast-nom-back" value="0" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">場内バック</label>
          <input type="number" class="form-input" id="modal-cast-banai-back" value="0" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">同伴バック</label>
          <input type="number" class="form-input" id="modal-cast-douhan-back" value="0" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">ボトルバック</label>
          <input type="number" class="form-input" id="modal-cast-bottle-back" value="0" min="0">
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
        hourlyRate: parseInt(overlay.querySelector('#modal-cast-hourly').value) || 0,
        drinkBackPrice: parseInt(overlay.querySelector('#modal-cast-drink-back').value) || 0,
        champagneBackPrice: parseInt(overlay.querySelector('#modal-cast-champ-back').value) || 0,
        wineBackPrice: parseInt(overlay.querySelector('#modal-cast-wine-back').value) || 0,
        nominationBackPrice: parseInt(overlay.querySelector('#modal-cast-nom-back').value) || 0,
        banaiBackPrice: parseInt(overlay.querySelector('#modal-cast-banai-back').value) || 0,
        douhanBackPrice: parseInt(overlay.querySelector('#modal-cast-douhan-back').value) || 0,
        bottleBackPrice: parseInt(overlay.querySelector('#modal-cast-bottle-back').value) || 0,
        active: true
      });

      closeModal(overlay);
      showToast('キャストを追加しました', 'success');
      renderCasts();
    });
  });
}

// 出勤モーダル
function showClockInModal(cast) {
  const today = todayKey();
  const nowDate = new Date();
  const defaultTime = `${String(nowDate.getHours()).padStart(2, '0')}:${String(nowDate.getMinutes()).padStart(2, '0')}`;

  const timeContent = `
    <div class="form-group">
      <label class="form-label">出勤時間を選択してください</label>
      <input type="time" class="form-input form-input-lg" id="modal-clockin-time" value="${defaultTime}" style="font-size:var(--text-2xl);text-align:center;">
    </div>
    <p style="font-size:var(--text-sm);color:var(--text-tertiary);">デフォルトは現在時刻です。過去の時刻も設定できます。</p>
  `;
  const timeFooter = `
    <button class="btn btn-secondary modal-cancel-btn">キャンセル</button>
    <button class="btn btn-accent btn-lg" id="modal-clockin-confirm"><i data-lucide="log-in"></i> 出勤を記録</button>
  `;

  const overlay = showModal({ title: `${cast.name} - 出勤時間`, content: timeContent, footer: timeFooter });
  if (window.lucide) lucide.createIcons();

  overlay.querySelector('.modal-cancel-btn')?.addEventListener('click', () => closeModal(overlay));
  overlay.querySelector('#modal-clockin-confirm')?.addEventListener('click', () => {
    const timeVal = overlay.querySelector('#modal-clockin-time').value;
    const [h, m] = timeVal.split(':').map(Number);
    const clockInDate = new Date();
    clockInDate.setHours(h, m, 0, 0);

    store.add('cast_attendance', {
      castId: cast.id,
      castName: cast.name,
      date: today,
      clockIn: clockInDate.toISOString(),
      clockOut: null,
      hourlyRate: cast.hourlyRate || 0,
      hasHonshimei: false,
      dailyPayments: 0
    });
    store.addAuditLog('cast_clock_in', { castId: cast.id, castName: cast.name, clockIn: clockInDate.toISOString() });
    closeModal(overlay);
    showToast(`${cast.name}が出勤しました（${timeVal}）`, 'success');
    renderCasts();
  });
}

// 退勤モーダル
function showClockOutModal(cast, attendanceId) {
  const attendance = store.getById('cast_attendance', attendanceId);
  if (!attendance) return;

  const nowDate = new Date();
  const defaultTime = `${String(nowDate.getHours()).padStart(2, '0')}:${String(nowDate.getMinutes()).padStart(2, '0')}`;

  const timeContent = `
    <div class="form-group">
      <label class="form-label">退勤時間を選択してください</label>
      <input type="time" class="form-input form-input-lg" id="modal-clockout-time" value="${defaultTime}" style="font-size:var(--text-2xl);text-align:center;">
    </div>
    <p style="font-size:var(--text-sm);color:var(--text-tertiary);">デフォルトは現在時刻です。</p>
  `;
  const timeFooter = `
    <button class="btn btn-secondary modal-cancel-btn">キャンセル</button>
    <button class="btn btn-danger btn-lg" id="modal-clockout-confirm"><i data-lucide="log-out"></i> 退勤を記録</button>
  `;

  const overlay = showModal({ title: `${cast.name} - 退勤時間`, content: timeContent, footer: timeFooter });
  if (window.lucide) lucide.createIcons();

  overlay.querySelector('.modal-cancel-btn')?.addEventListener('click', () => closeModal(overlay));
  overlay.querySelector('#modal-clockout-confirm')?.addEventListener('click', () => {
    const timeVal = overlay.querySelector('#modal-clockout-time').value;
    const [h, m] = timeVal.split(':').map(Number);
    const clockOutDate = new Date();
    clockOutDate.setHours(h, m, 0, 0);

    store.update('cast_attendance', attendanceId, {
      clockOut: clockOutDate.toISOString()
    });
    store.addAuditLog('cast_clock_out', { castId: cast.id, castName: cast.name, clockOut: clockOutDate.toISOString() });
    closeModal(overlay);
    showToast(`${cast.name}が退勤しました（${timeVal}）`, 'success');
    renderCasts();
  });
}
