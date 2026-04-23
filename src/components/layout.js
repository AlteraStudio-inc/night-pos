// ============================================
// Layout Component - Sidebar + Header + Content
// ============================================
import { router } from '../router.js';
import { store } from '../store/index.js';
import { formatTime } from '../utils/format.js';

export function renderLayout(pageContent, activeNav = '') {
  const app = document.getElementById('app');
  const settings = store.getSettings();

  app.innerHTML = `
    <div class="app-layout">
      <!-- Sidebar -->
      <nav class="sidebar">
        <div class="sidebar-logo">
          <div class="logo-icon">N</div>
          <div>
            <span class="logo-text">${settings.storeName || 'Night POS'}</span>
            <span class="logo-sub">業務管理システム</span>
          </div>
        </div>
        <div class="sidebar-nav">
          <div class="nav-section">
            <div class="nav-section-label">メイン</div>
            <div class="nav-item ${activeNav === 'dashboard' ? 'active' : ''}" data-nav="/">
              <i data-lucide="layout-dashboard"></i>
              <span>ダッシュボード</span>
            </div>
            <div class="nav-item ${activeNav === 'tables' ? 'active' : ''}" data-nav="/tables">
              <i data-lucide="grid-3x3"></i>
              <span>卓一覧</span>
              <span class="nav-badge" id="active-tables-count" style="display:none"></span>
            </div>
          </div>
          <div class="nav-section">
            <div class="nav-section-label">キャスト</div>
            <div class="nav-item ${activeNav === 'casts' ? 'active' : ''}" data-nav="/casts">
              <i data-lucide="users"></i>
              <span>キャスト一覧</span>
            </div>
            <div class="nav-item ${activeNav === 'salary' ? 'active' : ''}" data-nav="/salary">
              <i data-lucide="calculator"></i>
              <span>給与計算</span>
            </div>
            <div class="nav-item ${activeNav === 'daily-pay' ? 'active' : ''}" data-nav="/daily-pay">
              <i data-lucide="wallet"></i>
              <span>日払い管理</span>
            </div>
            <div class="nav-item ${activeNav === 'sales' ? 'active' : ''}" data-nav="/sales">
              <i data-lucide="trending-up"></i>
              <span>売上管理</span>
            </div>
          </div>
          <div class="nav-section">
            <div class="nav-section-label">管理</div>
            <div class="nav-item ${activeNav === 'menu-mgmt' ? 'active' : ''}" data-nav="/menu-mgmt">
              <i data-lucide="book-open"></i>
              <span>メニュー管理</span>
            </div>
            <div class="nav-item ${activeNav === 'closing' ? 'active' : ''}" data-nav="/closing">
              <i data-lucide="clipboard-check"></i>
              <span>締め作業</span>
            </div>
            <div class="nav-item ${activeNav === 'settings' ? 'active' : ''}" data-nav="/settings">
              <i data-lucide="settings"></i>
              <span>設定</span>
            </div>
          </div>
        </div>
        <div style="padding: var(--space-lg); border-top: 1px solid var(--border-subtle);">
          <div class="nav-item" data-nav="/logout">
            <i data-lucide="log-out"></i>
            <span>ログアウト</span>
          </div>
        </div>
      </nav>

      <!-- Main Content -->
      <div class="main-wrapper">
        <header class="header">
          <h1 class="header-title" id="page-title"></h1>
          <div class="header-actions">
            <span class="header-clock" id="header-clock"></span>
            <div style="display:flex;align-items:center;gap:var(--space-sm);color:var(--text-secondary);">
              <i data-lucide="user" style="width:18px;height:18px"></i>
              <span id="current-user-name" style="font-size:var(--text-sm);font-weight:500;"></span>
            </div>
          </div>
        </header>
        <main class="main-content" id="page-content">
          ${pageContent}
        </main>
      </div>
    </div>
  `;

  // Nav click handlers
  app.querySelectorAll('.nav-item[data-nav]').forEach(item => {
    item.addEventListener('click', () => {
      const path = item.getAttribute('data-nav');
      if (path === '/logout') {
        sessionStorage.removeItem('nightpos_currentUser');
        router.navigate('/login');
        return;
      }
      router.navigate(path);
    });
  });

  // Update clock
  updateClock();
  
  // Update user name
  try {
    const user = JSON.parse(sessionStorage.getItem('nightpos_currentUser'));
    const nameEl = document.getElementById('current-user-name');
    if (nameEl && user) nameEl.textContent = user.displayName || user.username;
  } catch {}

  // Update active tables badge
  updateActiveTablesBadge();

  // Init icons
  if (window.lucide) lucide.createIcons();
}

function updateClock() {
  const clockEl = document.getElementById('header-clock');
  if (!clockEl) return;
  
  const update = () => {
    const now = new Date();
    clockEl.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };
  
  update();
  setInterval(update, 1000);
}

function updateActiveTablesBadge() {
  const badge = document.getElementById('active-tables-count');
  if (!badge) return;

  const sessions = store.query('table_sessions', s => 
    s.status === 'active' || s.status === 'extended' || s.status === 'billing'
  );

  if (sessions.length > 0) {
    badge.style.display = '';
    badge.textContent = sessions.length;
  } else {
    badge.style.display = 'none';
  }
}

export function setPageTitle(title) {
  const el = document.getElementById('page-title');
  if (el) el.textContent = title;
}
