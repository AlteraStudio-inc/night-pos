// ============================================
// Dashboard Page
// ============================================
import { renderLayout, setPageTitle } from '../components/layout.js';
import { store } from '../store/index.js';
import { formatMoney, formatNumber, todayKey } from '../utils/format.js';
import { router } from '../router.js';

export function renderDashboard() {
  renderLayout('', 'dashboard');
  setPageTitle('ダッシュボード');

  const content = document.getElementById('page-content');
  const today = todayKey();
  const settings = store.getSettings();

  // Collect today's data
  const sessions = store.query('table_sessions', s => s.date === today);
  const activeSessions = sessions.filter(s => s.status === 'active' || s.status === 'extended');
  const billingSessions = sessions.filter(s => s.status === 'billing');
  const completedSessions = sessions.filter(s => s.status === 'completed');

  const payments = store.query('payment_records', p => p.date === today);
  const totalSales = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const cashSales = payments.filter(p => p.method === 'cash').reduce((sum, p) => sum + (p.amount || 0), 0);
  const cardSales = payments.filter(p => p.method === 'card').reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalGuests = sessions.reduce((sum, s) => sum + (s.guestCount || 0), 0);

  // Today's order items
  const todayOrders = store.query('order_items', oi => oi.date === today && !oi.cancelled);
  const castDrinkCount = todayOrders.filter(oi => oi.category === 'cast_drink').reduce((sum, oi) => sum + (oi.quantity || 0), 0);
  const champagneCount = todayOrders.filter(oi => oi.category === 'champagne').reduce((sum, oi) => sum + (oi.quantity || 0), 0);

  const nominations = store.query('nominations', n => n.date === today);
  const honshimeiCount = nominations.filter(n => n.type === 'honshimei').length;
  const douhanCount = nominations.filter(n => n.type === 'douhan').length;

  content.innerHTML = `
    <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr);">
      <div class="stat-card stat-highlight">
        <div class="stat-label">本日売上</div>
        <div class="stat-value">${formatMoney(totalSales)}</div>
        <div class="stat-sub">現金 ${formatMoney(cashSales)} / カード ${formatMoney(cardSales)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">入店中</div>
        <div class="stat-value" style="color:var(--status-active-text)">${activeSessions.length}</div>
        <div class="stat-sub">会計待ち ${billingSessions.length}卓</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">来店組数</div>
        <div class="stat-value">${sessions.length}</div>
        <div class="stat-sub">来店人数 ${formatNumber(totalGuests)}名</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">本指名</div>
        <div class="stat-value" style="color:var(--gold-light)">${honshimeiCount}</div>
        <div class="stat-sub">同伴 ${douhanCount}件</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-xl);">
      <!-- Quick Actions -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="zap" style="width:18px;height:18px;color:var(--gold)"></i> クイックアクション</h3>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md);">
          <button class="btn btn-primary btn-lg w-full" onclick="location.hash='#/tables'">
            <i data-lucide="grid-3x3"></i> 卓一覧
          </button>
          <button class="btn btn-accent btn-lg w-full" onclick="location.hash='#/casts'">
            <i data-lucide="users"></i> キャスト
          </button>
          <button class="btn btn-secondary btn-lg w-full" onclick="location.hash='#/sales'">
            <i data-lucide="trending-up"></i> 売上管理
          </button>
          <button class="btn btn-secondary btn-lg w-full" onclick="location.hash='#/closing'">
            <i data-lucide="clipboard-check"></i> 締め作業
          </button>
        </div>
      </div>

      <!-- Today's Summary -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="bar-chart-3" style="width:18px;height:18px;color:var(--cyan)"></i> 本日のサマリー</h3>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-md);">
          <div style="padding:var(--space-md);background:var(--bg-elevated);border-radius:var(--radius-md);">
            <div style="font-size:var(--text-xs);color:var(--text-tertiary);margin-bottom:4px;">会計済み</div>
            <div style="font-size:var(--text-xl);font-weight:700;">${completedSessions.length}<span style="font-size:var(--text-sm);color:var(--text-secondary);"> 組</span></div>
          </div>
          <div style="padding:var(--space-md);background:var(--bg-elevated);border-radius:var(--radius-md);">
            <div style="font-size:var(--text-xs);color:var(--text-tertiary);margin-bottom:4px;">キャストドリンク</div>
            <div style="font-size:var(--text-xl);font-weight:700;">${castDrinkCount}<span style="font-size:var(--text-sm);color:var(--text-secondary);"> 杯</span></div>
          </div>
          <div style="padding:var(--space-md);background:var(--bg-elevated);border-radius:var(--radius-md);">
            <div style="font-size:var(--text-xs);color:var(--text-tertiary);margin-bottom:4px;">シャンパン</div>
            <div style="font-size:var(--text-xl);font-weight:700;">${champagneCount}<span style="font-size:var(--text-sm);color:var(--text-secondary);"> 本</span></div>
          </div>
          <div style="padding:var(--space-md);background:var(--bg-elevated);border-radius:var(--radius-md);">
            <div style="font-size:var(--text-xs);color:var(--text-tertiary);margin-bottom:4px;">同伴</div>
            <div style="font-size:var(--text-xl);font-weight:700;">${douhanCount}<span style="font-size:var(--text-sm);color:var(--text-secondary);"> 件</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Active Tables -->
    ${activeSessions.length > 0 ? `
    <div class="card mt-xl">
      <div class="card-header">
        <h3 class="card-title"><i data-lucide="activity" style="width:18px;height:18px;color:var(--status-active-text)"></i> 現在入店中の卓</h3>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>卓番号</th>
            <th>人数</th>
            <th>入店時間</th>
            <th>セット</th>
            <th>状態</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${activeSessions.map(s => {
            const table = store.getById('tables', s.tableId);
            const elapsed = Math.floor((Date.now() - new Date(s.entryTime).getTime()) / 60000);
            return `
              <tr style="cursor:pointer" onclick="location.hash='#/tables/${s.tableId}'">
                <td><strong style="font-size:var(--text-lg);">${table?.number || '-'}番</strong></td>
                <td>${s.guestCount}名</td>
                <td style="font-family:var(--font-mono);">${new Date(s.entryTime).getHours()}:${String(new Date(s.entryTime).getMinutes()).padStart(2, '0')}</td>
                <td>${s.setType === 'first' ? '初回' : '通常'}</td>
                <td><span class="badge ${s.status === 'extended' ? 'badge-extended' : 'badge-active'}">${s.status === 'extended' ? '延長中' : '入店中'}</span></td>
                <td><span style="font-family:var(--font-mono);color:var(--text-tertiary);">${elapsed}分</span></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}
  `;

  if (window.lucide) lucide.createIcons();
}
