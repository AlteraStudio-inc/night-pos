// ============================================
// Settings Page - 設定画面
// ============================================
import { renderLayout, setPageTitle } from '../components/layout.js';
import { store } from '../store/index.js';
import { formatMoney } from '../utils/format.js';
import { showToast } from '../components/toast.js';
import { showModal, closeModal } from '../components/modal.js';

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
          <div class="form-group">
            <label class="form-label">同伴料金（お客様チャージ）</label>
            <input type="number" class="form-input" id="set-douhan-fee" value="${settings.douhanFee}" min="0">
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
          <div class="form-group">
            <label class="form-label">スライド上昇額（本指名時）</label>
            <input type="number" class="form-input" id="set-slide" value="${settings.slideAmount}" min="0">
          </div>
        </div>
      </div>

      <button class="btn btn-primary btn-xl" id="save-settings" style="min-width:200px;">
        <i data-lucide="save"></i> 設定を保存
      </button>

      <!-- Cast Individual Pay Settings -->
      <div class="card" style="margin-top:var(--space-3xl);">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="user-cog" style="width:18px;height:18px;color:var(--cyan)"></i> キャスト別給与設定</h3>
        </div>
        <p style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-lg);">
          キャストごとに時給・バック単価を個別に設定できます。編集ボタンから変更してください。
        </p>
        <div style="overflow-x:auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>キャスト名</th>
                <th class="text-right">時給</th>
                <th class="text-right">ドリンク</th>
                <th class="text-right">シャンパン</th>
                <th class="text-right">ワイン</th>
                <th class="text-right">指名</th>
                <th class="text-right">場内</th>
                <th class="text-right">同伴</th>
                <th class="text-right">ボトル</th>
                <th class="text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              ${store.query('casts', c => c.active).map(c => `
                <tr>
                  <td><strong>${c.name}</strong></td>
                  <td class="text-right money">${formatMoney(c.hourlyRate)}</td>
                  <td class="text-right money">${formatMoney(c.drinkBackPrice || 0)}</td>
                  <td class="text-right money">${formatMoney(c.champagneBackPrice || 0)}</td>
                  <td class="text-right money">${formatMoney(c.wineBackPrice || 0)}</td>
                  <td class="text-right money">${formatMoney(c.nominationBackPrice || 0)}</td>
                  <td class="text-right money">${formatMoney(c.banaiBackPrice || 0)}</td>
                  <td class="text-right money">${formatMoney(c.douhanBackPrice || 0)}</td>
                  <td class="text-right money">${formatMoney(c.bottleBackPrice || 0)}</td>
                  <td class="text-center">
                    <button class="btn btn-ghost btn-icon edit-cast-pay" data-cast-id="${c.id}" title="編集">
                      <i data-lucide="edit-2" style="width:14px;height:14px;"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Test Data Generation -->
      <div class="card" style="margin-top:var(--space-3xl);border-color:rgba(78,205,196,0.25);">
        <div class="card-header">
          <h3 class="card-title"><i data-lucide="flask-conical" style="width:18px;height:18px;color:var(--cyan)"></i> テストデータ</h3>
        </div>
        <p style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-lg);">
          現在の月の初日から本日までのダミー営業データを生成します。売上、出勤、日払い、指名などすべての取引データが含まれます。
        </p>
        <button class="btn btn-secondary btn-lg" id="generate-dummy-btn" style="border-color:var(--cyan);color:var(--cyan);">
          <i data-lucide="database"></i> テスト用ダミーデータを作成
        </button>
      </div>

      <!-- Data Management -->
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

  // Generate Dummy Data
  document.getElementById('generate-dummy-btn')?.addEventListener('click', async () => {
    const { showConfirm } = await import('../components/modal.js');
    const confirmed = await showConfirm({
      title: 'ダミーデータの生成',
      message: '今月分のテスト用ダミーデータを作成しますか？',
      subMessage: '売上、出勤、日払い、指名などの営業データが生成されます',
      type: 'warning',
      confirmText: '作成する'
    });
    if (confirmed) {
      generateDummyData();
      showToast('ダミーデータを作成しました', 'success');
    }
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

  document.getElementById('save-settings')?.addEventListener('click', () => {
    const updated = {
      storeName: document.getElementById('set-store-name').value.trim(),
      tableCount: parseInt(document.getElementById('set-table-count').value) || 20,
      setDuration: parseInt(document.getElementById('set-duration').value) || 60,
      firstSetPrice: parseInt(document.getElementById('set-first-price').value) || 5000,
      normalSetPrice: parseInt(document.getElementById('set-normal-price').value) || 5000,
      extensionPrice: parseInt(document.getElementById('set-ext-price').value) || 3000,
      douhanSetPrice: parseInt(document.getElementById('set-douhan-price').value) || 3000,
      douhanFee: parseInt(document.getElementById('set-douhan-fee').value) || 5000,
      defaultTaxRate: (parseFloat(document.getElementById('set-tax-rate').value) || 20) / 100,
      defaultServiceRate: (parseFloat(document.getElementById('set-service-rate').value) || 20) / 100,
      slideAmount: parseInt(document.getElementById('set-slide').value) || 0
    };

    store.saveSettings(updated);
    store.addAuditLog('settings_update', updated);
    showToast('設定を保存しました', 'success');
  });

  // Cast individual pay editing
  content.querySelectorAll('.edit-cast-pay').forEach(btn => {
    btn.addEventListener('click', () => {
      const castId = btn.dataset.castId;
      const cast = store.getById('casts', castId);
      if (!cast) return;

      const modalContent = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-lg);">
          <div class="form-group">
            <label class="form-label">時給</label>
            <input type="number" class="form-input" id="cp-hourly" value="${cast.hourlyRate || 0}" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">ドリンクバック</label>
            <input type="number" class="form-input" id="cp-drink" value="${cast.drinkBackPrice || 0}" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">シャンパンバック</label>
            <input type="number" class="form-input" id="cp-champ" value="${cast.champagneBackPrice || 0}" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">指名バック</label>
            <input type="number" class="form-input" id="cp-nom" value="${cast.nominationBackPrice || 0}" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">場内バック</label>
            <input type="number" class="form-input" id="cp-banai" value="${cast.banaiBackPrice || 0}" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">ワインバック</label>
            <input type="number" class="form-input" id="cp-wine" value="${cast.wineBackPrice || 0}" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">同伴バック</label>
            <input type="number" class="form-input" id="cp-douhan" value="${cast.douhanBackPrice || 0}" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">ボトルバック</label>
            <input type="number" class="form-input" id="cp-bottle" value="${cast.bottleBackPrice || 0}" min="0">
          </div>
        </div>
      `;
      const modalFooter = `
        <button class="btn btn-secondary modal-cancel-btn">キャンセル</button>
        <button class="btn btn-primary" id="cp-save">保存</button>
      `;
      const overlay = showModal({ title: `${cast.name} - 給与設定`, content: modalContent, footer: modalFooter });
      overlay.querySelector('.modal-cancel-btn')?.addEventListener('click', () => closeModal(overlay));
      overlay.querySelector('#cp-save')?.addEventListener('click', () => {
        store.update('casts', castId, {
          hourlyRate: parseInt(overlay.querySelector('#cp-hourly').value) || 0,
          drinkBackPrice: parseInt(overlay.querySelector('#cp-drink').value) || 0,
          champagneBackPrice: parseInt(overlay.querySelector('#cp-champ').value) || 0,
          wineBackPrice: parseInt(overlay.querySelector('#cp-wine').value) || 0,
          nominationBackPrice: parseInt(overlay.querySelector('#cp-nom').value) || 0,
          banaiBackPrice: parseInt(overlay.querySelector('#cp-banai').value) || 0,
          douhanBackPrice: parseInt(overlay.querySelector('#cp-douhan').value) || 0,
          bottleBackPrice: parseInt(overlay.querySelector('#cp-bottle').value) || 0
        });
        closeModal(overlay);
        showToast(`${cast.name}の給与設定を更新しました`, 'success');
        renderSettings();
      });
    });
  });
}

// ============================================
// ダミーデータ生成
// ============================================
function generateDummyData() {
  const settings = store.getSettings();
  const casts = store.query('casts', c => c.active);
  const menus = store.query('menus', m => m.active);
  const tables = store.query('tables', t => t.active);

  if (casts.length === 0 || tables.length === 0) return;

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1);

  // Menu categories
  const castDrinkMenus = menus.filter(m => m.category === 'cast_drink');
  const champagneMenus = menus.filter(m => m.category === 'champagne');
  const wineMenus = menus.filter(m => m.category === 'wine');
  const bottleMenus = menus.filter(m => m.category === 'bottle');
  const paidMenus = menus.filter(m => m.category === 'menu' && m.price > 0);

  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function dateKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  const taxRate = settings.defaultTaxRate || 0.2;
  const serviceRate = settings.defaultServiceRate || 0.2;

  // For each day of the month up to today
  for (let day = new Date(firstDay); day <= today; day.setDate(day.getDate() + 1)) {
    const dk = dateKey(day);
    const dow = day.getDay();
    const isWeekend = dow === 0 || dow === 5 || dow === 6;

    // Number of sessions
    const sessionCount = isWeekend ? randInt(5, 10) : randInt(2, 6);

    // Working casts (3-5)
    const workCount = Math.min(casts.length, randInt(3, Math.min(5, casts.length)));
    const shuffled = [...casts].sort(() => Math.random() - 0.5);
    const workingCasts = shuffled.slice(0, workCount);

    // Cast attendance
    workingCasts.forEach(cast => {
      const ciH = randInt(18, 20);
      const ciM = randInt(0, 59);
      const coH = randInt(1, 4);
      const coM = randInt(0, 59);

      const clockIn = new Date(day.getFullYear(), day.getMonth(), day.getDate(), ciH, ciM);
      const clockOut = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1, coH, coM);
      const hours = (clockOut - clockIn) / 3600000;
      const basePay = Math.floor(cast.hourlyRate * hours);
      const backEstimate = randInt(0, 5) * 500;

      store.add('cast_attendance', {
        castId: cast.id,
        castName: cast.name,
        date: dk,
        clockIn: clockIn.toISOString(),
        clockOut: clockOut.toISOString(),
        hourlyRate: cast.hourlyRate,
        hasHonshimei: Math.random() < 0.3,
        finalPay: basePay + backEstimate
      });
    });

    // Sessions
    let dayTotal = 0, dayCash = 0, dayCard = 0, dayGuests = 0;

    for (let si = 0; si < sessionCount; si++) {
      const table = randChoice(tables);
      const guests = randInt(1, 4);
      const eH = randInt(19, 24);
      const eM = randInt(0, 59);

      const entry = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0);
      if (eH >= 24) {
        entry.setDate(entry.getDate() + 1);
        entry.setHours(eH - 24, eM, 0, 0);
      } else {
        entry.setHours(eH, eM, 0, 0);
      }

      const isDouhan = Math.random() < 0.1;
      const setDur = settings.setDuration || 60;
      const setPrice = isDouhan ? (settings.douhanSetPrice || 3000) : (settings.firstSetPrice || 5000);

      const session = store.add('table_sessions', {
        tableId: table.id,
        date: dk,
        guestCount: guests,
        entryTime: entry.toISOString(),
        setType: 'first',
        isDouhan,
        status: 'completed',
        setDuration: setDur,
        douhanFee: isDouhan ? (settings.douhanFee || 5000) : 0
      });

      const endTime = new Date(entry.getTime() + setDur * 60000);

      const firstSet = store.add('session_sets', {
        sessionId: session.id,
        setNumber: 1,
        setType: 'first',
        taxRate,
        serviceRate,
        setPrice,
        setDuration: setDur,
        startTime: entry.toISOString(),
        endTime: endTime.toISOString(),
        active: false
      });

      let sessTotal = setPrice;
      if (isDouhan) sessTotal += (settings.douhanFee || 5000);

      // Extension (30%)
      if (Math.random() < 0.3) {
        const extEnd = new Date(endTime.getTime() + setDur * 60000);
        store.add('session_sets', {
          sessionId: session.id,
          setNumber: 2,
          setType: 'extension',
          taxRate,
          serviceRate,
          extensionPrice: settings.extensionPrice || 3000,
          extensionDuration: setDur,
          startTime: endTime.toISOString(),
          endTime: extEnd.toISOString(),
          active: false
        });
        sessTotal += (settings.extensionPrice || 3000);
      }

      // Orders
      const orderCount = randInt(1, 6);
      for (let oi = 0; oi < orderCount; oi++) {
        const roll = Math.random();
        let menu = null, castId = null, castName = null;

        if (roll < 0.5 && paidMenus.length > 0) {
          menu = randChoice(paidMenus);
        } else if (roll < 0.7 && castDrinkMenus.length > 0) {
          menu = randChoice(castDrinkMenus);
          if (workingCasts.length > 0) {
            const c = randChoice(workingCasts);
            castId = c.id;
            castName = c.name;
          }
        } else if (roll < 0.85 && champagneMenus.length > 0) {
          menu = randChoice(champagneMenus);
          if (Math.random() < 0.7 && workingCasts.length > 0) {
            const c = randChoice(workingCasts);
            castId = c.id;
            castName = c.name;
          }
        } else if (roll < 0.93 && wineMenus.length > 0) {
          menu = randChoice(wineMenus);
        } else if (bottleMenus.length > 0) {
          menu = randChoice(bottleMenus);
          if (Math.random() < 0.7 && workingCasts.length > 0) {
            const c = randChoice(workingCasts);
            castId = c.id;
            castName = c.name;
          }
        }

        if (menu) {
          const qty = (menu.category === 'champagne' || menu.category === 'bottle') ? 1 : randInt(1, 3);
          const oTime = new Date(entry.getTime() + randInt(5, Math.max(10, setDur - 5)) * 60000);

          store.add('order_items', {
            sessionId: session.id,
            tableId: table.id,
            menuId: menu.id,
            menuName: castName ? menu.name + ' (' + castName + ')' : menu.name,
            price: menu.price,
            quantity: qty,
            category: menu.category,
            categoryId: menu.categoryId,
            castId,
            castName,
            isFree: menu.isFree || false,
            isKeep: menu.isKeep || false,
            taxRate: menu.isFree ? 0 : taxRate,
            serviceRate: menu.isFree ? 0 : serviceRate,
            setId: firstSet.id,
            setNumber: 1,
            orderTime: oTime.toISOString(),
            date: dk,
            cancelled: false,
            orderedBy: 'pos'
          });

          if (!menu.isFree) sessTotal += menu.price * qty;
        }
      }

      // Nominations
      if (workingCasts.length > 0) {
        if (Math.random() < 0.3) {
          store.add('nominations', {
            sessionId: session.id,
            tableId: table.id,
            castId: randChoice(workingCasts).id,
            type: 'honshimei',
            date: dk
          });
        }
        if (Math.random() < 0.2) {
          store.add('nominations', {
            sessionId: session.id,
            tableId: table.id,
            castId: randChoice(workingCasts).id,
            type: 'banai',
            date: dk
          });
        }
        if (isDouhan) {
          store.add('nominations', {
            sessionId: session.id,
            tableId: table.id,
            castId: randChoice(workingCasts).id,
            type: 'douhan',
            date: dk
          });
        }
      }

      // Payment
      const grandTotal = Math.floor(sessTotal * (1 + taxRate + serviceRate));
      const method = Math.random() < 0.5 ? 'cash' : (Math.random() < 0.7 ? 'card' : 'other');

      store.add('payment_records', {
        sessionId: session.id,
        tableId: table.id,
        date: dk,
        amount: grandTotal,
        method,
        guestCount: guests
      });

      store.update('table_sessions', session.id, { totalAmount: grandTotal });

      dayTotal += grandTotal;
      if (method === 'cash') dayCash += grandTotal;
      else if (method === 'card') dayCard += grandTotal;
      dayGuests += guests;
    }

    // Daily closing
    store.add('daily_closings', {
      date: dk,
      totalSales: dayTotal,
      cashSales: dayCash,
      cardSales: dayCard,
      otherSales: dayTotal - dayCash - dayCard,
      sessionCount,
      guestCount: dayGuests
    });

    // Daily payments (日払い) - 40% chance per working cast
    workingCasts.forEach(cast => {
      if (Math.random() < 0.4) {
        store.add('cast_payments', {
          castId: cast.id,
          castName: cast.name,
          date: dk,
          amount: randInt(1, 5) * 1000,
          note: '\u65E5\u6255\u3044'
        });
      }
    });
  }

  store.addAuditLog('generate_dummy_data', { month: year + '-' + String(month + 1).padStart(2, '0') });
}
