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

  sets.forEach((set, index) => {
    if (index === 0) {
      // 最初のセット
      if (session.isDouhan) {
        setCharges += (set.setPrice != null ? set.setPrice : (settings.douhanSetPrice || 3000));
      } else {
        setCharges += (set.setPrice != null ? set.setPrice : (set.setType === 'first' ? (settings.firstSetPrice || 5000) : (settings.normalSetPrice || 5000)));
      }
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
  
  let extTax = 0;
  let extService = 0;
  sets.forEach((set, i) => {
    if (i > 0) {
      const ep = set.extensionPrice != null ? set.extensionPrice : (settings.extensionPrice || 3000);
      extTax += Math.floor(ep * (set.taxRate || 0));
      extService += Math.floor(ep * (set.serviceRate || 0));
    }
  });

  taxTotal += setTax + extTax;
  serviceTotal += setService + extService;

  const subtotal = setCharges + extensionCharges + menuTotal + castDrinkTotal + champagneTotal + wineTotal;
  const grandTotal = subtotal + taxTotal + serviceTotal;

  return {
    setCharges,
    extensionCharges,
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
export function calcCastDailyPay(attendance, backItems, settings) {
  if (!attendance) return null;

  const startTime = new Date(attendance.clockIn);
  const endTime = attendance.clockOut ? new Date(attendance.clockOut) : new Date();
  const hoursWorked = (endTime - startTime) / (1000 * 60 * 60);

  let hourlyRate = attendance.hourlyRate || settings.defaultHourlyRate || 2000;
  
  // スライド（本指名がある日は時給UP）
  if (attendance.hasHonshimei) {
    hourlyRate += (settings.slideAmount || 500);
  }

  const basePay = Math.floor(hourlyRate * hoursWorked);

  let drinkBack = 0;
  let champagneBack = 0;
  let wineBack = 0;
  let otherBack = 0;

  backItems.forEach(item => {
    switch (item.type) {
      case 'drink':
        drinkBack += (item.backPrice || settings.drinkBackPrice || 500) * item.quantity;
        break;
      case 'champagne':
        champagneBack += (item.backPrice || settings.champagneBackPrice || 1000) * item.quantity;
        break;
      case 'wine':
        wineBack += (item.backPrice || settings.wineBackPrice || 500) * item.quantity;
        break;
      default:
        otherBack += (item.backPrice || 0) * item.quantity;
    }
  });

  const totalBack = drinkBack + champagneBack + wineBack + otherBack;
  const grossPay = basePay + totalBack;
  const dailyPayments = attendance.dailyPayments || 0;
  const netPay = grossPay - dailyPayments;

  return {
    hourlyRate,
    hoursWorked: Math.round(hoursWorked * 100) / 100,
    basePay,
    drinkBack,
    champagneBack,
    wineBack,
    otherBack,
    totalBack,
    grossPay,
    dailyPayments,
    netPay,
    hasSlide: !!attendance.hasHonshimei
  };
}
