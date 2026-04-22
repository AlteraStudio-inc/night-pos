// ============================================
// Receipt / 領収書 PDF Generator
// レシートプリンター想定（幅80mm = 226pt）
// ============================================
import { formatMoney, formatTime } from './format.js';

const RECEIPT_WIDTH = 226; // 80mm in points
const MARGIN = 12;
const CONTENT_WIDTH = RECEIPT_WIDTH - MARGIN * 2;
const LINE_HEIGHT = 14;
const SMALL_LINE = 11;

/**
 * 領収書PDFを生成してダウンロードまたは表示する
 * @param {Object} params
 * @param {Object} params.table - テーブル情報
 * @param {Object} params.session - セッション情報
 * @param {Array} params.sets - セット情報
 * @param {Array} params.orderItems - 注文アイテム
 * @param {Array} params.nominations - 指名情報
 * @param {Object} params.summary - 会計サマリー（calcBillingSummary結果）
 * @param {Object} params.settings - 店舗設定
 * @param {string} params.paymentMethod - 支払方法
 */
export function generateReceiptPDF({ table, session, sets, orderItems, nominations, summary, settings, paymentMethod }) {
  const storeName = settings.storeName || 'Night POS';
  const nowDate = new Date();
  const dateStr = `${nowDate.getFullYear()}/${String(nowDate.getMonth() + 1).padStart(2, '0')}/${String(nowDate.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(nowDate.getHours()).padStart(2, '0')}:${String(nowDate.getMinutes()).padStart(2, '0')}`;
  const entryTimeStr = formatTime(session.entryTime);
  const methodLabel = { cash: '現金', card: 'カード', other: 'その他' }[paymentMethod] || paymentMethod;

  // Build content lines
  const lines = [];

  // Helper functions
  function addCenter(text, fontSize = 10) {
    lines.push({ type: 'center', text, fontSize });
  }
  function addLine(left, right, fontSize = 9) {
    lines.push({ type: 'lr', left, right, fontSize });
  }
  function addDivider(style = 'dashed') {
    lines.push({ type: 'divider', style });
  }
  function addSpacer(height = 6) {
    lines.push({ type: 'spacer', height });
  }

  // --- Header ---
  addSpacer(4);
  addCenter('領 収 書', 14);
  addSpacer(6);
  addCenter(storeName, 12);
  addSpacer(4);
  addDivider('double');
  addSpacer(4);

  // --- Basic Info ---
  addLine('日付', dateStr);
  addLine('卓番号', `${table.number}番卓`);
  addLine('人数', `${session.guestCount}名`);
  addLine('入店時間', entryTimeStr);
  addLine('会計時間', timeStr);
  addSpacer(4);
  addDivider();
  addSpacer(4);

  // --- Set Charges ---
  addCenter('- 明 細 -', 10);
  addSpacer(4);

  // First set
  addLine(`セット料金 (${sets.length > 0 ? '1セット目' : 'セット'})`, formatMoney(summary.setCharges), 9);

  // Extensions
  if (summary.extensionCount > 0) {
    const extPrice = sets.length > 1 ? (sets[1].extensionPrice || settings.extensionPrice || 3000) : (settings.extensionPrice || 3000);
    addLine(`延長料金 ×${summary.extensionCount}`, formatMoney(summary.extensionCharges), 9);
  }

  // Douhan fee
  if (summary.douhanFeeTotal > 0) {
    addLine('同伴料金', formatMoney(summary.douhanFeeTotal), 9);
  }

  addSpacer(2);

  // --- Drink Details ---
  const drinkItems = orderItems.filter(oi => oi.category === 'cast_drink' && !oi.cancelled);
  if (drinkItems.length > 0) {
    addDivider('dotted');
    addSpacer(2);
    addCenter('[ ドリンク ]', 8);
    addSpacer(2);
    drinkItems.forEach(item => {
      const itemTotal = item.price * item.quantity;
      const label = item.castName ? `${item.menuName}` : item.menuName;
      addLine(`${label} ×${item.quantity}`, formatMoney(itemTotal), 8);
    });
  }

  // --- Champagne/Bottle Details ---
  const champagneItems = orderItems.filter(oi => oi.category === 'champagne' && !oi.cancelled);
  if (champagneItems.length > 0) {
    addDivider('dotted');
    addSpacer(2);
    addCenter('[ シャンパン ]', 8);
    addSpacer(2);
    champagneItems.forEach(item => {
      const itemTotal = item.price * item.quantity;
      addLine(`${item.menuName} ×${item.quantity}`, formatMoney(itemTotal), 8);
    });
  }

  // --- Wine Details ---
  const wineItems = orderItems.filter(oi => oi.category === 'wine' && !oi.cancelled);
  if (wineItems.length > 0) {
    addDivider('dotted');
    addSpacer(2);
    addCenter('[ ワイン ]', 8);
    addSpacer(2);
    wineItems.forEach(item => {
      const itemTotal = item.price * item.quantity;
      addLine(`${item.menuName} ×${item.quantity}`, formatMoney(itemTotal), 8);
    });
  }

  // --- Other Menu Items ---
  const otherItems = orderItems.filter(oi => !['cast_drink', 'champagne', 'wine'].includes(oi.category) && !oi.cancelled);
  if (otherItems.length > 0) {
    addDivider('dotted');
    addSpacer(2);
    addCenter('[ その他 ]', 8);
    addSpacer(2);
    otherItems.forEach(item => {
      const itemTotal = item.price * item.quantity;
      addLine(`${item.menuName} ×${item.quantity}`, formatMoney(itemTotal), 8);
    });
  }

  // --- Nominations ---
  const honshimei = nominations.filter(n => n.type === 'honshimei');
  const douhan = nominations.filter(n => n.type === 'douhan');
  if (honshimei.length > 0 || douhan.length > 0) {
    addDivider('dotted');
    addSpacer(2);
    if (honshimei.length > 0) {
      addLine(`指名料 ×${honshimei.length}`, '', 8);
    }
    if (douhan.length > 0) {
      addLine(`同伴料 ×${douhan.length}`, '', 8);
    }
  }

  addSpacer(4);
  addDivider();
  addSpacer(4);

  // --- Totals ---
  addLine('小計', formatMoney(summary.subtotal), 10);
  if (summary.serviceTotal > 0) {
    const serviceRate = sets[0]?.serviceRate ? Math.round(sets[0].serviceRate * 100) : 20;
    addLine(`サービス料 (${serviceRate}%)`, formatMoney(summary.serviceTotal), 9);
  }
  if (summary.taxTotal > 0) {
    const taxRate = sets[0]?.taxRate ? Math.round(sets[0].taxRate * 100) : 20;
    addLine(`TAX (${taxRate}%)`, formatMoney(summary.taxTotal), 9);
  }

  addSpacer(4);
  addDivider('double');
  addSpacer(4);
  addLine('合計金額', formatMoney(summary.grandTotal), 12);
  addSpacer(4);
  addDivider('double');
  addSpacer(4);

  addLine('お支払方法', methodLabel, 9);
  addSpacer(8);

  // --- Footer ---
  addCenter('ご来店ありがとうございました', 8);
  addSpacer(4);
  addCenter(storeName, 9);
  addSpacer(10);

  // --- Render to Canvas then PDF ---
  const totalHeight = calculateTotalHeight(lines);
  const canvas = document.createElement('canvas');
  const scale = 2; // High DPI
  canvas.width = RECEIPT_WIDTH * scale;
  canvas.height = totalHeight * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, RECEIPT_WIDTH, totalHeight);

  // Render lines
  let y = MARGIN;
  ctx.fillStyle = '#000000';

  lines.forEach(line => {
    switch (line.type) {
      case 'center': {
        ctx.font = `bold ${line.fontSize}px 'Noto Sans JP', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(line.text, RECEIPT_WIDTH / 2, y + line.fontSize);
        y += line.fontSize + 4;
        break;
      }
      case 'lr': {
        ctx.font = `${line.fontSize}px 'Noto Sans JP', sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(line.left, MARGIN, y + line.fontSize);
        ctx.textAlign = 'right';
        ctx.fillText(line.right, RECEIPT_WIDTH - MARGIN, y + line.fontSize);
        y += line.fontSize + 3;
        break;
      }
      case 'divider': {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = line.style === 'double' ? 1.5 : 0.5;
        if (line.style === 'dashed') {
          ctx.setLineDash([4, 2]);
        } else if (line.style === 'dotted') {
          ctx.setLineDash([1, 2]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.beginPath();
        ctx.moveTo(MARGIN, y);
        ctx.lineTo(RECEIPT_WIDTH - MARGIN, y);
        ctx.stroke();
        ctx.setLineDash([]);
        if (line.style === 'double') {
          ctx.beginPath();
          ctx.moveTo(MARGIN, y + 3);
          ctx.lineTo(RECEIPT_WIDTH - MARGIN, y + 3);
          ctx.stroke();
          y += 6;
        } else {
          y += 3;
        }
        break;
      }
      case 'spacer': {
        y += line.height;
        break;
      }
    }
  });

  // Convert canvas to PDF-like blob (using canvas image in a minimal PDF)
  canvas.toBlob(blob => {
    if (!blob) return;
    // Create downloadable image (PNG as receipt preview - true PDF would need a library)
    // Use a simple approach: open in new window for print
    const url = URL.createObjectURL(blob);
    const printWindow = window.open('', '_blank', `width=${RECEIPT_WIDTH * 2},height=${totalHeight * 2}`);
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>領収書 - ${table.number}番卓</title>
          <style>
            * { margin: 0; padding: 0; }
            body { display: flex; justify-content: center; background: #f0f0f0; padding: 20px; }
            img { max-width: 100%; box-shadow: 0 2px 10px rgba(0,0,0,0.2); }
            @media print {
              body { background: white; padding: 0; }
              img { box-shadow: none; width: 80mm; }
            }
          </style>
        </head>
        <body>
          <img src="${url}" alt="領収書">
          <script>
            window.onafterprint = function() { window.close(); };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  }, 'image/png');
}

function calculateTotalHeight(lines) {
  let height = MARGIN * 2;
  lines.forEach(line => {
    switch (line.type) {
      case 'center': height += line.fontSize + 4; break;
      case 'lr': height += line.fontSize + 3; break;
      case 'divider': height += line.style === 'double' ? 6 : 3; break;
      case 'spacer': height += line.height; break;
    }
  });
  return height;
}
