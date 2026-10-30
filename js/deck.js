/* ============================================================================
   THE PRESENTATION — it goes as PowerPoint goes: a click, the space bar or an
   arrow key is the next step, back is the one before. Nothing scrolls and
   there is no pointer. The slides on paper hand over to each other with
   Groove Dynamics' diagonal cut; into the ice and out again, and into the
   inside of a block at the end, igloo's own cut carries the screen.
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var wait = function (s) { return new Promise(function (r) { setTimeout(r, s * 1000); }); };

  /* ---- igloo's blocks, in our words (its type has no umlauts: ae, oe, ue, ss) ---- */
  var ice = Ice.create({
    mount: document.body,
    line: [Ice.PAGE, Ice.BLOCKS, Ice.PAGE, Ice.INSIDE],
    blocks: [
      {
        figure: 'mask', label: 'HACKING_01 Social Engineering', date: '30/10/2026',
        title: '////// Social Engineering',
        text: 'Social Engineering greift nicht den Computer an, sondern den Menschen davor. Angreifer geben sich als Kollegin, Chef oder IT-Support aus, bauen Vertrauen auf und bringen ihr Gegenueber dazu, Passwoerter, Codes oder Zugaenge freiwillig herauszugeben.\n\n' +
          'Die Masche funktioniert, weil sie menschlich ist: Hilfsbereitschaft, Respekt vor Autoritaet, Zeitdruck und Neugier. Ein Anruf, der dringend klingt, reicht oft schon. Der beste Schutz ist Misstrauen im richtigen Moment: zurueckrufen ueber eine bekannte Nummer, nie ein Passwort am Telefon nennen und lieber einmal zu viel nachfragen.',
        linkTitle: '/// Taktiken',
        links: [{ name: 'Vertrauen', link: 'https://www.bsi.bund.de' }, { name: 'Zeitdruck', link: 'https://www.bsi.bund.de' }, { name: 'Neugier', link: 'https://www.bsi.bund.de' }],
        moreTitle: '/// Mehr', more: [{ name: 'BSI', link: 'https://www.bsi.bund.de' }]
      },
      {
        figure: 'flipper', label: 'HACKING_02 Hardware', date: '30/10/2026',
        title: '////// Hardware',
        text: 'Nicht jeder Angriff kommt uebers Netz. Ein USB-Stick, der auf dem Parkplatz liegt, kann sich als Tastatur ausgeben und in Sekunden Befehle tippen. Ein fremdes Ladekabel kann mehr als laden, und ein kleiner Stecker zwischen Tastatur und Rechner schreibt jede Eingabe mit.\n\n' +
          'Die Regeln sind einfach: keine fremden USB-Sticks einstecken, nur eigene Kabel und Netzteile benutzen, den Rechner sperren, sobald man aufsteht, und auf Geraete achten, die da nicht hingehoeren. Wer etwas findet, gibt es der IT, statt es selbst auszuprobieren.',
        linkTitle: '/// Vorsicht',
        links: [{ name: 'USB-Sticks', link: 'https://www.bsi.bund.de' }, { name: 'Ladekabel', link: 'https://www.bsi.bund.de' }, { name: 'Keylogger', link: 'https://www.bsi.bund.de' }],
        moreTitle: '/// Regel', more: [{ name: 'Rechner sperren', link: 'https://www.bsi.bund.de' }]
      }
    ],
    /* the words that shine as igloo's mark does: beside each block on the
       free side of the screen, and the last word inside the empty block */
    glows: [
      { name: 'social', text: 'Social Engineering', align: 'left', size: function (W, H) { return H * 0.046; }, at: function (W, H) { return [W * 0.6, H * 0.5]; } },
      { name: 'hardware', text: 'Hardware', align: 'left', size: function (W, H) { return H * 0.046; }, at: function (W, H) { return [W * 0.6, H * 0.5]; } },
      { name: 'danke', text: '////// Danke', align: 'center', size: function (W, H) { return H * 0.02; }, at: function (W, H) { return [W / 2, H * 0.4]; } },
      { name: 'fragen', text: 'Fragen?', align: 'center', size: function (W, H) { return H * 0.1; }, at: function (W, H) { return [W / 2, H * 0.52]; } }
    ]
  });

  /* ---- the steps ----
     page:   a slide on paper (after: the one after the ice)
     block:  a block of ice in the middle, open: and into it
     inside: the inside of an empty block, at the end
     shine:  the words that come on as igloo's mark does */
  var steps = [
    { page: 'mark' },
    { page: 'hacken' },
    { page: 'phish' },
    { block: 0, shine: ['social'] },
    { block: 0, open: 0 },
    { block: 1, shine: ['hardware'] },
    { block: 1, open: 1 },
    { page: 'server', after: true },
    { page: 'schutz', after: true },
    { inside: true, shine: ['danke', 'fragen'] }
  ];
  function place(s) {
    var p = ice.places();
    if (s.page) return p.pages[s.after ? 1 : 0];
    if (s.block !== undefined) return p.blocks[s.block];
    return p.inside;
  }

  /* ---- the slides on paper ---- */
  var pages = {};
  $$('.page').forEach(function (el) { pages[el.getAttribute('data-page')] = el; });
  var pageNow = null;
  function reset(el) { el.style.clipPath = ''; el.style.transform = ''; el.style.zIndex = ''; }
  function setPage(name) {
    Object.keys(pages).forEach(function (k) {
      var el = pages[k], on = k === name;
      reset(el);
      el.classList.toggle('is-live', on);
      if (!on) el.classList.remove('is-in');
    });
    pageNow = name;
  }
  function come(name, delay) { setTimeout(function () { if (pageNow === name) pages[name].classList.add('is-in'); }, (delay || 0) * 1000); }

  /* Groove Dynamics' hand-over between two slides (src/stage/stage.js): a
     diagonal that climbs the screen, the next slide below it, the last one
     above it, and both slide against each other as it passes. */
  var SLOPE = 0.2, PARALLAX = 0.4;
  function inOut3(t) {
    var u = t;
    for (var i = 0; i < 8; i++) {
      var x = 1.8 * (1 - u) * (1 - u) * u + u * u * u - t;
      var dx = 1.8 * (1 - u) * (1 - u) - 3.6 * (1 - u) * u + 3 * u * u;
      if (Math.abs(dx) < 1e-6) break;
      u = clamp01(u - x / dx);
    }
    return 3 * (1 - u) * u * u + u * u * u;
  }
  function paint(o, l, c) {
    var W = innerWidth, H = innerHeight, slope = SLOPE * W / H, front = c * (1 + slope);
    var yL = (1 - front) * H, yR = (1 - front + slope) * H;
    var Tl = PARALLAX * Math.pow(1 - c, 3) * H, To = -PARALLAX * c * c * c * H;
    l.style.zIndex = '2';
    l.style.transform = 'translate3d(0,' + Tl.toFixed(2) + 'px,0)';
    l.style.clipPath = 'polygon(0px ' + (yL - Tl).toFixed(1) + 'px,100% ' + (yR - Tl).toFixed(1) + 'px,100% 300%,0px 300%)';
    o.style.zIndex = '1';
    o.style.transform = 'translate3d(0,' + To.toFixed(2) + 'px,0)';
    o.style.clipPath = 'polygon(0px -200%,100% -200%,100% ' + (yR - To).toFixed(1) + 'px,0px ' + (yL - To).toFixed(1) + 'px)';
  }
  function turn(from, to, forward) {
    var A = pages[from], B = pages[to], o = forward ? A : B, l = forward ? B : A, dur = 2;
    A.classList.add('is-live'); B.classList.add('is-live');
    pageNow = to;
    come(to, 0.35);
    return new Promise(function (done) {
      var t0 = performance.now();
      (function step(now) {
        var k = clamp01((now - t0) / 1000 / dur), c = inOut3(forward ? k : 1 - k);
        paint(o, l, c);
        if (k < 1) { requestAnimationFrame(step); return; }
        setPage(to);
        pages[to].classList.add('is-in');
        done();
      })(t0);
    });
  }

  /* ---- one step to another ---- */
  var at = 0, want = 0, running = false, opened = null, opening = true, lit = {};
  function settle(from, to) {
    var s = steps[to], y = place(s), forward = to > from, moving = Math.abs(ice.scroll.y - y) > 0.001;
    var shine = s.shine || [];
    Object.keys(lit).forEach(function (k) { if (lit[k] && shine.indexOf(k) < 0) { ice.shine(k, false); lit[k] = false; } });
    var chain = Promise.resolve();
    if (opened !== null && s.open !== opened) chain = chain.then(function () { return ice.close(); }).then(function () { opened = null; });
    chain = chain.then(function () {
      if (s.page && !moving && pageNow !== s.page) return turn(pageNow, s.page, forward);
      if (s.page && moving) { setPage(s.page); come(s.page, 0.9); }
      if (s.inside) ice.empty();
      if (!moving) return;
      var d = Math.abs(ice.scroll.y - y);
      return ice.glide(y, d <= 1.05 ? 1.9 : 3.0);
    });
    if (s.open !== undefined) chain = chain.then(function () { if (opened !== s.open) { opened = s.open; return ice.open(s.open); } });
    return chain.then(function () {
      if (steps[want] !== s) return;
      shine.forEach(function (k, i) { if (!lit[k]) { lit[k] = true; ice.shine(k, true, 0.15 + i * 0.35); } });
    });
  }
  function run() {
    if (running) return;
    running = true;
    (function on() {
      if (at === want) { running = false; return; }
      var to = want, from = at;
      settle(from, to).then(function () { at = to; on(); }, function (err) { console.error(err); at = to; on(); });
    })();
  }
  function next() { if (opening) return; want = Math.min(steps.length - 1, want + 1); run(); }
  function prev() { if (opening) return; want = Math.max(0, want - 1); run(); }
  function first() { if (opening) return; want = 0; run(); }

  /* ---- the hand: click, space, arrows; no wheel, no scroll, no pointer ---- */
  addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key;
    if (k === ' ' || k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === 'Enter' || k === 'n') { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace' || k === 'p') { e.preventDefault(); prev(); }
    else if (k === 'Home') { e.preventDefault(); first(); }
    else if (k === 'f' || k === 'F') {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {});
    }
  });
  addEventListener('pointerdown', function (e) {
    e.preventDefault();
    if (e.button === 0) next(); else if (e.button === 2) prev();
  });
  addEventListener('contextmenu', function (e) { e.preventDefault(); });
  addEventListener('wheel', function (e) { e.preventDefault(); }, { passive: false });
  addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
  addEventListener('dragstart', function (e) { e.preventDefault(); });

  /* inside PowerPoint the page runs as an Office add-in: it tells Office it is there */
  (function office(tries) {
    if (window.Office && Office.onReady) { try { Office.onReady(function () {}); } catch (e) {} return; }
    if (tries < 100) setTimeout(function () { office(tries + 1); }, 100);
  })(0);

  /* ---- the curtain: down until the scenes are warm; then igloo's cut, bent
     into a circle, opens it from the middle onto the first slide ---- */
  var pre = $('#pre'), t0 = performance.now();
  setPage('mark');
  function lift() {
    pages.mark.classList.add('is-in');
    if (pre.animate) pre.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, easing: 'cubic-bezier(.455,.03,.515,.955)', fill: 'forwards' }).onfinish = function () { pre.style.display = 'none'; };
    else pre.style.display = 'none';
    opening = false;
  }
  Promise.all([ice.ready, document.fonts ? document.fonts.ready : null]).then(function () {
    window.__deck = { next: next, prev: prev, at: function () { return at; }, steps: steps, ice: ice, ready: true };
    setTimeout(function () {
      ice.plunge({
        dur: 1.3,
        begin: function () { pre.style.display = 'none'; come('mark', 0.5); }
      }).then(function (went) { if (!went) lift(); else opening = false; });
    }, Math.max(0, 1100 - (performance.now() - t0)));
  }, function (err) {
    console.error('[DECK] ' + err.message);
    window.__deck = { failed: true, next: next, prev: prev };
    lift();
  });
})();
