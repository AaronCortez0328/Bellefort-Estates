/* Executive Summary presentation and accessible navbar behavior. No portal API calls. */
(function () {
  'use strict';
  var summary = document.getElementById('executive-summary');
  if (!summary) return;
  var motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduceMotion = motionPreference.matches;
  var revealObserver;
  function setupMotion() {
    reduceMotion = motionPreference.matches;
    if (revealObserver) revealObserver.disconnect();
    if (reduceMotion || !('IntersectionObserver' in window)) {
      summary.classList.remove('exec-motion');
      return;
    }
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('exec-revealed');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    summary.querySelectorAll('[data-exec-reveal]').forEach(function (element) {
      element.style.setProperty('--exec-delay', Math.min(Number(element.dataset.execStep) || 0, 2) * 65 + 'ms');
      if (!element.classList.contains('exec-revealed')) revealObserver.observe(element);
    });
    summary.classList.add('exec-motion');
  }
  setupMotion();
  motionPreference.addEventListener('change', setupMotion);
  summary.addEventListener('focusin', function (event) {
    var element = event.target.closest('[data-exec-reveal]');
    if (element) element.classList.add('exec-revealed');
  });
  var roleSelect = summary.querySelector('#exec-role');
  if (roleSelect) {
    roleSelect.closest('.exec-role-filter').hidden = false;
    function showRole() {
      var role = roleSelect.value;
      summary.querySelectorAll('.exec-table--roles').forEach(function (table) {
        table.classList.toggle('is-filtered', role !== 'all');
        table.querySelectorAll('[data-role-column]').forEach(function (cell) {
          cell.hidden = role !== 'all' && cell.getAttribute('data-role-column') !== role;
        });
      });
      summary.querySelector('.exec-role-status').textContent = role === 'all'
        ? 'Showing all proposed roles. Scroll each table horizontally to compare.'
        : 'Showing proposed access for ' + roleSelect.options[roleSelect.selectedIndex].text + '.';
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    }
    roleSelect.addEventListener('change', showRole);
    showRole();
  }

  function revealTarget(target) {
    for (var node = target; node; node = node.parentElement) {
      if (node.tagName === 'DETAILS') node.open = true;
    }
  }
  function getHashTarget() {
    try { return document.getElementById(decodeURIComponent(location.hash.slice(1))); }
    catch (error) { return null; }
  }
  function navigateTo(target, focus, instant) {
    revealTarget(target);
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    requestAnimationFrame(function () {
      if (focus) {
        if (!target.hasAttribute('tabindex')) {
          target.setAttribute('tabindex', '-1');
          target.addEventListener('blur', function () { target.removeAttribute('tabindex'); }, { once: true });
        }
        target.focus({ preventScroll: true });
      }
      var header = document.querySelector('.header');
      var top = target.getBoundingClientRect().top + window.scrollY - (header.offsetHeight - 4);
      window.scrollTo({ top: Math.max(0, top), behavior: instant || reduceMotion ? 'instant' : 'smooth' });
    });
  }
  document.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target.closest('a[href^="#"]');
    if (!link) return;
    var target;
    try { target = document.getElementById(decodeURIComponent(link.hash.slice(1))); }
    catch (error) { return; }
    if (!target || !(summary.contains(link) || target === summary || summary.contains(target))) return;
    event.preventDefault();
    event.stopPropagation();
    if (link.closest('.mobile-menu')) closeMenu(false);
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
    navigateTo(target, true, false);
  }, true);
  function restoreHash() {
    var target = getHashTarget();
    if (target && (target === summary || summary.contains(target) || target.id === 'privacy' || target.id === 'portal-plan')) {
      navigateTo(target, false, true);
    }
  }
  window.addEventListener('load', restoreHash);
  window.addEventListener('popstate', restoreHash);
  window.addEventListener('hashchange', restoreHash);
  summary.querySelectorAll('details').forEach(function (detail) {
    detail.addEventListener('toggle', function () {
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    });
  });
  // Long disclosures can be closed where the reader finishes, including nested
  // proposal notes and the Portal Plan's sources. Native summaries still work.
  document.querySelectorAll('main details').forEach(function (detail, index) {
    var heading = detail.querySelector(':scope > summary');
    if (!heading || detail.querySelector(':scope > .exec-collapse-footer')) return;
    if (!detail.id) detail.id = 'exec-disclosure-' + (index + 1);
    var footerControl = document.createElement('div');
    footerControl.className = 'exec-collapse-footer';
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'exec-collapse';
    button.textContent = 'Collapse this section';
    button.setAttribute('aria-label', 'Collapse this section: ' + heading.textContent.trim());
    button.setAttribute('aria-controls', detail.id);
    button.addEventListener('click', function () {
      detail.open = false;
      // Let native toggle handlers and scroll anchoring settle before returning.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (window.ScrollTrigger) window.ScrollTrigger.refresh();
          heading.focus({ preventScroll: true });
          var headerHeight = document.querySelector('.header').offsetHeight;
          var roleBar = detail.id !== 'summary-access' && detail.closest('#summary-access')
            ? summary.querySelector('.exec-role-filter') : null;
          var roleClearance = roleBar && !roleBar.hidden ? roleBar.offsetHeight + 8 : 0;
          var top = heading.getBoundingClientRect().top + window.scrollY - headerHeight - 16 - roleClearance;
          window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
        });
      });
    });
    footerControl.appendChild(button);
    detail.appendChild(footerControl);
  });
  // Use vertical viewport coordinates. Percentage observer margins are relative
  // to viewport width and can leave an empty reading band on wide screens.
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
  function updateNavbar() {
    var readingLine = window.innerHeight * 0.475;
    var activeLink = null, nearestTop = -Infinity;
    navLinks.forEach(function (link) {
      var target = document.getElementById(link.hash.slice(1));
      if (!target) return;
      var top = target.getBoundingClientRect().top;
      if (top <= readingLine && top > nearestTop) { nearestTop = top; activeLink = link; }
    });
    navLinks.forEach(function (link) {
      var active = link === activeLink;
      if (link.classList.contains('is-active') !== active) link.classList.toggle('is-active', active);
      if (active && link.getAttribute('aria-current') !== 'location') link.setAttribute('aria-current', 'location');
      if (!active && link.hasAttribute('aria-current')) link.removeAttribute('aria-current');
    });
  }
  var navFrame = false;
  function scheduleNavbar() {
    if (navFrame) return;
    navFrame = true;
    requestAnimationFrame(function () { navFrame = false; updateNavbar(); });
  }
  window.addEventListener('scroll', scheduleNavbar, { passive: true });
  window.addEventListener('resize', scheduleNavbar);
  window.addEventListener('load', scheduleNavbar);
  new MutationObserver(updateNavbar).observe(document.querySelector('.nav'), {
    attributes: true, attributeFilter: ['class'], subtree: true
  });

  var header = document.querySelector('.header');
  var menu = document.getElementById('mobile-menu');
  var menuButton = header.querySelector('.menu-btn');
  var main = document.querySelector('main');
  var footer = document.querySelector('footer');
  function syncMenu() {
    var open = document.body.classList.contains('menu-open');
    menu.hidden = !open;
    menu.inert = !open;
    main.inert = open;
    footer.inert = open;
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (!open && menu.contains(document.activeElement)) menuButton.focus();
  }
  function closeMenu(focus) {
    document.body.classList.remove('menu-open');
    menuButton.setAttribute('aria-expanded', 'false');
    syncMenu();
    if (focus) menuButton.focus();
  }
  new MutationObserver(syncMenu).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  syncMenu();
  document.addEventListener('keydown', function (event) {
    if (!document.body.classList.contains('menu-open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
    }
    if (event.key === 'Tab') {
      var controls = Array.prototype.slice.call(header.querySelectorAll('a[href], button'))
        .filter(function (element) { return element.getClientRects().length > 0; });
      var first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }, true);
  window.matchMedia('(min-width: 1161px)').addEventListener('change', function (event) {
    if (event.matches) closeMenu(false);
  });
  var themeButton = header.querySelector('.theme-mini');
  function syncTheme() {
    var night = document.documentElement.getAttribute('data-theme') === 'night';
    themeButton.setAttribute('aria-pressed', String(night));
    themeButton.setAttribute('aria-label', night ? 'Switch to day theme' : 'Switch to night theme');
  }
  new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  syncTheme();
})();
