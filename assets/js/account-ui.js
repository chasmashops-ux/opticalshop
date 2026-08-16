/**
 * Shared chrome for the /account/ pages: header, nav, user pill, logout.
 * Follows the same "render the shell from JS" pattern as assets/js/layout.js.
 *
 * Requires config.js and session.js to be loaded first.
 */
(function (window) {
  // Same 5 destinations as before — only the chrome rendering them changed,
  // to match the crm-header / crm-bottom-tabs pattern used everywhere else
  // (see assets/js/crm-shell.js). Icons are duplicated locally rather than
  // shared from crm-shell.js to avoid coupling the two shells together.
  var LINKS = [
    { href: '/account/', label: 'Dashboard', tabLabel: 'Dashboard', icon: 'grid' },
    { href: '/account/search-user.html', label: 'Search User', tabLabel: 'Search', icon: 'search' },
    { href: '/account/add-user.html', label: 'Add User', tabLabel: 'Add User', icon: 'userPlus' },
    { href: '/account/reports.html', label: 'Year-wise Report', tabLabel: 'Report', icon: 'chart' },
    { href: '/dashboard.html', label: 'Main Dashboard', tabLabel: 'CRM', icon: 'external' }
  ];

  var ICONS = {
    grid: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    userPlus: '<circle cx="9" cy="8" r="3.4"/><path d="M2.5 20c0-3.9 3-6.5 6.5-6.5s6.5 2.6 6.5 6.5"/><path d="M18 8v6M15 11h6"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M4 20h16"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>'
  };

  function svg(iconKey) {
    return '<svg viewBox="0 0 24 24">' + (ICONS[iconKey] || '') + '</svg>';
  }

  function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function currentPath() {
    var path = window.location.pathname;
    return path.endsWith('/index.html') ? path.slice(0, -'index.html'.length) : path;
  }

  function render(session) {
    var header = document.getElementById('account-header');
    if (!header) return;
    var here = currentPath();

    var headerLinks = LINKS.map(function (link) {
      var active = link.href === here ? ' is-active' : '';
      return (
        '<a href="' + link.href + '" class="crm-header-nav-item' + active + '" title="' + escapeHtml(link.label) + '">' +
        svg(link.icon) +
        link.tabLabel +
        '</a>'
      );
    }).join('');

    var tabColors = ['#2563eb', '#16a34a', '#7c3aed', '#d97706', '#0891b2'];
    var tabs = LINKS.map(function (link, i) {
      var active = link.href === here ? ' is-active' : '';
      return (
        '<a href="' + link.href + '" class="crm-tab' + active + '" style="--tab-color:' + tabColors[i % tabColors.length] + '">' +
        svg(link.icon) +
        '<span>' + link.tabLabel + '</span></a>'
      );
    }).join('');
    tabs +=
      '<button type="button" class="crm-tab" style="--tab-color:#dc2626" data-logout>' +
      svg('logout') +
      '<span>Logout</span></button>';

    header.innerHTML =
      '<header class="crm-header">' +
      '<div class="crm-header-row">' +
      '<a href="/account/" class="crm-header-logo"><img src="/assets/images/Logo.png" alt="Shree Hari Chasma Ghar" /></a>' +
      '<nav class="crm-header-nav">' +
      headerLinks +
      '</nav>' +
      '<div class="crm-header-actions">' +
      '<div class="user-pill">👤 ' +
      escapeHtml(session.username || 'Admin') +
      ' <span class="role-tag">' +
      escapeHtml(session.role || 'admin') +
      '</span></div>' +
      '<button class="crm-logout-btn" type="button" data-logout aria-label="Logout">' +
      svg('logout') +
      '<span>Logout</span></button>' +
      '</div>' +
      '</div>' +
      '</header>' +
      '<nav class="crm-bottom-tabs" aria-label="Primary">' +
      tabs +
      '</nav>';

    window.SHCG_AUTH.bindLogoutControls();
  }

  /**
   * Gate + render. Returns the session, or null when the guard redirected.
   * Every /account/ page calls this on DOMContentLoaded.
   */
  function initAccountPage() {
    var session = window.SHCG_AUTH.requireAuth();
    if (!session) return null;
    render(session);
    document.documentElement.classList.remove('auth-pending');
    return session;
  }

  window.SHCG_ACCOUNT = { init: initAccountPage, escapeHtml: escapeHtml };
})(window);
