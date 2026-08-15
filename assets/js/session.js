/**
 * Client-side authentication state for the static site.
 *
 * Stores ONLY non-sensitive fields: id, username, role, token, login flag.
 * The password is never stored, never logged, never kept in memory after submit.
 *
 * "Remember me" -> localStorage, otherwise sessionStorage.
 * Requires assets/js/config.js to be loaded first.
 */
(function (window) {
  var STORAGE_KEY = 'shcg_auth';
  var CONFIG = window.SHCG_CONFIG || {};

  function stores() {
    return [window.localStorage, window.sessionStorage];
  }

  function save(session, remember) {
    clear();
    var target = remember ? window.localStorage : window.sessionStorage;
    try {
      target.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      /* storage disabled — the user simply stays logged out */
    }
  }

  function get() {
    for (var i = 0; i < stores().length; i += 1) {
      try {
        var raw = stores()[i].getItem(STORAGE_KEY);
        if (!raw) continue;
        var parsed = JSON.parse(raw);
        if (!parsed || !parsed.isLoggedIn || !parsed.token) continue;
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          clear();
          continue;
        }
        return parsed;
      } catch (error) {
        /* ignore malformed entries */
      }
    }
    return null;
  }

  function clear() {
    stores().forEach(function (store) {
      try {
        store.removeItem(STORAGE_KEY);
      } catch (error) {
        /* nothing to do */
      }
    });
  }

  function loginPageUrl(withReturn) {
    var url = CONFIG.LOGIN_PAGE || '/login.html';
    if (!withReturn) return url;
    return url + '?next=' + encodeURIComponent(window.location.pathname + window.location.search);
  }

  /** Redirects to the login page when there is no valid session. */
  function requireAuth() {
    var session = get();
    if (!session) {
      window.location.replace(loginPageUrl(true));
      return null;
    }
    return session;
  }

  function logout() {
    clear();
    window.location.replace(CONFIG.LOGIN_PAGE || '/login.html');
  }

  /** fetch() wrapper that attaches the Bearer token and handles expiry. */
  async function authFetch(endpointOrPath, options) {
    var session = get();
    if (!session) {
      logout();
      throw new Error('Not authenticated');
    }

    var settings = options || {};
    var headers = Object.assign({ Accept: 'application/json' }, settings.headers || {});
    headers.Authorization = 'Bearer ' + session.token;
    if (settings.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    var response = await fetch(CONFIG.url(endpointOrPath), Object.assign({}, settings, { headers: headers }));

    if (response.status === 401) {
      clear();
      window.location.replace(loginPageUrl(true));
      throw new Error('Session expired');
    }

    var data = await response.json().catch(function () {
      return {};
    });

    if (!response.ok || data.success === false) {
      throw new Error(data.message || 'Request failed.');
    }
    return data;
  }

  /** Wires up any element with [data-logout] (buttons, links, menu cards). */
  function bindLogoutControls() {
    document.querySelectorAll('[data-logout]').forEach(function (element) {
      element.addEventListener('click', function (event) {
        event.preventDefault();
        logout();
      });
    });
  }

  window.SHCG_AUTH = {
    STORAGE_KEY: STORAGE_KEY,
    save: save,
    get: get,
    clear: clear,
    requireAuth: requireAuth,
    logout: logout,
    authFetch: authFetch,
    bindLogoutControls: bindLogoutControls
  };
})(window);
