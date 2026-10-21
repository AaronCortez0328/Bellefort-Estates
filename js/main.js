/* =========================================================
   Bellefort Estates: interactions
   ========================================================= */
(function () {
  'use strict';

  /* ---------- Resident Portal link ----------
     Paste the portal address here when it's ready, e.g.
     var PORTAL_URL = 'https://portal.bellefortestates.com';
     Every button marked data-portal will open it. */
  var PORTAL_URL = 'https://behoademo.hoa-system.com/portal';

  var root = document.documentElement;
  var header = document.querySelector('.header');

  if (PORTAL_URL) {
    document.querySelectorAll('[data-portal]').forEach(function (a) {
      a.href = PORTAL_URL;
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }

  /* ---------- Day / Night ---------- */
  document.querySelectorAll('.theme-toggle, .theme-mini').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'night' ? 'day' : 'night';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('bf-theme', next); } catch (e) {}
    });
  });

  /* ---------- Header state ----------
     Transparent at the very top; solid as soon as the page scrolls. */
  function onScroll() {
    // pages without the hero photo keep the solid header at all times
    header.classList.toggle('is-scrolled', !document.querySelector('.hero') || window.scrollY > 40);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- In-page links ----------
     Handled here so every link lands the same way: #top (logo, "Back to top")
     goes to the very top, and sections stop just below the fixed header. */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-portal') && PORTAL_URL) return;
    var id = a.getAttribute('href');
    var y;
    if (id === '#top' || id === '#') {
      y = 0;
    } else {
      var target = document.querySelector(id);
      if (!target) return;
      y = target.getBoundingClientRect().top + window.scrollY - (header.offsetHeight - 4);
    }
    e.preventDefault();
    window.scrollTo({ top: Math.max(0, y), behavior: reduceMotion ? 'auto' : 'smooth' });
    if (history.replaceState) history.replaceState(null, '', id === '#top' ? location.pathname + location.search : id);
  });

  /* ---------- Mobile menu ---------- */
  var menuBtn = document.querySelector('.menu-btn');
  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  }
  menuBtn.addEventListener('click', function () { setMenu(!document.body.classList.contains('menu-open')); });
  document.querySelectorAll('.mobile-menu a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Active nav link ---------- */
  var links = document.querySelectorAll('.nav a');
  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      links.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('href') === '#' + entry.target.id); });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['about', 'amenities', 'hotlines', 'history', 'privacy', 'portal-plan'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) spy.observe(el);
  });

  /* ---------- Amenity lightbox ---------- */
  var box = document.querySelector('.lightbox');
  if (box) {
  var shots = Array.prototype.slice.call(document.querySelectorAll('.amenity__media'));
  var boxImg = box.querySelector('.lightbox__img');
  var boxName = box.querySelector('.lightbox__caption strong');
  var boxText = box.querySelector('.lightbox__caption span');
  var current = 0;

  function show(i) {
    current = (i + shots.length) % shots.length;
    var item = shots[current].closest('.amenity');
    boxImg.classList.remove('is-loaded');
    boxImg.onload = function () { boxImg.classList.add('is-loaded'); };
    boxImg.src = shots[current].dataset.full;
    boxImg.alt = shots[current].querySelector('img').alt;
    boxName.textContent = item.querySelector('.amenity__name').textContent;
    boxText.textContent = item.querySelector('.amenity__text').textContent;
  }
  shots.forEach(function (btn, i) {
    btn.addEventListener('click', function () {
      show(i);
      if (box.showModal) box.showModal(); else box.setAttribute('open', '');
      document.documentElement.classList.add('lightbox-open');
    });
  });
  function closeBox() { box.close ? box.close() : box.removeAttribute('open'); }
  box.addEventListener('close', function () { document.documentElement.classList.remove('lightbox-open'); });
  box.querySelector('.lightbox__close').addEventListener('click', closeBox);
  box.querySelector('.lightbox__nav--prev').addEventListener('click', function () { show(current - 1); });
  box.querySelector('.lightbox__nav--next').addEventListener('click', function () { show(current + 1); });
  box.addEventListener('click', function (e) { if (e.target === box) closeBox(); });   // click backdrop
  box.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
  // swipe on phones
  var x0 = null;
  box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    x0 = null;
  });
  }

  /* ---------- Portal plan tabs ---------- */
  var planTabs = Array.prototype.slice.call(document.querySelectorAll('.plan-tabs [role="tab"]'));
  function selectTab(tab, focus) {
    planTabs.forEach(function (t) {
      var on = t === tab;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
    tab.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }
  planTabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab); });
    tab.addEventListener('keydown', function (e) {
      var n = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (n) { e.preventDefault(); selectTab(planTabs[(i + n + planTabs.length) % planTabs.length], true); }
    });
  });

  document.getElementById('year').textContent = new Date().getFullYear();
})();
