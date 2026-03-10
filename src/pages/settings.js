// ============================================
// Settings Page - 設定画面
// ============================================
import { renderLayout, setPageTitle } from '../components/layout.js';
import { store } from '../store/index.js';
import { formatMoney } from '../utils/format.js';
import { showToast } from '../components/toast.js';

export function renderSettings() {
  renderLayout('', 'settings');
  setPageTitle('設定');

  const content = document.getElementById('page-content');
  const settings = store.getSettings();

  content.innerHTML = `
    <div style="max-width:800px;">
      <!-- Store Settings -->
      <div class="card mb-xl">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="store" style="width:18px;height:18px;color:var(--gold)"></i> 店舗設定</h3>
        </div>
        <div class="form-group">
          <label class="form-label">店舗名</label>
          <input type="text" class="form-input" id="set-store-name" value="${settings.storeName || ''}">
        </div>
        <div class="form-group">
          <label class="form-label">卓数</label>
          <input type="number" class="form-input" id="set-table-count" value="${settings.tableCount}" min="1">
        </div>
      </div>

      <!-- Set & Price Settings -->
      <div class="card mb-xl">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="clock" style="width:18px;height:18px;color:var(--cyan)"></i> セット・料金設定</h3>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-lg);">
          <div class="form-group">
            <label class="form-label">セット時間（分）</label>
            <input type="number" class="form-input" id="set-duration" value="${settings.setDuration}" min="1">
          </div>
          <div class="form-group">
            <label class="form-label">初回セット料金</label>
            <input type="number" class="form-input" id="set-first-price" value="${settings.firstSetPrice}" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">通常セット料金</label>
            <input type="number" class="form-input" id="set-normal-price" value="${settings.normalSetPrice}" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">延長料金</label>
            <input type="number" class="form-input" id="set-ext-price" value="${settings.extensionPrice}" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">同伴時セット料金（1セット目）</label>
            <input type="number" class="form-input" id="set-douhan-price" value="${settings.douhanSetPrice}" min="0">
          </div>
        </div>
      </div>

      <!-- Tax Settings -->
      <div class="card mb-xl">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="percent" style="width:18px;height:18px;color:var(--purple)"></i> 税率・サービス料設定</h3>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-lg);">
          <div class="form-group">
            <label class="form-label">デフォルトTAX率（%）</label>
            <input type="number" class="form-input" id="set-tax-rate" value="${settings.defaultTaxRate * 100}" min="0" max="100" step="1">
          </div>
          <div class="form-group">
            <label class="form-label">デフォルトサービス料率（%）</label>
            <input type="number" class="form-input" id="set-service-rate" value="${settings.defaultServiceRate * 100}" min="0" max="100" step="1">
          </div>
        </div>
      </div>

      <!-- Cast Pay Settings -->
      <div class="card mb-xl">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="users" style="width:18px;height:18px;color:var(--gold)"></i> キャスト給与設定</h3>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-lg);">
          <div class="form-group">
            <label class="form-label">デフォルト時給</label>
            <input type="number" class="form-input" id="set-hourly" value="${settings.defaultHourlyRate}" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">スライド上昇額（本指名時）</label>
            <input type="number" class="form-input" id="set-slide" value="${settings.slideAmount}" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">ドリンクバック単価</label>
            <input type="number" class="form-input" id="set-drink-back" value="${settings.drinkBackPrice}" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">シャンパンバック単価</label>
            <input type="number" class="form-input" id="set-champ-back" value="${settings.champagneBackPrice}" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">ワインバック単価</label>
            <input type="number" class="form-input" id="set-wine-back" value="${settings.wineBackPrice}" min="0">
          </div>
        </div>
      </div>

      <button class="btn btn-primary btn-xl" id="save-settings" style="min-width:200px;">
        <i data-lucide="save"></i> 設定を保存
      </button>

      <!-- Danger Zone / Data Management -->
      <div class="card" style="margin-top:var(--space-3xl);border-color:rgba(231, 76, 60, 0.2);">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="shield-alert" style="width:18px;height:18px;color:var(--danger)"></i> データ管理（重要）</h3>
        </div>
        <p style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-lg);">
          テストデータや過去の売上データをリセットしたい場合に使用します。この操作は取り消せません。
        </p>
        <div style="display:flex;gap:var(--space-md);flex-wrap:wrap;">
          <button class="btn btn-danger" id="clear-transactions-btn">
            <i data-lucide="trash-2"></i> 売上履歴・取引データのみ削除
          </button>
          <button class="btn btn-secondary" id="factory-reset-btn" style="border-color:var(--danger);color:var(--danger);">
            <i data-lucide="refresh-ccw"></i> システムを完全に初期化
          </button>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();


  // Clear Transactions
  document.getElementById('clear-transactions-btn')?.addEventListener('click', async () => {
    const { showConfirm } = await import('../components/modal.js');
    const confirmed = await showConfirm({
      title: '取引データのリセット',
      message: '本日の売上、接客履歴、監査ログなどの「動き」に関するデータをすべて削除しますか？',
      subMessage: '※メニューやキャストの設定は残ります',
      type: 'danger',
      confirmText: '削除を実行する'
    });
    if (confirmed) store.clearTransactions();
  });

  // Factory Reset
  document.getElementById('factory-reset-btn')?.addEventListener('click', async () => {
    const { showConfirm } = await import('../components/modal.js');
    const confirmed = await showConfirm({
      title: '完全な初期化',
      message: 'システムを工場出荷状態に戻しますか？',
      subMessage: '※メニュー、キャスト、設定を含むすべてのデータが完全に消失します',
      type: 'danger',
      confirmText: '完全に初期化する'
    });
    if (confirmed) store.clearAll();
  });

  document.getElementById('save-settings')?.addEventListener('click', () => {
    const updated = {
      storeName: document.getElementById('set-store-name').value.trim(),
      tableCount: parseInt(document.getElementById('set-table-count').value) || 20,
      setDuration: parseInt(document.getElementById('set-duration').value) || 60,
      firstSetPrice: parseInt(document.getElementById('set-first-price').value) || 5000,
      normalSetPrice: parseInt(document.getElementById('set-normal-price').value) || 5000,
      extensionPrice: parseInt(document.getElementById('set-ext-price').value) || 3000,
      douhanSetPrice: parseInt(document.getElementById('set-douhan-price').value) || 3000,
      defaultTaxRate: (parseFloat(document.getElementById('set-tax-rate').value) || 20) / 100,
      defaultServiceRate: (parseFloat(document.getElementById('set-service-rate').value) || 20) / 100,
      defaultHourlyRate: parseInt(document.getElementById('set-hourly').value) || 2000,
      slideAmount: parseInt(document.getElementById('set-slide').value) || 500,
      drinkBackPrice: parseInt(document.getElementById('set-drink-back').value) || 500,
      champagneBackPrice: parseInt(document.getElementById('set-champ-back').value) || 1000,
      wineBackPrice: parseInt(document.getElementById('set-wine-back').value) || 500
    };

    store.saveSettings(updated);
    store.addAuditLog('settings_update', updated);
    showToast('設定を保存しました', 'success');
  });
}
