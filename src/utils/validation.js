// ============================================
// Validation Utilities
// ============================================

export function validateRequired(value, fieldName) {
  if (value == null || value === '') {
    return `${fieldName}を入力してください`;
  }
  return null;
}

export function validatePositiveNumber(value, fieldName) {
  const num = Number(value);
  if (isNaN(num) || num < 0) {
    return `${fieldName}は0以上の数値を入力してください`;
  }
  return null;
}

export function validatePositiveInteger(value, fieldName) {
  const num = Number(value);
  if (isNaN(num) || num < 1 || !Number.isInteger(num)) {
    return `${fieldName}は1以上の整数を入力してください`;
  }
  return null;
}

export function validateRate(value, fieldName) {
  const num = Number(value);
  if (isNaN(num) || num < 0 || num > 1) {
    return `${fieldName}は0〜100%の範囲で入力してください`;
  }
  return null;
}

export function validateTableOpen(data) {
  const errors = [];
  
  const tableErr = validateRequired(data.tableNumber, '卓番号');
  if (tableErr) errors.push(tableErr);
  
  const guestErr = validatePositiveInteger(data.guestCount, '来店人数');
  if (guestErr) errors.push(guestErr);
  
  if (data.taxRate != null) {
    const taxErr = validateRate(data.taxRate, 'TAX率');
    if (taxErr) errors.push(taxErr);
  }
  
  if (data.serviceRate != null) {
    const srvErr = validateRate(data.serviceRate, 'サービス料率');
    if (srvErr) errors.push(srvErr);
  }
  
  return errors;
}

export function validateDailyPayment(amount) {
  const errors = [];
  
  const reqErr = validateRequired(amount, '日払い金額');
  if (reqErr) errors.push(reqErr);
  
  const num = Number(amount);
  if (!isNaN(num) && num < 0) {
    errors.push('日払い金額はマイナスにできません');
  }
  
  return errors;
}
