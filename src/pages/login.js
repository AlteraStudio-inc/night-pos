// ============================================
// Login Page
// ============================================
import { store } from '../store/index.js';
import { router } from '../router.js';
import { showToast } from '../components/toast.js';

export function renderLogin() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">
          <div class="logo-mark">N</div>
          <h1>Night POS</h1>
          <p>店舗業務管理システム</p>
        </div>
        <form id="login-form">
          <div class="form-group">
            <label class="form-label">ユーザーID</label>
            <input type="text" class="form-input form-input-lg" id="login-username" placeholder="ユーザーIDを入力" autocomplete="off" value="admin">
          </div>
          <div class="form-group">
            <label class="form-label">パスワード</label>
            <input type="password" class="form-input form-input-lg" id="login-password" placeholder="パスワードを入力" value="admin">
          </div>
          <button type="submit" class="btn btn-primary btn-xl w-full" style="margin-top: var(--space-lg);">
            <i data-lucide="log-in"></i>
            ログイン
          </button>
        </form>
        <p style="text-align:center;margin-top:var(--space-xl);font-size:var(--text-xs);color:var(--text-muted);">
          初期ID: admin / パスワード: admin
        </p>
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();

  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    const users = store.getAll('users');
    const user = users.find(u => u.username === username && u.password === password && !u.deleted);

    if (user) {
      sessionStorage.setItem('nightpos_currentUser', JSON.stringify(user));
      store.addAuditLog('login', { userId: user.id, username: user.username });
      showToast(`ようこそ、${user.displayName}さん`, 'success');
      router.navigate('/');
    } else {
      showToast('ユーザーIDまたはパスワードが正しくありません', 'error');
    }
  });
}
