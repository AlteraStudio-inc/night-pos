// ============================================
// Store Manager - Pub/Sub State Management
// ============================================
import { generateId, now } from '../utils/format.js';

const STORAGE_PREFIX = 'nightpos_';

class StoreManager {
  constructor() {
    this.listeners = {};
    this._cache = {};
  }

  // --- Storage ---
  _key(collection) {
    return STORAGE_PREFIX + collection;
  }

  getAll(collection) {
    if (this._cache[collection]) return this._cache[collection];
    try {
      const raw = localStorage.getItem(this._key(collection));
      const data = raw ? JSON.parse(raw) : [];
      this._cache[collection] = data;
      return data;
    } catch {
      return [];
    }
  }

  _save(collection, data) {
    this._cache[collection] = data;
    localStorage.setItem(this._key(collection), JSON.stringify(data));
    this.emit(collection, data);
  }

  getById(collection, id) {
    return this.getAll(collection).find(item => item.id === id);
  }

  add(collection, item) {
    if (!item.id) item.id = generateId();
    if (!item.createdAt) item.createdAt = now();
    item.updatedAt = now();
    const data = [...this.getAll(collection), item];
    this._save(collection, data);
    return item;
  }

  update(collection, id, updates) {
    const data = this.getAll(collection).map(item => {
      if (item.id === id) {
        return { ...item, ...updates, updatedAt: now() };
      }
      return item;
    });
    this._save(collection, data);
    return this.getById(collection, id);
  }

  remove(collection, id) {
    // Soft delete - mark as deleted
    return this.update(collection, id, { deleted: true, deletedAt: now() });
  }

  query(collection, filterFn) {
    return this.getAll(collection).filter(item => !item.deleted && filterFn(item));
  }

  // --- Settings (single object) ---
  getSettings() {
    try {
      const raw = localStorage.getItem(this._key('settings'));
      return raw ? JSON.parse(raw) : this._defaultSettings();
    } catch {
      return this._defaultSettings();
    }
  }

  saveSettings(settings) {
    localStorage.setItem(this._key('settings'), JSON.stringify(settings));
    this.emit('settings', settings);
  }

  _defaultSettings() {
    return {
      storeName: 'Night POS',
      setDuration: 60,
      firstSetPrice: 5000,
      normalSetPrice: 5000,
      extensionPrice: 3000,
      defaultTaxRate: 0.2,
      defaultServiceRate: 0.2,
      douhanSetPrice: 3000,
      defaultHourlyRate: 2000,
      slideAmount: 500,
      drinkBackPrice: 500,
      champagneBackPrice: 1000,
      wineBackPrice: 500,
      tableCount: 20
    };
  }

  // --- Pub/Sub ---
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  emit(event, data) {
    (this.listeners[event] || []).forEach(cb => cb(data));
    (this.listeners['*'] || []).forEach(cb => cb(event, data));
  }

  // --- Audit Log ---
  addAuditLog(action, details) {
    this.add('audit_logs', {
      action,
      details,
      timestamp: now(),
      userId: this.getCurrentUserId()
    });
  }

  getCurrentUserId() {
    try {
      const user = JSON.parse(sessionStorage.getItem('nightpos_currentUser'));
      return user?.id || 'system';
    } catch {
      return 'system';
    }
  }

