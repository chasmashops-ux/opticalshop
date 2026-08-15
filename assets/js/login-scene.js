/**
 * Cinematic login scene controller for login.html.
 *
 * Purely presentational: entrance choreography (fade in -> character walks
 * to the sofa -> sits), the password show/hide toggle, and the success/error
 * reactions. Contains NO authentication logic and never decides whether a
 * login succeeded — assets/js/auth.js owns the API call and calls into
 * window.SHCG_SCENE only after it already knows the real result.
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

  /* ---------------------------- entrance ---------------------------- */

  function playEntrance() {
    var track = document.getElementById('characterTrack');
    if (!track) return;

    if (!MOTION_OK) {
      track.classList.add('is-visible', 'at-sofa', 'sitting', 'sitting-idle');
      return;
    }

    // 1. Character fades in, standing far right.
    afterMs(500, function () {
      track.classList.add('is-visible');
    });

    // 2. Character walks to the sofa.
    afterMs(1000, function () {
      track.classList.add('walking', 'at-sofa');
    });

    // 3. Arrival: stop walking, sit down.
    afterMs(1000 + 1700, function () {
      track.classList.remove('walking');
      track.classList.add('sitting');
    });

    // 4. Settle into the idle breathing loop.
    afterMs(1000 + 1700 + 380, function () {
      track.classList.add('sitting-idle');
    });
  }

  /* ---------------------------- error reaction ---------------------------- */

  function playError() {
    var card = document.getElementById('loginCard');
    if (card) {
      card.classList.remove('is-shaking');
      // Force reflow so the shake can replay on consecutive failed attempts.
      void card.offsetWidth;
      card.classList.add('is-shaking');
    }
    // The character stays seated on a failed attempt — no pose change needed.
  }

  /* ---------------------------- success exit ---------------------------- */

  /**
   * Stands the character up, walks them off-screen, fades the page, then
   * calls onDone(). Always calls onDone (a safety-net timeout guarantees
   * it even if something in the animation chain fails), so navigation to
   * the dashboard is never blocked by a broken animation.
   */
  function playSuccessAndNavigate(onDone) {
    var track = document.getElementById('characterTrack');
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
      afterMs(150, finish);
      return;
    }

    // Safety net: never let a broken animation strand the user on this page.
    afterMs(2400, finish);

    if (card) card.classList.add('is-leaving');

    if (track) {
      // 1. Stand up (removing sitting lets the base transition run).
      track.classList.remove('sitting', 'sitting-idle');

      // 2. Walk off to the right.
      afterMs(340, function () {
        track.classList.add('walking', 'exiting');
      });
    }

    // 3. Cinematic fade to white right before navigating.
    afterMs(1350, function () {
      if (veil) veil.classList.add('is-active');
    });

    afterMs(1750, finish);
  }

  window.SHCG_SCENE = {
    playError: playError,
    playSuccessAndNavigate: playSuccessAndNavigate
  };

  document.addEventListener('DOMContentLoaded', function () {
    // Already signed in? auth.js will redirect immediately — don't animate.
    if (window.SHCG_AUTH && window.SHCG_AUTH.get()) return;
    initPasswordToggle();
    playEntrance();
  });
})(window);
