/* =========================================================
   Bellefort Estates: motion
   - Hero intro
   - Hero -> About: short pin into the BELLEFORT ESTATES wordmark, then clouds
   - Word-by-word fill on the About paragraph
   - Reveals and count-up
   Uses GSAP + ScrollTrigger (CDN), on top of native scrolling. Falls back to a static page
   if they fail to load or the visitor prefers reduced motion.
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var scrolly = hasGsap && !reduce;

  /* ---------- Hero intro: start once the hero photo is ready ---------- */
  var night = root.getAttribute('data-theme') === 'night';
  var photo = document.querySelector(night ? '.hero__img--night' : '.hero__img--day');
  var started = false;
  function start() {
    if (started) return;
    started = true;
    requestAnimationFrame(function () { root.classList.add('is-ready'); });
  }
  if (photo.complete) start();
  else { photo.addEventListener('load', start); photo.addEventListener('error', start); }
  setTimeout(start, 1800);

  /* ---------- Reveal on scroll, staggered within each group ---------- */
  var items = document.querySelectorAll('.reveal, .reveal-clip');
  var groups = new Map();
  items.forEach(function (el) {
    var n = groups.get(el.parentElement) || 0;
    el.style.setProperty('--d', Math.min(n * 0.08, 0.32) + 's');
    groups.set(el.parentElement, n + 1);
  });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
      entry.target.querySelectorAll('[data-count]').forEach(countUp);
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -6% 0px' });
  items.forEach(function (el) { io.observe(el); });

  function countUp(el) {
    var target = parseInt(el.dataset.count, 10);
    var comma = el.dataset.format === 'comma';
    var fmt = function (n) { return comma ? n.toLocaleString('en-US') : String(n); };
    if (reduce) { el.textContent = fmt(target); return; }
    var t0 = performance.now();
    (function tick(now) {
      var t = Math.min((now - t0) / 1400, 1);
      el.textContent = fmt(Math.round(target * (1 - Math.pow(1 - t, 4))));
      if (t < 1) requestAnimationFrame(tick);
    })(t0);
  }

  if (!scrolly) return;   // static page from here on
  root.classList.add('has-scrolly');

  gsap.registerPlugin(ScrollTrigger);

  var hero = document.querySelector('.hero');
  var media = document.querySelector('.hero__media');
  var maskHost = document.querySelector('.hero__mask');
  var mobile = window.innerWidth < 721;

  /* ---------- BELLEFORT ESTATES mask ----------
     Full-screen SVG: sky everywhere except inside the letters, so the photo
     shows only through the wordmark. Built once; layoutMask() re-measures. */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function el(name, attrs) {
    var n = document.createElementNS(SVGNS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  var svg = el('svg', { preserveAspectRatio: 'none' });
  var defs = el('defs', {});
  var grad = el('linearGradient', { id: 'bf-sky', x1: 0, y1: 0, x2: 0, y2: 1 });
  grad.appendChild(el('stop', { offset: '0', style: 'stop-color: var(--seq-sky-top)' }));
  grad.appendChild(el('stop', { offset: '1', style: 'stop-color: var(--seq-sky-bottom)' }));
  var mask = el('mask', { id: 'bf-word', maskUnits: 'userSpaceOnUse', x: 0, y: 0 });
  var maskBg = el('rect', { x: 0, y: 0, fill: '#fff' });
  var lettersPos = el('g', {});   // places the word on the house
  var letters = el('g', {});      // scaled around (0,0) by the timeline
  var word = el('text', { 'text-anchor': 'middle', 'font-family': 'Geist, system-ui, sans-serif', 'font-weight': 800, lengthAdjust: 'spacingAndGlyphs', fill: '#000' });
  // ESTATES sits under the wordmark as clean solid type (not cut out)
  var subPos = el('g', {});
  var sub = el('text', { 'text-anchor': 'middle', 'font-family': 'Geist, system-ui, sans-serif', 'font-weight': 500, style: 'fill: var(--seq-ink)' });
  var sky = el('rect', { x: 0, y: 0, fill: 'url(#bf-sky)', mask: 'url(#bf-word)' });
  word.textContent = 'BELLEFORT';
  sub.textContent = 'ESTATES';
  letters.appendChild(word);
  lettersPos.appendChild(letters);
  subPos.appendChild(sub);
  mask.appendChild(maskBg); mask.appendChild(lettersPos);
  defs.appendChild(grad); defs.appendChild(mask);
  svg.appendChild(defs); svg.appendChild(sky); svg.appendChild(subPos);
  maskHost.appendChild(svg);

  // Zoom on a log scale so 7x -> 1x feels even all the way through
  // (a linear scale rushes the start and crawls at the end).
  var ZOOM_FROM = 7;
  var zoom = { p: 0 };
  var photoLift = 0;   // px the photo moves up on phones (set in layoutMask)
  function applyZoom() {
    letters.setAttribute('transform', 'scale(' + Math.pow(ZOOM_FROM, 1 - zoom.p).toFixed(4) + ')');
  }

  function layoutMask() {
    var W = hero.clientWidth, H = hero.clientHeight;
    var cx = W / 2;
    // land the letters on the guardhouse, wall and gate, where the photo is
    // busiest; the open sky above would make them blend into the background
    var cy;
    if (W < 721) {
      // Phones: the photo sits in the lower part of the hero, so the letters
      // go to the middle of the screen and the photo slides up to meet them
      cy = H * 0.5;
      photoLift = Math.max(0, media.offsetTop + media.offsetHeight * 0.6 - cy);
    } else {
      cy = media.offsetTop + media.offsetHeight * 0.62;
      photoLift = 0;
    }
    var wordW = Math.min(W * (W < 721 ? 0.9 : 0.84), 1500);
    var size = wordW / 5.4;                 // Geist 800 caps: ~5.4em for 9 letters
    var subSize = Math.max(13, size * 0.12);
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    [mask, maskBg, sky].forEach(function (n) { n.setAttribute('width', W); n.setAttribute('height', H); });
    lettersPos.setAttribute('transform', 'translate(' + cx + ' ' + cy + ')');
    word.setAttribute('x', 0); word.setAttribute('y', size * 0.2);
    word.setAttribute('font-size', size); word.setAttribute('textLength', wordW);
    subPos.setAttribute('transform', 'translate(' + cx + ' ' + (cy + size * 0.2 + subSize * 2.6) + ')');
    sub.setAttribute('x', 0); sub.setAttribute('y', 0);
    sub.setAttribute('font-size', subSize); sub.setAttribute('letter-spacing', subSize * 0.9);
    applyZoom();
  }
  layoutMask();

  /* ---------- Pinned sequence ----------
     photo -> BELLEFORT -> ESTATES -> clouds swallow it -> page color -> About
     Timeline runs 0..1 across the pin; scrub: 1 eases the catch-up so the
     motion stays smooth even with fast wheel or trackpad flicks. */
  var H = function () { return hero.offsetHeight; };
  gsap.set(sub, { opacity: 0 });
  gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: hero, start: 'top top', end: '+=' + (mobile ? 110 : 150) + '%',
      pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true
    }
  })
    // headline and controls step aside
    .to('.hero__content', { autoAlpha: 0, y: -48, duration: 0.14, ease: 'power1.in' }, 0)
    .to('.hero__ui', { autoAlpha: 0, duration: 0.1 }, 0)
    // sky closes in; the photo eases down into the letters
    .fromTo(maskHost, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'power1.inOut' }, 0.04)
    .fromTo(zoom, { p: 0 }, { p: 1, duration: 0.5, ease: 'power2.inOut', onUpdate: applyZoom }, 0.04)
    .to(media, { scale: 1.05, y: function () { return -photoLift; }, duration: 0.5, ease: 'power2.inOut' }, 0.04)
    // ESTATES settles in once the word has landed
    .fromTo(sub, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.12, ease: 'power2.out' }, 0.5)
    // a short hold, then cloud walls rise and swallow the wordmark
    .fromTo('.cloud--back',  { y: H }, { y: function () { return -0.45 * H(); }, duration: 0.32, ease: 'power1.inOut' }, 0.64)
    .fromTo('.cloud--front', { y: H }, { y: function () { return -0.3 * H(); }, duration: 0.3, ease: 'power1.inOut' }, 0.68)
    // settle into the exact page color as the pin releases
    .to('.hero__fade', { autoAlpha: 1, duration: 0.05 }, 0.95);

  function relayout() { layoutMask(); ScrollTrigger.refresh(); }
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(relayout, 200); });
  document.fonts && document.fonts.ready.then(relayout);

  /* ---------- About: words fill in as you scroll ---------- */
  document.querySelectorAll('[data-words]').forEach(function (p) {
    var words = p.textContent.trim().split(/\s+/);
    p.innerHTML = words.map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
    gsap.fromTo(p.querySelectorAll('.w'), { opacity: 0.16 }, {
      opacity: 1,
      stagger: 0.1,
      ease: 'none',
      scrollTrigger: { trigger: p, start: 'top 85%', end: 'bottom 45%', scrub: true }
    });
  });
})();
