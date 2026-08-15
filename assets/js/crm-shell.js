/**
 * Shared chrome for every CRM page (dashboard.html and crm/*.html):
 *   Desktop — top header: logo (left), Dashboard/Search User/Statistics
 *             (center), search + notifications + logout (right).
 *   Mobile  — logo-only top bar + a fixed 5-icon bottom tab bar
 *             (Dashboard/Search/New Order/Statistics/Logout).
 *
 * Renders into a `<div id="crmShell"></div>` placeholder so the markup
 * lives in one place instead of being duplicated per page.
 *
 * Requires config.js + session.js loaded first. Auth-gates the page: if
 * there is no valid session, SHCG_AUTH.requireAuth() redirects to login
 * and init() returns null without rendering anything.
 */
(function (window) {
  // Desktop header + mobile bottom tabs (5th tab, New Order, is mobile-only).
  var HEADER_NAV = [
    { key: 'dashboard', href: '/dashboard.html', label: 'Dashboard', icon: 'grid' },
    { key: 'search', href: '/crm/search.html', label: 'Search User', icon: 'users' },
    { key: 'statistics', href: '/crm/statistics.html', label: 'Statistics', icon: 'chart' }
  ];

  var TAB_NAV = [
    { key: 'dashboard', href: '/dashboard.html', label: 'Dashboard', icon: 'grid', color: '#2563eb' },
    { key: 'search', href: '/crm/search.html', label: 'Search', icon: 'users', color: '#16a34a' },
    { key: 'statistics', href: '/crm/statistics.html', label: 'Statistics', icon: 'chart', color: '#7c3aed' },
    { key: 'logout', label: 'Logout', icon: 'logout', color: '#dc2626', logout: true }
  ];

  var ICONS = {
    grid: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
    users: '<circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M4 20h16"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>'
  };

  function svg(iconKey, extraAttrs) {
    return '<svg viewBox="0 0 24 24" ' + (extraAttrs || '') + '>' + (ICONS[iconKey] || '') + '</svg>';
  }

  function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function render(activeKey) {
    var root = document.getElementById('crmShell');
    if (!root) return;

    var headerLinks = HEADER_NAV.map(function (item) {
      var active = item.key === activeKey ? ' is-active' : '';
      return '<a href="' + item.href + '" class="crm-header-nav-item' + active + '">' + svg(item.icon) + item.label + '</a>';
    }).join('');

    var tabs = TAB_NAV.map(function (item) {
      var active = item.key === activeKey ? ' is-active' : '';
      var style = 'style="--tab-color:' + item.color + '"';
      if (item.logout) {
        return (
          '<button type="button" class="crm-tab' + active + '" ' + style + ' data-logout>' +
          svg(item.icon) +
          '<span>' + item.label + '</span></button>'
        );
      }
      return (
        '<a href="' + item.href + '" class="crm-tab' + active + '" ' + style + '>' +
        svg(item.icon) +
        '<span>' + item.label + '</span></a>'
      );
    }).join('');

    root.innerHTML =
      '<header class="crm-header">' +
      '<div class="crm-header-row">' +
      '<a href="/dashboard.html" class="crm-header-logo"><img src="/assets/images/Logo.png" alt="Shree Hari Chasma Ghar" /></a>' +
      '<nav class="crm-header-nav">' +
      headerLinks +
      '</nav>' +
      '<div class="crm-header-actions">' +
      '<div class="crm-search">' +
      svg('search') +
      '<input type="search" id="globalSearch" placeholder="Search customers, orders, bill no..." autocomplete="off" />' +
      '<div class="crm-search-results" id="searchResults"></div>' +
      '</div>' +
      '<button class="crm-icon-btn" id="notifButton" aria-label="Recent activity">' +
      svg('bell') +
      '<span class="dot" id="notifDot"></span></button>' +
      '<div class="crm-notif-panel" id="notifPanel"></div>' +
      '<button class="crm-logout-btn" type="button" data-logout aria-label="Logout">' +
      svg('logout') +
      '<span>Logout</span></button>' +
      '</div>' +
      '</div>' +
      '</header>' +
      '<main class="crm-content" id="crmPageContent"></main>' +
      '<nav class="crm-bottom-tabs" aria-label="Primary">' +
      tabs +
      '</nav>';

    window.SHCG_AUTH.bindLogoutControls();
    initGlobalSearch();
  }

  function initGlobalSearch() {
    var input = document.getElementById('globalSearch');
    var results = document.getElementById('searchResults');
    var timer = null;

    function fmtMoney(n) {
      return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    }

    function renderResults(data) {
      var parts = [];
      if (data.customers.length) {
        parts.push('<div class="crm-search-group-label">Customers</div>');
        data.customers.forEach(function (c) {
          parts.push(
            '<a class="crm-search-row" href="/crm/customer.html?id=' +
              encodeURIComponent(c.userId) +
              '"><span class="customer-name">' +
              escapeHtml(c.name || 'Unnamed') +
              '</span><span>' +
              escapeHtml(c.mobile || '—') +
              '</span></a>'
          );
        });
      }
      if (data.orders.length) {
        parts.push('<div class="crm-search-group-label">Orders</div>');
        data.orders.forEach(function (o) {
          parts.push(
            '<a class="crm-search-row" href="/crm/order.html?id=' +
              encodeURIComponent(o.orderId) +
              '"><span>Order #' +
              escapeHtml(o.orderId) +
              (o.billNo ? ' · Bill ' + escapeHtml(o.billNo) : ' · No Bill') +
              '</span><span>' +
              fmtMoney(o.amount) +
              '</span></a>'
          );
        });
      }
      if (data.frameTypes.length) {
        parts.push('<div class="crm-search-group-label">Frame Types</div>');
        data.frameTypes.forEach(function (f) {
          parts.push('<div class="crm-search-row"><span>' + escapeHtml(f) + '</span></div>');
        });
      }
      if (!parts.length) {
        parts.push('<div class="crm-search-empty">No matches for “' + escapeHtml(data.query) + '”.</div>');
      }
      results.innerHTML = parts.join('');
      results.classList.add('open');
    }

    input.addEventListener('input', function () {
      var q = input.value.trim();
      clearTimeout(timer);
      if (!q) {
        results.classList.remove('open');
        return;
      }
      timer = setTimeout(function () {
        window.SHCG_AUTH.authFetch(window.SHCG_CONFIG.endpoints.search + '?q=' + encodeURIComponent(q))
          .then(renderResults)
          .catch(function () {
            results.innerHTML = '<div class="crm-search-empty">Search failed. Try again.</div>';
            results.classList.add('open');
          });
      }, 300);
    });

    document.addEventListener('click', function (e) {
      if (!results.contains(e.target) && e.target !== input) results.classList.remove('open');
    });
  }

  function renderNotifications(activity) {
    var panel = document.getElementById('notifPanel');
    var dot = document.getElementById('notifDot');
    if (!panel) return;
    if (!activity || !activity.length) {
      panel.innerHTML = '<div class="crm-notif-row">No recent activity yet.</div>';
      if (dot) dot.style.display = 'none';
      return;
    }
    if (dot) dot.style.display = 'block';
    panel.innerHTML = activity
      .map(function (a) {
        return '<div class="crm-notif-row">' + escapeHtml(a.text) + '</div>';
      })
      .join('');

    var btn = document.getElementById('notifButton');
    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        panel.classList.toggle('open');
      });
      document.addEventListener('click', function (e) {
        if (!panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) panel.classList.remove('open');
      });
    }
  }

  /**
   * Gate + render. Returns the session, or null when the guard redirected.
   * `activeKey` highlights the matching nav item (see HEADER_NAV/TAB_NAV keys).
   */
  function init(activeKey) {
    var session = window.SHCG_AUTH.requireAuth();
    if (!session) return null;
    render(activeKey);
    document.documentElement.classList.remove('auth-pending');
    return session;
  }

  window.SHCG_SHELL = { init: init, escapeHtml: escapeHtml, renderNotifications: renderNotifications };
})(window);
