// ============================================
// Night POS - Main Entry
// ============================================
import './styles/index.css';
import './styles/tablet.css';
import { router } from './router.js';
import { store } from './store/index.js';

// Page imports
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderTables } from './pages/tables.js';
import { renderTableDetail } from './pages/table-detail.js';
import { renderTabletOrder } from './pages/tablet-order.js';
import { renderBilling } from './pages/billing.js';
// counter page removed - functionality integrated into tables page
import { renderCasts } from './pages/casts.js';
import { renderCastDetail } from './pages/cast-detail.js';
import { renderSalary } from './pages/salary.js';
import { renderDailyPay } from './pages/daily-pay.js';
import { renderSales } from './pages/sales.js';
import { renderMenuMgmt } from './pages/menu-mgmt.js';
import { renderClosing } from './pages/closing.js';
import { renderSettings } from './pages/settings.js';

// Initialize default data
store.initDefaultData();

// Auth guard
router.beforeEach = (path) => {
  // タブレット注文画面は認証不要
  if (path === '/login' || path.startsWith('/tablet')) return true;
  const user = sessionStorage.getItem('nightpos_currentUser');
  if (!user) {
    router.navigate('/login');
    return false;
  }
  return true;
};

// Register routes
router.register('/login', () => renderLogin());
router.register('/', () => renderDashboard());
router.register('/tables', () => renderTables());
router.register('/tables/:id', (params) => renderTableDetail(params));
router.register('/tablet/:id', (params) => renderTabletOrder(params));
router.register('/billing', (params) => renderBilling(params));
router.register('/counter', () => { router.navigate('/tables'); });
router.register('/casts', () => renderCasts());
router.register('/casts/:id', (params) => renderCastDetail(params));
router.register('/salary', () => renderSalary());
router.register('/daily-pay', () => renderDailyPay());
router.register('/sales', () => renderSales());
router.register('/menu-mgmt', () => renderMenuMgmt());
router.register('/closing', () => renderClosing());
router.register('/settings', () => renderSettings());
router.register('/logout', () => {
  sessionStorage.removeItem('nightpos_currentUser');
  router.navigate('/login');
});

// Start router
router.start();
