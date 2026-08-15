/**
 * Premium login page UI controller (login.html).
 *
 * Purely presentational: password show/hide toggle and the error/success
 * micro-interactions. Contains NO authentication logic and never decides
 * whether a login succeeded — assets/js/auth.js owns the API call and
 * calls into window.SHCG_SCENE only after it already knows the real
 * result. The global name and its two methods are kept exactly as auth.js
 * expects, so auth.js needed zero changes for this redesign.
 */
(function (window) {
  var MOTION_OK = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function afterMs(ms, fn) {
    return window.setTimeout(fn, ms);
  }

  function initPasswordToggle() {
    var btn = document.getElementById('togglePassword');
    var input = document.getElementById('password');
    if (!btn || !input) return;

    btn.addEventListener('click', function () {
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-pressed', show ? 'true' : 'false');
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  }

  /** Shakes the card with a red-tinted flash on a failed login attempt. */
  function playError() {
    var card = document.getElementById('loginCard');
    if (!card) return;
    card.classList.remove('is-shaking');
    // Force reflow so the shake can replay on consecutive failed attempts.
    void card.offsetWidth;
    card.classList.add('is-shaking');
  }

  /**
   * Fades the card out, fades the page to the background color, then
   * calls onDone(). Always calls onDone (a safety-net timeout guarantees
   * it even if something in the animation chain fails), so navigation to
   * the dashboard is never blocked by a broken animation. Total runtime
   * is under 700ms — this is a brief transition, not a scene.
   */
  function playSuccessAndNavigate(onDone) {
    var card = document.getElementById('loginCard');
    var veil = document.getElementById('sceneExitVeil');
    var done = false;

    function finish() {
      if (done) return;
      done = true;
      onDone();
    }

    if (!MOTION_OK) {
      if (card) card.classList.add('is-leaving');
      afterMs(120, finish);
      return;
    }

    // Safety net: never let a broken animation strand the user on this page.
    afterMs(900, finish);

    if (card) card.classList.add('is-leaving');
    afterMs(250, function () {
      if (veil) veil.classList.add('is-active');
    });
    afterMs(600, finish);
  }

  window.SHCG_SCENE = {
    playError: playError,
    playSuccessAndNavigate: playSuccessAndNavigate
  };

  document.addEventListener('DOMContentLoaded', function () {
    // Already signed in? auth.js will redirect immediately — don't bother.
    if (window.SHCG_AUTH && window.SHCG_AUTH.get()) return;
    initPasswordToggle();
  });
})(window);
