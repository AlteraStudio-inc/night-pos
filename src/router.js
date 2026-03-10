// ============================================
// SPA Hash Router
// ============================================

class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.beforeEach = null;
    window.addEventListener('hashchange', () => this._handleRoute());
  }

  register(path, handler) {
    this.routes[path] = handler;
  }

  navigate(path) {
    window.location.hash = '#' + path;
  }

  _handleRoute() {
    const hash = window.location.hash.slice(1) || '/';
    const [path, queryStr] = hash.split('?');
    const params = {};
    
    if (queryStr) {
      queryStr.split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        params[decodeURIComponent(key)] = decodeURIComponent(value || '');
      });
    }

    // Match route with dynamic segments
    let matchedHandler = null;
    let routeParams = {};

    for (const [pattern, handler] of Object.entries(this.routes)) {
      const match = this._matchRoute(pattern, path);
      if (match) {
        matchedHandler = handler;
        routeParams = { ...match, ...params };
        break;
      }
    }

    if (this.beforeEach) {
      const canProceed = this.beforeEach(path, routeParams);
      if (!canProceed) return;
    }

    if (matchedHandler) {
      this.currentRoute = path;
      matchedHandler(routeParams);
    } else if (this.routes['/404']) {
      this.routes['/404'](params);
    }
  }

  _matchRoute(pattern, path) {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) return null;

    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = pathParts[i];
      } else if (patternParts[i] !== pathParts[i]) {
        return null;
      }
    }
    return params;
  }

  start() {
    this._handleRoute();
  }

  getCurrentPath() {
    return (window.location.hash.slice(1) || '/').split('?')[0];
  }
}

export const router = new Router();
