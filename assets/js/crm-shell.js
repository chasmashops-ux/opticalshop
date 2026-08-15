/**
 * Shared sidebar + topbar chrome for every CRM page (dashboard.html and
 * crm/*.html). Renders into a `<div id="crmShell"></div>` placeholder so
 * the markup lives in one place instead of being duplicated per page.
 *
 * Requires config.js + session.js loaded first. Auth-gates the page: if
 * there is no valid session, SHCG_AUTH.requireAuth() redirects to login
 * and init() returns null without rendering anything.
 */
(function (window) {
  var NAV = [
    { key: 'dashboard', href: '/dashboard.html', label: 'Dashboard', icon: 'grid' },
    { key: 'search', href: '/crm/search.html', label: 'Customers', icon: 'users' },
    { key: 'orders', href: '/dashboard.html#recentOrdersSection', label: 'Orders', icon: 'bag' },
    { key: 'current-month', href: '/crm/current-month.html', label: 'This Month', icon: 'calendar' },
    { key: 'new-order', href: '/crm/new-order.html', label: 'New Order', icon: 'plus' },
    { key: 'invoices', label: 'Invoices', icon: 'receipt', soon: true },
    { key: 'products', href: '/dashboard.html#frameAnalyticsSection', label: 'Products / Frames', icon: 'glasses' },
    { key: 'statistics', label: 'Statistics & Reports', icon: 'chart', soon: true },
    { key: 'settings', label: 'Settings', icon: 'gear', soon: true }
  ];

  var ICONS = {
    grid: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
    users: '<circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5"/>',
    bag: '<path d="M4 8h16l-1.4 11.2a1.5 1.5 0 0 1-1.5 1.3H6.9a1.5 1.5 0 0 1-1.5-1.3L4 8Z"/><path d="M8 8V6a4 4 0 1 1 8 0v2"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="16" rx="2.2"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
    plus: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    receipt: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    glasses: '<circle cx="6.5" cy="12" r="3.2"/><circle cx="17.5" cy="12" r="3.2"/><path d="M9.7 12h4.6M2 11l1.5 1M22 11l-1.5 1"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M4 20h16"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.36a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.64 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.64 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.64a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.36 9c.1.36.5 1 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>'
  };

  function svg(iconKey, extraAttrs) {
    return '<svg viewBox="0 0 24 24" ' + (extraAttrs || '') + '>' + (ICONS[iconKey] || '') + '</svg>';
  }

  function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderNav(activeKey) {
    return NAV.map(function (item) {
      if (item.soon) {
        return (
          '<span class="crm-nav-item is-disabled" title="Not built yet">' +
          svg(item.icon) +
          item.label +
          '<span class="crm-nav-soon">Soon</span></span>'
        );
      }
      var active = item.key === activeKey ? ' is-active' : '';
      return '<a href="' + item.href + '" class="crm-nav-item' + active + '">' + svg(item.icon) + item.label + '</a>';
    }).join('');
  }

  function render(activeKey, session) {
    var root = document.getElementById('crmShell');
    if (!root) return;

    root.innerHTML =
      '<div class="crm-backdrop" id="crmBackdrop"></div>' +
      '<aside class="crm-sidebar" id="crmSidebar">' +
      '<div class="crm-sidebar-brand"><a href="/dashboard.html"><img src="/assets/images/Logo.png" alt="Shree Hari Chasma Ghar" /></a>' +
      '<button class="crm-sidebar-close" id="sidebarClose" aria-label="Close menu">&times;</button></div>' +
      '<nav class="crm-nav">' +
      '<div class="crm-nav-group-label">Main</div>' +
      renderNav(activeKey) +
      '<div class="crm-nav-group-label">Login Accounts</div>' +
      '<a href="/account/" class="crm-nav-item">' +
      svg('search') +
      'Account Admin</a>' +
      '</nav>' +
      '<div class="crm-sidebar-foot">' +
      '<div class="crm-profile"><div class="crm-profile-avatar" id="profileAvatar">A</div>' +
      '<div><div class="crm-profile-name" id="profileName">Admin</div><div class="crm-profile-role" id="profileRole">admin</div></div></div>' +
      '<button class="logout-btn" type="button" data-logout>Logout</button>' +
      '</div>' +
      '</aside>' +
      '<div class="crm-main">' +
      '<header class="crm-topbar">' +
      '<button class="crm-sidebar-toggle" id="sidebarToggle" aria-label="Open menu">' +
      svg('grid', 'width="20" height="20" stroke="#334155" stroke-width="2" fill="none"') +
      '</button>' +
      '<div class="crm-search">' +
      svg('search') +
      '<input type="search" id="globalSearch" placeholder="Search customers, orders, bill no, frame type..." autocomplete="off" />' +
      '<div class="crm-search-results" id="searchResults"></div>' +
      '</div>' +
      '<div class="crm-topbar-actions">' +
      '<button class="crm-icon-btn" id="notifButton" aria-label="Recent activity">' +
      svg('bell') +
      '<span class="dot" id="notifDot"></span></button>' +
      '<div class="crm-notif-panel" id="notifPanel"></div>' +
      '</div>' +
      '</header>' +
      '<main class="crm-content" id="crmPageContent"></main>' +
      '</div>';

    document.getElementById('profileAvatar').textContent = (session.username || 'A').trim().charAt(0).toUpperCase() || 'A';
    document.getElementById('profileName').textContent = session.username || 'Admin';
    document.getElementById('profileRole').textContent = session.role || 'admin';

    window.SHCG_AUTH.bindLogoutControls();
    initSidebarToggle();
    initGlobalSearch();
  }

  function initSidebarToggle() {
    var sidebar = document.getElementById('crmSidebar');
    var backdrop = document.getElementById('crmBackdrop');
    var toggle = document.getElementById('sidebarToggle');
    var close = document.getElementById('sidebarClose');

    function open() {
      sidebar.classList.add('open');
      backdrop.classList.add('open');
    }
    function shut() {
      sidebar.classList.remove('open');
      backdrop.classList.remove('open');
    }

    toggle.addEventListener('click', open);
    close.addEventListener('click', shut);
    backdrop.addEventListener('click', shut);
  }

  function initGlobalSearch() {
    var input = document.getElementById('globalSearch');
    var results = document.getElementById('searchResults');
    var timer = null;

    function fmtMoney(n) {
      return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    }

    function render(data) {
      var parts = [];
      if (data.customers.length) {
        parts.push('<div class="crm-search-group-label">Customers</div>');
        data.customers.forEach(function (c) {
          parts.push(
            '<a class="crm-search-row" href="/crm/customer.html?id=' +
              encodeURIComponent(c.userId) +
              '"><span>' +
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
          .then(render)
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
   * `activeKey` highlights the matching sidebar item (see NAV keys above).
   */
  function init(activeKey) {
    var session = window.SHCG_AUTH.requireAuth();
    if (!session) return null;
    render(activeKey, session);
    document.documentElement.classList.remove('auth-pending');
    return session;
  }

  window.SHCG_SHELL = { init: init, escapeHtml: escapeHtml, renderNotifications: renderNotifications };
})(window);
