/* ============================================================================
   THE PRESENTATION — it goes as PowerPoint goes: a click, the space bar or an
   arrow key is the next step, back is the one before. Nothing scrolls and
   there is no pointer. On paper there is one thing at a time, in the middle:
   a click brings the next into focus, and between two subjects Groove
   Dynamics' diagonal cut hands over. Into the ice and out again, and into the
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
      { name: 'danke', text: '////// Danke', align: 'center', size: function (W, H) { return H * 0.02; }, soft: true, at: function (W, H) { return [W / 2, H * 0.4]; } },
      { name: 'fragen', text: 'Fragen?', align: 'center', size: function (W, H) { return H * 0.1; }, soft: true, at: function (W, H) { return [W / 2, H * 0.52]; } }
    ]
  });

  /* ---- the slides on paper ---- */
  var pages = {};
  $$('.page').forEach(function (el) {
    pages[el.getAttribute('data-page')] = el;
    el.__focus = $$('.focus', el);
  });

  /* A word goes into letters, a sentence into words, each with its distance
     from the middle, so they can come into focus from the middle out. Set one
     by one, letters lose their kerning; it is measured here and given back. */
  function letters(line) {
    var text = line.firstChild, chars = Array.from(text.nodeValue), mid = (chars.length - 1) / 2;
    var made = chars.map(function (ch, i) {
      var c = document.createElement('span');
      c.className = 'c';
      c.textContent = ch === ' ' ? '\u00A0' : ch;
      c.setAttribute('data-g', ch);
      c.style.setProperty('--o', (i - mid).toFixed(2));
      c.style.setProperty('--a', Math.abs(i - mid).toFixed(2));
      c.style.setProperty('--k', i);
      c.style.setProperty('--r', (((Math.sin((i + 1) * 12.9898) * 43758.5453) % 1 + 1) % 1).toFixed(3));
      return c;
    });
    made.forEach(function (c) { line.insertBefore(c, text); });
    line.removeChild(text);
    return made;
  }
  function words(sent) {
    var at = 0;
    Array.from(sent.childNodes).forEach(function (node) {
      var key = node.nodeType === 1, box = document.createDocumentFragment();
      /* what matters stays in one piece, whatever the line breaks do */
      (key ? [node.textContent] : node.textContent.split(/(\s+)/)).forEach(function (w) {
        if (!w) return;
        if (!w.trim()) { box.appendChild(document.createTextNode(' ')); return; }
        var c = document.createElement('span');
        c.className = 'c' + (key ? ' key' : '');
        c.textContent = w;
        c.style.setProperty('--a', at++);
        box.appendChild(c);
      });
      sent.replaceChild(box, node);
    });
  }
  function kern(line, made) {
    var size = parseFloat(getComputedStyle(line).fontSize);
    var probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
    line.appendChild(probe);
    var width = function (t) { probe.textContent = t; return probe.getBoundingClientRect().width; };
    made.forEach(function (c, i) {
      if (!i) return;
      var a = made[i - 1].getAttribute('data-g'), b = c.getAttribute('data-g');
      c.style.marginLeft = ((width(a + b) - width(a) - width(b)) / size).toFixed(4) + 'em';
    });
    /* two letters that will change places are told how far they have to go */
    var swap = line.getAttribute('data-swap');
    if (swap) {
      var pair = swap.split(',').map(Number), one = made[pair[0]], two = made[pair[1]];
      one.classList.add('sw1'); two.classList.add('sw2');
      one.style.setProperty('--dx', (width(two.getAttribute('data-g')) / size).toFixed(4) + 'em');
      two.style.setProperty('--dx', (-width(one.getAttribute('data-g')) / size).toFixed(4) + 'em');
    }
    probe.remove();
    /* dots stand at even distances, whatever the letters under them were */
    if (line.classList.contains('dots')) {
      var last = made[made.length - 1], left = made[0].offsetLeft, full = last.offsetLeft + last.offsetWidth - left;
      made.forEach(function (c, i) {
        var want = left + (i + 0.5) / made.length * full;
        c.style.setProperty('--dot', ((want - c.offsetLeft - c.offsetWidth / 2) / size).toFixed(4) + 'em');
      });
    }
  }
  var lines = $$('.line').map(function (line) {
    var word = line.parentNode, made = letters(line);
    word.style.setProperty('--n', Math.max(+word.style.getPropertyValue('--n') || 0, made.length));
    return { line: line, made: made };
  });
  $$('.sent').forEach(words);
  /* the flood: small requests over the whole screen, the middle left free */
  $$('.flood').forEach(function (box) {
    var said = box.getAttribute('data-word'), html = '', cols = 21, rows = 15;
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
      var px = (x + 0.5) / cols, py = (y + 0.5) / rows;
      if (Math.abs(px - 0.5) < 0.31 && Math.abs(py - 0.5) < 0.3) continue;
      var r = ((Math.sin((x * 31 + y * 17 + 1) * 12.9898) * 43758.5453) % 1 + 1) % 1;
      html += '<i style="left:' + (px * 100).toFixed(2) + '%;top:' + (py * 100).toFixed(2) + '%;--r:' + r.toFixed(3) + '">' + said + '</i>';
    }
    box.innerHTML = html;
  });
  /* how far the mark steps aside: half of what comes out of it */
  function shift() { $('.lockup').style.setProperty('--shift', ($('.lockup-word').offsetWidth / 2).toFixed(2) + 'px'); }
  addEventListener('resize', shift);

  /* ---- the steps ----
     page:   a slide on paper, focus: which of its things is in the middle
             (after: the slide comes after the ice)
     block:  a block of ice in the middle, open: and into it
     inside: the inside of an empty block, at the end
     shine:  the words that come on as igloo's mark does */
  function sheets(name, after) {
    return pages[name].__focus.map(function (_, i) { return { page: name, focus: i, after: !!after }; });
  }
  var steps = [{ page: 'mark' }].concat(
    sheets('hacken'), sheets('phish'),
    [{ block: 0, shine: ['social'] }, { block: 0, open: 0 }, { block: 1, shine: ['hardware'] }, { block: 1, open: 1 }],
    sheets('server', true), sheets('schutz', true),
    [{ inside: true, shine: ['danke', 'fragen'] }]
  );
  function place(s) {
    var p = ice.places();
    if (s.page) return p.pages[s.after ? 1 : 0];
    if (s.block !== undefined) return p.blocks[s.block];
    return p.inside;
  }

  var pageNow = null;
  function reset(el) { el.style.clipPath = ''; el.style.transform = ''; el.style.zIndex = ''; }
  /* a thing in focus plays its small scene once it has arrived, and keeps it until it has left */
  function arm(el) {
    clearTimeout(el.__act);
    el.classList.remove('is-act');
    el.__act = setTimeout(function () { el.classList.add('is-act'); }, (+el.getAttribute('data-act') || 2.4) * 1000);
  }
  function disarm(el, after) {
    clearTimeout(el.__act);
    el.__act = setTimeout(function () { el.classList.remove('is-act'); }, after);
  }
  function focus(name, i) {
    pages[name].__focus.forEach(function (el, k) {
      var on = el.classList.contains('is-on');
      if (k === i && !on) {
        el.classList.add('is-on');
        if (pages[name].classList.contains('is-in')) arm(el);
      } else if (k !== i && on) {
        el.classList.remove('is-on');
        disarm(el, 450);
      }
    });
  }
  function setPage(name) {
    Object.keys(pages).forEach(function (k) {
      var el = pages[k], on = k === name;
      reset(el);
      el.classList.toggle('is-live', on);
      if (!on) { el.classList.remove('is-in'); el.__focus.forEach(function (f) { disarm(f, 0); }); }
    });
    pageNow = name;
  }
  function arrive(name) {
    var page = pages[name];
    if (page.classList.contains('is-in')) return;
    page.classList.add('is-in');
    page.__focus.forEach(function (f) { if (f.classList.contains('is-on')) arm(f); });
  }
  function come(name, delay) { setTimeout(function () { if (pageNow === name) arrive(name); }, (delay || 0) * 1000); }

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
        arrive(to);
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
      if (s.page && s.focus !== undefined) focus(s.page, s.focus);
      if (s.page && !moving && pageNow !== s.page) return turn(pageNow, s.page, forward);
      if (s.page && !moving) return wait(0.3);
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

  /* ---- the curtain: the mark, breathing, until the scenes are warm. Then the
     mark takes a last full breath and stops, the curtain is gone without
     anyone seeing it (the first slide has the mark in the same place), and
     the mark steps aside for the word that comes out of it ---- */
  var pre = $('#pre'), t0 = performance.now();
  setPage('mark');
  function lift() {
    var mark = $('svg', pre), now = getComputedStyle(mark).opacity;
    mark.style.animation = 'none';
    mark.style.opacity = now;
    mark.getBoundingClientRect();
    mark.style.transition = 'opacity .55s var(--e-soft)';
    mark.style.opacity = '1';
    wait(0.7).then(function () {
      pre.style.display = 'none';
      arrive('mark');
      opening = false;
    });
  }
  /* the paper's words are only measured once their type is there */
  var type = (document.fonts ? Promise.all([
    document.fonts.load('500 64px "Inter Tight"', 'Hacken'),
    document.fonts.load('600 64px "Inter Tight"', 'Hacken'),
    document.fonts.load('500 16px "IBM Plex Mono"', '/// 01')
  ]).catch(function () {}) : Promise.resolve()).then(function () {
    lines.forEach(function (l) { kern(l.line, l.made); });
    shift();
  });
  Promise.all([ice.ready, type]).then(function () {
    window.__deck = { next: next, prev: prev, at: function () { return at; }, steps: steps, ice: ice, ready: true };
    setTimeout(lift, Math.max(0, 1100 - (performance.now() - t0)));
  }, function (err) {
    console.error('[DECK] ' + err.message);
    window.__deck = { failed: true, next: next, prev: prev };
    type.then(lift);
  });
})();
