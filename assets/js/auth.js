/**
 * Login page controller for login.html.
 *
 * Sends the credentials to the real Cloudflare Worker (URL comes from
 * assets/js/config.js — never hardcoded here, never a relative /api/login).
 * The password is only read from the input, posted, and discarded.
 */
document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('loginForm');
  if (!form) return;

  var usernameInput = document.getElementById('username');
  var passwordInput = document.getElementById('password');
  var rememberInput = document.getElementById('rememberMe');
  var messageBox = document.getElementById('loginMessage');
  var submitButton = document.getElementById('loginButton');
  var buttonLabel = submitButton ? submitButton.querySelector('.btn-text') : null;

  var CONFIG = window.SHCG_CONFIG;
  var AUTH = window.SHCG_AUTH;
  var isSubmitting = false;

  if (!CONFIG || !AUTH) {
    showMessage('Configuration failed to load. Please refresh the page.', 'error');
    return;
  }

  // Already signed in? Skip straight to the dashboard.
  if (AUTH.get()) {
    window.location.replace(nextTarget());
    return;
  }

  function nextTarget() {
    var next = new URLSearchParams(window.location.search).get('next');
    // Only allow same-site paths so ?next= cannot redirect off the site.
    if (next && /^\/[A-Za-z0-9._/-]*$/.test(next)) return next;
    return CONFIG.DASHBOARD_PAGE;
  }

  function showMessage(text, type) {
    if (!messageBox) return;
    messageBox.textContent = text;
    messageBox.className = type || '';
  }

  function setLoading(loading) {
    isSubmitting = loading;
    if (!submitButton) return;
    submitButton.disabled = loading;
    submitButton.classList.toggle('is-loading', loading);
    if (buttonLabel) buttonLabel.textContent = loading ? 'Logging in...' : 'Login';
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    // Guard against double-click / repeated Enter presses.
    if (isSubmitting) return;

    var username = (usernameInput.value || '').trim();
    var password = passwordInput.value || '';

    if (!username || !password) {
      showMessage('Please enter your username and password.', 'error');
      return;
    }

    setLoading(true);
    showMessage('Checking your credentials...', '');

    try {
      var response = await fetch(CONFIG.url('login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ username: username, password: password })
      });

      var result = await response.json().catch(function () {
        return {};
      });

      if (!response.ok || result.success !== true) {
        setLoading(false);
        passwordInput.value = '';
        showMessage(result.message || 'Invalid username or password', 'error');
        return;
      }

      AUTH.save(
        {
          isLoggedIn: true,
          id: result.user ? result.user.id : '',
          username: result.user ? result.user.username : username,
          role: result.user ? result.user.role : 'admin',
          token: result.token,
          expiresAt: Date.now() + (result.expiresIn || 8 * 60 * 60) * 1000
        },
        Boolean(rememberInput && rememberInput.checked)
      );

      // Clear the password field before leaving the page.
      passwordInput.value = '';
      showMessage('Login successful. Redirecting...', 'success');
      window.location.replace(nextTarget());
    } catch (error) {
      setLoading(false);
      // Deliberately does not log the request body — no password reaches the console.
      showMessage('Could not reach the server. Please check your connection and try again.', 'error');
    }
  });
});
