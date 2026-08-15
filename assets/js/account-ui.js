/**
 * Shared chrome for the /account/ pages: header, nav, user pill, logout.
 * Follows the same "render the shell from JS" pattern as assets/js/layout.js.
 *
 * Requires config.js and session.js to be loaded first.
 */
(function (window) {
  var LINKS = [
    { href: '/account/', label: 'Dashboard' },
    { href: '/account/search-user.html', label: 'Search User' },
    { href: '/account/add-user.html', label: 'Add User' },
    { href: '/account/reports.html', label: 'Year-wise Report' },
    { href: '/dashboard.html', label: 'Main Dashboard' }
  ];

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

    header.innerHTML =
      '<header class="dashboard-header">' +
      '<a href="/account/" class="brand-label"><img src="/assets/images/Logo.png" alt="Shree Hari Chasma Ghar" class="brand-logo" /></a>' +
      '<div class="header-actions">' +
      '<div class="user-pill">👤 ' +
      escapeHtml(session.username || 'Admin') +
      ' <span class="role-tag">' +
      escapeHtml(session.role || 'admin') +
      '</span></div>' +
      '<button class="logout-btn" type="button" data-logout>Logout</button>' +
      '</div>' +
      '</header>' +
      '<nav class="account-nav">' +
      LINKS.map(function (link) {
        var active = link.href === here ? ' class="active"' : '';
        return '<a href="' + link.href + '"' + active + '>' + link.label + '</a>';
      }).join('') +
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
