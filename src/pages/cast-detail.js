// ============================================
// Cast Detail Page - キャスト詳細画面
// ============================================
import { renderLayout, setPageTitle } from '../components/layout.js';
import { store } from '../store/index.js';
import { router } from '../router.js';
import { formatMoney, formatTime, formatDate, todayKey, now } from '../utils/format.js';
import { calcCastDailyPay } from '../utils/calc.js';
import { showToast } from '../components/toast.js';
import { showConfirm, showModal, closeModal } from '../components/modal.js';

export function renderCastDetail(params) {
  const castId = params.id;
  const cast = store.getById('casts', castId);
  if (!cast) { router.navigate('/casts'); return; }

  renderLayout('', 'casts');
  setPageTitle(cast.name);

  const content = document.getElementById('page-content');
  const today = todayKey();
  const settings = store.getSettings();

  const attendance = store.query('cast_attendance', a => a.castId === castId && a.date === today)[0];
  
  // Today's drink backs
  const todayDrinks = store.query('order_items', oi => oi.date === today && oi.castId === castId && !oi.cancelled);
  const drinkItems = todayDrinks.filter(oi => oi.category === 'cast_drink');
  const champItems = todayDrinks.filter(oi => oi.category === 'champagne');
  const wineItems = todayDrinks.filter(oi => oi.category === 'wine');

  const backItems = [
    ...drinkItems.map(d => ({ type: 'drink', quantity: d.quantity, backPrice: cast.drinkBackPrice })),
    ...champItems.map(d => ({ type: 'champagne', quantity: d.quantity, backPrice: cast.champagneBackPrice })),
    ...wineItems.map(d => ({ type: 'wine', quantity: d.quantity, backPrice: cast.wineBackPrice }))
  ];

  // Check if honshimei today
  const nominations = store.query('nominations', n => n.castId === castId && n.date === today);
  const hasHonshimei = nominations.some(n => n.type === 'honshimei');

  const attendanceWithMeta = attendance ? { ...attendance, hasHonshimei } : null;
  const payCalc = attendanceWithMeta ? calcCastDailyPay(attendanceWithMeta, backItems, settings) : null;

  // Daily payments
  const dailyPayments = store.query('cast_payments', p => p.castId === castId && p.date === today);
  const totalDailyPaid = dailyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Recent nomination history
  const recentNominations = store.query('nominations', n => n.castId === castId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20);

  content.innerHTML = `
    <div style="margin-bottom:var(--space-lg);">
      <button class="btn btn-ghost" onclick="location.hash='#/casts'">
        <i data-lucide="arrow-left"></i> キャスト一覧へ戻る
      </button>
    </div>

    <div class="detail-layout">
      <div class="detail-main">
        <!-- Profile -->
        <div class="card mb-xl">
          <div style="display:flex;align-items:center;gap:var(--space-xl);">
            <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold-dim));display:flex;align-items:center;justify-content:center;font-size:var(--text-2xl);font-weight:800;color:var(--bg-deepest);">
              ${cast.name.charAt(0)}
            </div>
            <div>
              <h2 style="font-size:var(--text-2xl);font-weight:700;">${cast.name}</h2>
              <div style="display:flex;gap:var(--space-lg);margin-top:var(--space-sm);font-size:var(--text-sm);color:var(--text-secondary);">
                <span>時給 <strong style="color:var(--text-primary);">${formatMoney(cast.hourlyRate)}</strong></span>
                <span>ドリンクバック <strong style="color:var(--text-primary);">${formatMoney(cast.drinkBackPrice)}</strong></span>
                <span>シャンパンバック <strong style="color:var(--text-primary);">${formatMoney(cast.champagneBackPrice)}</strong></span>
              </div>
            </div>
            <div style="margin-left:auto;display:flex;gap:var(--space-md);">
              ${!attendance ? `
                <button class="btn btn-accent btn-lg" id="btn-clock-in">
                  <i data-lucide="log-in"></i> 出勤
                </button>
              ` : !attendance.clockOut ? `
                <button class="btn btn-danger btn-lg" id="btn-clock-out">
                  <i data-lucide="log-out"></i> 退勤
                </button>
              ` : `
                <span class="badge badge-completed" style="font-size:var(--text-sm);padding:var(--space-sm) var(--space-lg);">退勤済み</span>
              `}
            </div>
          </div>
        </div>

        <!-- Today's Stats -->
        <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);">
          <div class="stat-card">
            <div class="stat-label">本指名</div>
            <div class="stat-value" style="color:var(--gold-light);">${nominations.filter(n => n.type === 'honshimei').length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">場内指名</div>
            <div class="stat-value">${nominations.filter(n => n.type === 'banai').length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">同伴</div>
            <div class="stat-value">${nominations.filter(n => n.type === 'douhan').length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">ドリンク</div>
            <div class="stat-value" style="color:var(--cyan);">${drinkItems.reduce((s, d) => s + d.quantity, 0)}</div>
          </div>
        </div>

        <!-- Pay Calculation -->
        ${payCalc ? `
        <div class="card mb-xl">
          <div class="card-header">
            <h3 class="card-title"><i data-lucide="calculator" style="width:18px;height:18px;color:var(--gold)"></i> 本日の給与明細</h3>
            ${payCalc.hasSlide ? '<span class="badge badge-gold">スライド適用</span>' : ''}
          </div>
          <div class="billing-summary" style="border:none;">
            <div class="billing-row">
              <span class="billing-label">基本時給</span>
              <span class="billing-value">${formatMoney(payCalc.hourlyRate)}/h ${payCalc.hasSlide ? '(スライド+' + formatMoney(settings.slideAmount) + ')' : ''}</span>
            </div>
            <div class="billing-row">
              <span class="billing-label">勤務時間</span>
              <span class="billing-value">${payCalc.hoursWorked.toFixed(1)}時間</span>
            </div>
            <div class="billing-row">
              <span class="billing-label">時給合計</span>
              <span class="billing-value">${formatMoney(payCalc.basePay)}</span>
            </div>
            ${payCalc.drinkBack > 0 ? `<div class="billing-row"><span class="billing-label">ドリンクバック</span><span class="billing-value">${formatMoney(payCalc.drinkBack)}</span></div>` : ''}
            ${payCalc.champagneBack > 0 ? `<div class="billing-row"><span class="billing-label">シャンパンバック</span><span class="billing-value">${formatMoney(payCalc.champagneBack)}</span></div>` : ''}
            ${payCalc.wineBack > 0 ? `<div class="billing-row"><span class="billing-label">ワインバック</span><span class="billing-value">${formatMoney(payCalc.wineBack)}</span></div>` : ''}
            <div class="billing-row">
              <span class="billing-label">総支給額</span>
              <span class="billing-value">${formatMoney(payCalc.grossPay)}</span>
            </div>
            ${totalDailyPaid > 0 ? `<div class="billing-row"><span class="billing-label" style="color:var(--danger);">日払い済み</span><span class="billing-value" style="color:var(--danger);">-${formatMoney(totalDailyPaid)}</span></div>` : ''}
            <div class="billing-row billing-total">
              <span class="billing-label">差引支給額</span>
              <span class="billing-value">${formatMoney(payCalc.grossPay - totalDailyPaid)}</span>
            </div>
          </div>
        </div>
        ` : ''}
      </div>

      <!-- Sidebar -->
      <div class="detail-side">
        ${attendance && !attendance.clockOut ? `
        <div class="card mb-xl">
          <div class="card-header">
            <h3 class="card-title">日払い</h3>
          </div>
          <div class="form-group">
            <input type="number" class="form-input form-input-lg" id="daily-pay-amount" placeholder="金額を入力" min="0">
          </div>
          <button class="btn btn-primary w-full" id="btn-daily-pay">
            <i data-lucide="wallet"></i> 日払い処理
          </button>
          ${dailyPayments.length > 0 ? `
          <div style="margin-top:var(--space-lg);padding-top:var(--space-lg);border-top:1px solid var(--border-subtle);">
            <div style="font-size:var(--text-xs);color:var(--text-tertiary);margin-bottom:var(--space-sm);">本日の日払い履歴</div>
            ${dailyPayments.map(p => `
              <div style="display:flex;justify-content:space-between;padding:var(--space-sm) 0;font-size:var(--text-sm);">
                <span style="color:var(--text-secondary);">${formatTime(p.createdAt)}</span>
                <span class="font-mono font-bold">${formatMoney(p.amount)}</span>
              </div>
            `).join('')}
            <div style="display:flex;justify-content:space-between;padding-top:var(--space-sm);border-top:1px solid var(--border-subtle);font-weight:700;">
              <span>合計</span>
              <span class="font-mono">${formatMoney(totalDailyPaid)}</span>
            </div>
          </div>
          ` : ''}
        </div>
        ` : ''}

        <!-- Nomination History -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">指名履歴</h3>
          </div>
          ${recentNominations.length > 0 ? `
            ${recentNominations.map(n => {
              const typeLabel = { honshimei: '本指名', banai: '場内', douhan: '同伴' }[n.type];
              const typeBadge = n.type === 'honshimei' ? 'badge-gold' : n.type === 'douhan' ? 'badge-active' : 'badge-vacant';
              return `
                <div style="display:flex;align-items:center;gap:var(--space-md);padding:var(--space-sm) 0;border-bottom:1px solid var(--border-subtle);">
                  <span class="badge ${typeBadge}">${typeLabel}</span>
                  <span style="font-size:var(--text-xs);color:var(--text-tertiary);">${formatDate(n.date)}</span>
                </div>
              `;
            }).join('')}
          ` : '<p style="font-size:var(--text-sm);color:var(--text-tertiary);">指名履歴がありません</p>'}
        </div>
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();

  // Clock in
  document.getElementById('btn-clock-in')?.addEventListener('click', () => {
    store.add('cast_attendance', {
      castId,
      date: today,
      clockIn: now(),
      clockOut: null,
      hourlyRate: cast.hourlyRate,
      hasHonshimei: false,
      dailyPayments: 0
    });
    store.addAuditLog('cast_clock_in', { castId, castName: cast.name });
    showToast(`${cast.name}が出勤しました`, 'success');
    renderCastDetail(params);
  });

  // Clock out
  document.getElementById('btn-clock-out')?.addEventListener('click', async () => {
    const confirmed = await showConfirm({
      title: '退勤確認',
      message: `${cast.name}を退勤させますか？`,
      subMessage: payCalc ? `本日の給与: ${formatMoney(payCalc.grossPay - totalDailyPaid)}` : '',
      confirmText: '退勤する'
    });
    if (confirmed) {
      store.update('cast_attendance', attendance.id, { 
        clockOut: now(), 
        hasHonshimei,
        finalPay: payCalc ? payCalc.grossPay - totalDailyPaid : 0
      });
      store.addAuditLog('cast_clock_out', { castId, castName: cast.name });
      showToast(`${cast.name}が退勤しました`, 'success');
      renderCastDetail(params);
    }
  });

  // Daily pay
  document.getElementById('btn-daily-pay')?.addEventListener('click', async () => {
    const amountInput = document.getElementById('daily-pay-amount');
    const amount = parseInt(amountInput?.value);
    if (!amount || amount <= 0) { showToast('正しい金額を入力してください', 'error'); return; }

    const confirmed = await showConfirm({
      title: '日払い確認',
      message: `${cast.name}に${formatMoney(amount)}を日払いしますか？`,
      type: 'warning',
      confirmText: '日払い実行'
    });
    if (confirmed) {
      store.add('cast_payments', {
        castId,
        date: today,
        amount,
        type: 'daily',
        processedBy: store.getCurrentUserId()
      });
      store.addAuditLog('daily_payment', { castId, castName: cast.name, amount });
      showToast(`${formatMoney(amount)}を日払いしました`, 'success');
      renderCastDetail(params);
    }
  });
}
