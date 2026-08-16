/**
 * Floating "scroll to top" button — fixed bottom-right, appears once the
 * page has scrolled down, scrolls smoothly back to top on click. Pure UI,
 * no auth/session/API dependency, safe to load on every CRM/account page.
 *
 * Scrolls with its own eased animation (fixed ~550ms duration) rather than
 * the browser's native `behavior: 'smooth'` — on a short page the native
 * version can finish in well under 100ms and reads as an instant jump
 * instead of a visible scroll.
 */
(function () {
  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  function animatedScrollToTop(duration) {
    var start = window.scrollY || document.documentElement.scrollTop;
    if (start <= 0) return;
    var startTime = null;

    function step(timestamp) {
      if (startTime === null) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      window.scrollTo(0, start - start * easeInOutQuad(progress));
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  function init() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'scroll-top-btn';
    btn.setAttribute('aria-label', 'Scroll to top');
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>';
    document.body.appendChild(btn);

    function toggle() {
      btn.classList.toggle('show', window.scrollY > 400);
    }

    btn.addEventListener('click', function () {
      // Brief press feedback so the click itself is felt immediately,
      // independent of how long the scroll animation takes.
      btn.classList.add('is-pressed');
      setTimeout(function () {
        btn.classList.remove('is-pressed');
      }, 220);
      animatedScrollToTop(550);
    });

    window.addEventListener('scroll', toggle, { passive: true });
    toggle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
