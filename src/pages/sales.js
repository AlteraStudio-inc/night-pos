// ============================================
// Sales Page - 売上一覧画面
// ============================================
import { renderLayout, setPageTitle } from '../components/layout.js';
import { store } from '../store/index.js';
import { formatMoney, formatDate, todayKey } from '../utils/format.js';

export function renderSales() {
  renderLayout('', 'sales');
  setPageTitle('売上一覧');

  const content = document.getElementById('page-content');
  const today = todayKey();
  const settings = store.getSettings();
  const casts = store.query('casts', c => c.active);

  // Per-cast sales from honshimei tables
  const castSales = casts.map(cast => {
    // Find all honshimei nominations for this cast
    const allNominations = store.query('nominations', n => n.castId === cast.id && n.type === 'honshimei');
    const todayNominations = allNominations.filter(n => n.date === today);

    // Calculate sales from honshimei sessions
    let totalSales = 0;
    let todaysSales = 0;

    allNominations.forEach(nom => {
      const session = store.getById('table_sessions', nom.sessionId);
      if (session && session.totalAmount) {
        totalSales += session.totalAmount;
        if (nom.date === today) todaysSales += session.totalAmount;
      }
    });

    // Drink backs
    const todayDrinks = store.query('order_items', oi => oi.castId === cast.id && oi.date === today && !oi.cancelled);
    const drinkCount = todayDrinks.filter(oi => oi.category === 'cast_drink').reduce((s, d) => s + d.quantity, 0);
    const champagneCount = todayDrinks.filter(oi => oi.category === 'champagne').reduce((s, d) => s + d.quantity, 0);
    const wineCount = todayDrinks.filter(oi => oi.category === 'wine').reduce((s, d) => s + d.quantity, 0);

    const douhanCount = store.query('nominations', n => n.castId === cast.id && n.type === 'douhan' && n.date === today).length;

    return {
      cast,
      honshimeiCount: todayNominations.length,
      todaysSales,
      totalSales,
      drinkCount,
      champagneCount,
      wineCount,
      douhanCount
    };
  }).sort((a, b) => b.todaysSales - a.todaysSales);

  content.innerHTML = `
    <div class="filter-bar">
      <div class="search-input">
        <i data-lucide="search"></i>
        <input type="text" class="form-input" id="sales-search" placeholder="キャスト名で検索...">
      </div>
      <div class="filter-chip active" data-period="today">本日</div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3 class="card-title"><i data-lucide="trending-up" style="width:18px;height:18px;color:var(--gold)"></i> キャスト別売上</h3>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>キャスト</th>
            <th class="text-center">本指名</th>
            <th class="text-center">同伴</th>
            <th class="text-center">ドリンク</th>
            <th class="text-center">シャンパン</th>
            <th class="text-center">ワイン</th>
            <th class="text-right">本日売上</th>
          </tr>
        </thead>
        <tbody>
          ${castSales.map(cs => `
            <tr style="cursor:pointer;" onclick="location.hash='#/casts/${cs.cast.id}'">
              <td>
                <div style="display:flex;align-items:center;gap:var(--space-md);">
                  <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold-dim));display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--bg-deepest);font-size:var(--text-xs);">${cs.cast.name.charAt(0)}</div>
                  <strong>${cs.cast.name}</strong>
                </div>
              </td>
              <td class="text-center" style="color:${cs.honshimeiCount > 0 ? 'var(--gold-light)' : 'var(--text-tertiary)'};">${cs.honshimeiCount}</td>
              <td class="text-center">${cs.douhanCount}</td>
              <td class="text-center">${cs.drinkCount}</td>
              <td class="text-center">${cs.champagneCount}</td>
              <td class="text-center">${cs.wineCount}</td>
              <td class="text-right money" style="font-weight:700;color:var(--gold-light);">${formatMoney(cs.todaysSales)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  if (window.lucide) lucide.createIcons();

  document.getElementById('sales-search')?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    content.querySelectorAll('tbody tr').forEach(row => {
      const name = row.querySelector('strong')?.textContent?.toLowerCase() || '';
      row.style.display = name.includes(q) || !q ? '' : 'none';
    });
  });
}
