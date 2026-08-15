/**
 * Single source of truth for the Cloudflare Worker API URL.
 * Change the Worker URL HERE ONLY — no other file hardcodes it.
 *
 * Contains no secrets: the D1 database is reachable only from the Worker.
 */
window.SHCG_CONFIG = {
  API_BASE: 'https://opticalshop.chasmashops.workers.dev',

  LOGIN_PAGE: '/login.html',
  DASHBOARD_PAGE: '/dashboard.html',

  endpoints: {
    login: '/api/login',
    users: '/api/users',
    stats: '/api/stats',
    yearlyStats: '/api/stats/yearly',
    health: '/api/health',
    dashboard: '/api/dashboard',
    search: '/api/search',
    customers: '/api/customers',
    orders: '/api/orders'
  }
};

window.SHCG_CONFIG.url = function (endpointOrPath) {
  var path = window.SHCG_CONFIG.endpoints[endpointOrPath] || endpointOrPath;
  return window.SHCG_CONFIG.API_BASE + path;
};
