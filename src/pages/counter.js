// ============================================
// Counter Page - カウンター（時間管理）画面
// ============================================
import { renderLayout, setPageTitle } from '../components/layout.js';
import { store } from '../store/index.js';
import { router } from '../router.js';
import { formatMoney, formatTime } from '../utils/format.js';

let counterInterval = null;

export function renderCounter() {
  if (counterInterval) clearInterval(counterInterval);

  renderLayout('', 'counter');
  setPageTitle('カウンター');

  const content = document.getElementById('page-content');
  renderCounterContent(content);

  counterInterval = setInterval(() => renderCounterContent(content), 1000);
}

function renderCounterContent(container) {
  const settings = store.getSettings();
  const setDuration = settings.setDuration || 60;

  const activeSessions = store.query('table_sessions', s =>
    s.status === 'active' || s.status === 'extended' || s.status === 'billing'
  ).sort((a, b) => new Date(a.entryTime) - new Date(b.entryTime));

  if (activeSessions.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="margin-top:var(--space-3xl);">
        <i data-lucide="timer-off" style="width:48px;height:48px;"></i>
        <p>現在入店中の卓はありません</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = `
    <div style="display:grid;gap:var(--space-md);">
      ${activeSessions.map(session => {
        const table = store.getById('tables', session.tableId);
        if (!table) return '';

        const sets = store.query('session_sets', s => s.sessionId === session.id).sort((a, b) => a.setNumber - b.setNumber);
        const currentSet = sets[sets.length - 1];

        const totalElapsed = Math.floor((Date.now() - new Date(session.entryTime).getTime()) / 60000);
        const setElapsed = currentSet ? Math.floor((Date.now() - new Date(currentSet.startTime).getTime()) / 60000) : 0;
        const remaining = setDuration - setElapsed;
        const progress = Math.min(100, (setElapsed / setDuration) * 100);

        let progressClass = 'progress-safe';
        let timeColor = 'var(--cyan)';
        if (remaining <= 5) { progressClass = 'progress-danger'; timeColor = 'var(--danger)'; }
        else if (remaining <= 15) { progressClass = 'progress-warning'; timeColor = 'var(--warning)'; }

        const statusLabel = { active: '入店中', extended: '延長中', billing: '会計待ち' }[session.status];
        const nominations = store.query('nominations', n => n.sessionId === session.id);
        const hasHonshimei = nominations.some(n => n.type === 'honshimei');

        return `
          <div class="counter-card" style="cursor:pointer;border-left:4px solid ${remaining <= 5 ? 'var(--danger)' : remaining <= 15 ? 'var(--warning)' : 'var(--cyan)'};" onclick="location.hash='#/tables/${session.tableId}'">
            <div style="min-width:80px;">
              <div style="font-size:var(--text-2xl);font-weight:800;">${table.number}番</div>
              <span class="badge badge-${session.status === 'extended' ? 'extended' : session.status === 'billing' ? 'billing' : 'active'}" style="margin-top:4px;">${statusLabel}</span>
            </div>
            <div style="flex:1;display:flex;flex-direction:column;gap:var(--space-sm);">
              <div style="display:flex;justify-content:space-between;font-size:var(--text-sm);color:var(--text-secondary);">
                <span>${session.guestCount}名 | 入店 ${formatTime(session.entryTime)} | セット${sets.length}</span>
                <span style="font-family:var(--font-mono);">経過 ${totalElapsed}分</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill ${progressClass}" style="width:${progress}%"></div>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:var(--text-xs);color:var(--text-tertiary);">
                <span>0分</span>
                <span>${setDuration}分</span>
              </div>
            </div>
            <div style="text-align:center;min-width:100px;">
              <div style="font-size:var(--text-xs);color:var(--text-tertiary);margin-bottom:4px;">残り時間</div>
              <div class="timer-display" style="font-size:var(--text-3xl);color:${timeColor};${remaining <= 5 ? 'animation:pulse 1s infinite;' : ''}">${remaining > 0 ? remaining + '分' : '超過'}</div>
            </div>
            <div style="min-width:60px;text-align:right;">
              ${hasHonshimei ? '<span class="tc-nomination">★</span>' : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  if (window.lucide) lucide.createIcons();
}
