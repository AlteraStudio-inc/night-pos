// ============================================
// Format Utilities
// ============================================

/**
 * 金額を桁区切りフォーマット
 * @param {number} amount
 * @returns {string} ¥1,234,567
 */
export function formatMoney(amount) {
  if (amount == null || isNaN(amount)) return '¥0';
  return '¥' + Math.floor(amount).toLocaleString('ja-JP');
}

/**
 * 金額を符号付きフォーマット
 */
export function formatMoneyWithSign(amount) {
  if (amount >= 0) return '+' + formatMoney(amount);
  return '-' + formatMoney(Math.abs(amount));
}

/**
 * 数値を桁区切りフォーマット
 */
export function formatNumber(num) {
  if (num == null || isNaN(num)) return '0';
  return Number(num).toLocaleString('ja-JP');
}

/**
 * パーセンテージフォーマット
 */
export function formatPercent(rate) {
  return (rate * 100).toFixed(0) + '%';
}

/**
 * 日付フォーマット (YYYY/MM/DD)
 */
export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 時刻フォーマット (HH:MM)
 */
export function formatTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * 日付時刻フォーマット
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  return formatDate(dateStr) + ' ' + formatTime(dateStr);
}

/**
 * 経過時間をMM:SS形式で表示
 */
export function formatElapsed(minutes) {
  if (minutes == null || isNaN(minutes)) return '00:00';
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:00`;
  const s = Math.floor((minutes % 1) * 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * 経過分数を「Xh Ym」形式で表示
 */
export function formatDuration(minutes) {
  if (minutes == null || isNaN(minutes)) return '0分';
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  if (h > 0) return `${h}時間${m > 0 ? m + '分' : ''}`;
  return `${m}分`;
}

/**
 * UUID生成
 */
export function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 今日の日付キー (YYYY-MM-DD)
 */
export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 現在時刻のISO文字列
 */
export function now() {
  return new Date().toISOString();
}
