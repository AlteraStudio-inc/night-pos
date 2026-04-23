// ============================================
// Calculation Utilities
// ============================================

/**
 * 注文アイテムの小計を計算（税込）
 * price × quantity × (1 + taxRate) × (1 + serviceRate)
 */
export function calcItemTotal(price, quantity, taxRate = 0, serviceRate = 0) {
  const base = price * quantity;
  const tax = base * taxRate;
  const service = base * serviceRate;
  return Math.floor(base + tax + service);
}

/**
 * 注文アイテムの税額のみ計算
 */
export function calcItemTax(price, quantity, taxRate = 0) {
  return Math.floor(price * quantity * taxRate);
}

/**
 * 注文アイテムのサービス料のみ計算
 */
export function calcItemService(price, quantity, serviceRate = 0) {
  return Math.floor(price * quantity * serviceRate);
}

/**
 * セッションの会計サマリーを計算
 * @param {Object} session - table_session
 * @param {Array} sets - session_sets
 * @param {Array} orderItems - order_items with menu info
 * @param {Object} settings - store settings
 * @returns {Object} billing summary
 */
export function calcBillingSummary(session, sets, orderItems, settings) {
  // セット料金の合計
  let setCharges = 0;
  let extensionCharges = 0;
  let douhanFeeTotal = 0;

  // 同伴料金: 初回のみ課金（新データは douhanGuestCount × douhanFeePerPerson で事前計算済み）
  const douhanGuestCount = session.douhanGuestCount || 0;
  if (douhanGuestCount > 0 || session.isDouhan) {
    douhanFeeTotal = session.douhanFee != null ? session.douhanFee : (settings.douhanFee || 5000);
  }

  sets.forEach((set, index) => {
    if (index === 0) {
      // 最初のセット料金（同伴の場合もセット料金は別途）
      setCharges += (set.setPrice != null ? set.setPrice : (settings.firstSetPrice || 5000));
    } else {
      // 延長
      extensionCharges += (set.extensionPrice != null ? set.extensionPrice : (settings.extensionPrice || 3000));
    }
  });

  // メニュー注文の集計
  let menuTotal = 0;
  let castDrinkTotal = 0;
  let champagneTotal = 0;
  let wineTotal = 0;
  let taxTotal = 0;
  let serviceTotal = 0;
  let menuCount = 0;
  let castDrinkCount = 0;
  let champagneCount = 0;
  let wineCount = 0;

  orderItems.forEach(item => {
    if (item.cancelled) return;
    
    const base = item.price * item.quantity;
    const tax = Math.floor(base * (item.taxRate || 0));
    const service = Math.floor(base * (item.serviceRate || 0));
    
    taxTotal += tax;
    serviceTotal += service;

    switch (item.category) {
      case 'cast_drink':
        castDrinkTotal += base;
        castDrinkCount += item.quantity;
        break;
      case 'champagne':
        champagneTotal += base;
        champagneCount += item.quantity;
        break;
      case 'wine':
        wineTotal += base;
        wineCount += item.quantity;
        break;
      default:
        menuTotal += base;
        menuCount += item.quantity;
    }
  });

  // セット料金にもTAX/サービス料を適用
  const firstSetTaxRate = sets[0]?.taxRate || 0;
  const firstSetServiceRate = sets[0]?.serviceRate || 0;
  const setTax = Math.floor(setCharges * firstSetTaxRate);
  const setService = Math.floor(setCharges * firstSetServiceRate);

  // 同伴料金にもTAX/サービス料を適用
  const douhanTax = Math.floor(douhanFeeTotal * firstSetTaxRate);
  const douhanService = Math.floor(douhanFeeTotal * firstSetServiceRate);

  let extTax = 0;
  let extService = 0;
  sets.forEach((set, i) => {
    if (i > 0) {
      const ep = set.extensionPrice != null ? set.extensionPrice : (settings.extensionPrice || 3000);
      extTax += Math.floor(ep * (set.taxRate || 0));
      extService += Math.floor(ep * (set.serviceRate || 0));
    }
  });

  taxTotal += setTax + extTax + douhanTax;
  serviceTotal += setService + extService + douhanService;

  const subtotal = setCharges + extensionCharges + douhanFeeTotal + menuTotal + castDrinkTotal + champagneTotal + wineTotal;
  const grandTotal = subtotal + taxTotal + serviceTotal;

  return {
    setCharges,
    extensionCharges,
    douhanFeeTotal,
    menuTotal,
    castDrinkTotal,
    champagneTotal,
    wineTotal,
    taxTotal,
    serviceTotal,
    subtotal,
    grandTotal,
    menuCount,
    castDrinkCount,
    champagneCount,
    wineCount,
    setCount: sets.length,
    extensionCount: Math.max(0, sets.length - 1)
  };
}

/**
 * キャスト日給計算
 */
export function calcCastDailyPay(attendance, backItems, settings, totalDailyPaid = 0) {
  if (!attendance) return null;

  const startTime = new Date(attendance.clockIn);
  const endTime = attendance.clockOut ? new Date(attendance.clockOut) : new Date();
  const hoursWorked = (endTime - startTime) / (1000 * 60 * 60);

  let hourlyRate = attendance.hourlyRate || 0;

  // スライド（本指名がある日は時給UP）
  if (attendance.hasHonshimei) {
    hourlyRate += (settings.slideAmount || 0);
  }

  const basePay = Math.floor(hourlyRate * hoursWorked);

  let drinkBack = 0;
  let champagneBack = 0;
  let wineBack = 0;
  let nominationBack = 0;
  let banaiBack = 0;
  let douhanBack = 0;
  let bottleBack = 0;
  let otherBack = 0;

  let drinkCount = 0;
  let champagneCount = 0;
  let wineCount = 0;
  let nominationCount = 0;
  let banaiCount = 0;
  let douhanCount = 0;
  let bottleCount = 0;

  backItems.forEach(item => {
    const bp = item.backPrice || 0;
    switch (item.type) {
      case 'drink':
        drinkBack += bp * item.quantity;
        drinkCount += item.quantity;
        break;
      case 'champagne':
        champagneBack += bp * item.quantity;
        champagneCount += item.quantity;
        break;
      case 'wine':
        wineBack += bp * item.quantity;
        wineCount += item.quantity;
        break;
      case 'nomination':
        nominationBack += bp * item.quantity;
        nominationCount += item.quantity;
        break;
      case 'banai':
        banaiBack += bp * item.quantity;
        banaiCount += item.quantity;
        break;
      case 'douhan':
        douhanBack += bp * item.quantity;
        douhanCount += item.quantity;
        break;
      case 'bottle':
        bottleBack += bp * item.quantity;
        bottleCount += item.quantity;
        break;
      default:
        otherBack += bp * item.quantity;
    }
  });

  const totalBack = drinkBack + champagneBack + wineBack + nominationBack + banaiBack + douhanBack + bottleBack + otherBack;
  const grossPay = basePay + totalBack;
  const netPay = grossPay - totalDailyPaid;

  return {
    hourlyRate,
    hoursWorked: Math.round(hoursWorked * 100) / 100,
    basePay,
    drinkBack,
    drinkCount,
    champagneBack,
    champagneCount,
    wineBack,
    wineCount,
    nominationBack,
    nominationCount,
    banaiBack,
    banaiCount,
    douhanBack,
    douhanCount,
    bottleBack,
    bottleCount,
    otherBack,
    totalBack,
    grossPay,
    netPay,
    hasSlide: !!attendance.hasHonshimei
  };
}