  // --- Init default data ---
  initDefaultData() {
    // Initialize tables if empty
    if (this.getAll('tables').length === 0) {
      const settings = this.getSettings();
      for (let i = 1; i <= settings.tableCount; i++) {
        this.add('tables', {
          number: i,
          name: `${i}番卓`,
          status: 'vacant',
          capacity: 6,
          active: true
        });
      }
    }

    // Initialize users if empty
    if (this.getAll('users').length === 0) {
      this.add('users', {
        username: 'admin',
        password: 'admin',
        displayName: '管理者',
        role: 'admin'
      });
      this.add('users', {
        username: 'staff',
        password: 'staff',
        displayName: 'スタッフ',
        role: 'staff'
      });
    }

    // Initialize menu categories if empty
    if (this.getAll('menu_categories').length === 0) {
      const categories = [
        { name: '焼酎', sortOrder: 1 },
        { name: 'ウイスキー', sortOrder: 2 },
        { name: 'ブランデー', sortOrder: 3 },
        { name: 'ワイン', sortOrder: 4, isWine: true },
        { name: 'シャンパン', sortOrder: 5, isChampagne: true },
        { name: 'カクテル', sortOrder: 6 },
        { name: 'ビール', sortOrder: 7 },
        { name: 'ソフトドリンク', sortOrder: 8 },
        { name: 'フード', sortOrder: 9 },
        { name: 'ボトル', sortOrder: 10 },
        { name: 'キャストドリンク', sortOrder: 11, isCastDrink: true }
      ];
      categories.forEach(cat => this.add('menu_categories', cat));
    }

    // Initialize sample menus if empty
    if (this.getAll('menus').length === 0) {
      const cats = this.getAll('menu_categories');
      const getCatId = (name) => cats.find(c => c.name === name)?.id;

      const sampleMenus = [
        { name: '芋焼酎 水割り', price: 800, categoryId: getCatId('焼酎'), category: 'menu' },
        { name: '芋焼酎 ロック', price: 800, categoryId: getCatId('焼酎'), category: 'menu' },
        { name: '麦焼酎 水割り', price: 800, categoryId: getCatId('焼酎'), category: 'menu' },
        { name: '角ハイボール', price: 800, categoryId: getCatId('ウイスキー'), category: 'menu' },
        { name: '山崎', price: 1500, categoryId: getCatId('ウイスキー'), category: 'menu' },
        { name: 'ヘネシーVS', price: 1200, categoryId: getCatId('ブランデー'), category: 'menu' },
        { name: '赤ワイン グラス', price: 1000, categoryId: getCatId('ワイン'), category: 'wine' },
        { name: '白ワイン グラス', price: 1000, categoryId: getCatId('ワイン'), category: 'wine' },
        { name: 'ワインボトル', price: 8000, categoryId: getCatId('ワイン'), category: 'wine' },
        { name: 'モエ・エ・シャンドン', price: 15000, categoryId: getCatId('シャンパン'), category: 'champagne' },
        { name: 'ドンペリニヨン', price: 50000, categoryId: getCatId('シャンパン'), category: 'champagne' },
        { name: 'ヴーヴ・クリコ', price: 20000, categoryId: getCatId('シャンパン'), category: 'champagne' },
        { name: 'カシスオレンジ', price: 800, categoryId: getCatId('カクテル'), category: 'menu' },
        { name: 'ジントニック', price: 800, categoryId: getCatId('カクテル'), category: 'menu' },
        { name: '生ビール', price: 700, categoryId: getCatId('ビール'), category: 'menu' },
        { name: 'ウーロン茶', price: 500, categoryId: getCatId('ソフトドリンク'), category: 'menu' },
        { name: 'オレンジジュース', price: 500, categoryId: getCatId('ソフトドリンク'), category: 'menu' },
        { name: 'ミックスナッツ', price: 800, categoryId: getCatId('フード'), category: 'menu' },
        { name: 'フルーツ盛り合わせ', price: 2000, categoryId: getCatId('フード'), category: 'menu' },
        { name: 'キャストドリンク', price: 1000, categoryId: getCatId('キャストドリンク'), category: 'cast_drink' }
      ];
      sampleMenus.forEach(m => this.add('menus', { ...m, active: true }));
    }

    // Initialize sample casts if empty
    if (this.getAll('casts').length === 0) {
      const sampleCasts = [
        { name: 'あいり', hourlyRate: 2500, drinkBackPrice: 500, champagneBackPrice: 1000, wineBackPrice: 500, active: true },
        { name: 'みく', hourlyRate: 2000, drinkBackPrice: 500, champagneBackPrice: 1000, wineBackPrice: 500, active: true },
        { name: 'れな', hourlyRate: 2500, drinkBackPrice: 500, champagneBackPrice: 1000, wineBackPrice: 500, active: true },
        { name: 'ゆき', hourlyRate: 3000, drinkBackPrice: 600, champagneBackPrice: 1500, wineBackPrice: 500, active: true },
        { name: 'さくら', hourlyRate: 2000, drinkBackPrice: 500, champagneBackPrice: 1000, wineBackPrice: 500, active: true }
      ];
      sampleCasts.forEach(c => this.add('casts', c));
    }

    // Save default settings if not set
    const currentSettings = this.getSettings();
    if (!localStorage.getItem(this._key('settings'))) {
      this.saveSettings(currentSettings);
    }
  }

  // --- Data Management ---
  clearTransactions() {
    const collectionsToClear = [
      'table_sessions',
      'session_sets',
      'order_items',
      'payment_records',
      'nominations',
      'audit_logs',
      'daily_closings',
      'attendances',
      'salary_payments'
    ];
    collectionsToClear.forEach(col => {
      localStorage.removeItem(this._key(col));
      delete this._cache[col];
    });
    
    // Reset table status to vacant
    const tables = this.getAll('tables').map(t => ({ ...t, status: 'vacant' }));
    this._save('tables', tables);
    
    this.addAuditLog('data_clear_transactions', { timestamp: now() });
    window.location.reload();
  }

  clearAll() {
    // Clear everything with the prefix
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    this._cache = {};
    window.location.reload(); // Will trigger initDefaultData on next load
  }
}

export const store = new StoreManager();
