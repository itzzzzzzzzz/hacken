/* ============================================================================
   THE PRESENTATION — it goes as PowerPoint goes: a click, the space bar or an
   arrow key is the next step, back is the one before. Nothing scrolls and
   there is no pointer. Each step is a place in igloo's scenes (js/ice.js),
   reached the way igloo's own controller glides there, and what lies over
   the picture once it is there: labels as on Groove Dynamics' tree, titles
   in light as its mark is on the snowfield.
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var wait = function (s) { return new Promise(function (r) { setTimeout(r, s * 1000); }); };

  /* where igloo's camera looks from on the snowfield: across the screen, and up */
  var ACROSS = [Math.SQRT1_2, 0, Math.SQRT1_2], UP = [0, 1, 0];

  var hero = tiltDriver($('.hero'));

  /* ---- igloo's scenes, in our words (its type has no umlauts: ae, oe, ue, ss) ---- */
  var ice = Ice.create({
    mount: document.body,
    words: $('#words'),
    manifesto: { title: '////// Hacken', text: 'Ein System dazu bringen, Dinge zu tun, die sein Erfinder nie vorgesehen hat.' },
    copyright: ' ',
    rights: ' ',
    blocks: [
      {
        figure: 'mask', label: 'HACKING_01 Social Engineering', date: '30/10/2026',
        title: '////// Social Engineering',
        text: 'Social Engineering greift nicht den Computer an, sondern den Menschen davor. Angreifer geben sich als Kollegin, Chef oder IT-Support aus, bauen Vertrauen auf und bringen ihr Gegenueber dazu, Passwoerter, Codes oder Zugaenge freiwillig herauszugeben.\n\n' +
          'Die Masche funktioniert, weil sie menschlich ist: Hilfsbereitschaft, Respekt vor Autoritaet, Zeitdruck und Neugier. Ein Anruf, der dringend klingt, oder ein USB-Stick, der auf dem Parkplatz liegt, reicht oft schon. Der beste Schutz ist Misstrauen im richtigen Moment: zurueckrufen ueber eine bekannte Nummer, nie ein Passwort am Telefon nennen und lieber einmal zu viel nachfragen.',
        linkTitle: '/// Taktiken',
        links: [{ name: 'Vertrauen', link: 'https://www.bsi.bund.de' }, { name: 'Zeitdruck', link: 'https://www.bsi.bund.de' }, { name: 'Neugier', link: 'https://www.bsi.bund.de' }],
        moreTitle: '/// Mehr', more: [{ name: 'BSI', link: 'https://www.bsi.bund.de' }]
      },
      {
        figure: 'flipper', label: 'HACKING_02 Hardware', date: '30/10/2026',
        title: '////// Hardware',
        text: 'Der Flipper Zero ist ein kleines Multitool fuer Funk, NFC, RFID und Infrarot. Er zeigt an, was Karten, Schranken, Fernbedienungen und Sensoren im Alltag senden, und macht damit sichtbar, wie offen viele Geraete kommunizieren.\n\n' +
          'Genau das ist die Lektion: Was unverschluesselt funkt, kann mitgelesen werden. Moderne Systeme sollten deshalb verschluesselt und mit wechselnden Codes arbeiten. Fuer Sicherheitsforscher ist der Flipper ein Lernwerkzeug, und eine Regel gilt immer: getestet wird nur an eigenen Geraeten. Alles andere ist strafbar.',
        linkTitle: '/// Kann',
        links: [{ name: 'Funk', link: 'https://www.bsi.bund.de' }, { name: 'NFC', link: 'https://www.bsi.bund.de' }, { name: 'Infrarot', link: 'https://www.bsi.bund.de' }],
        moreTitle: '/// Regel', more: [{ name: 'Nur eigene Geraete', link: 'https://www.bsi.bund.de' }]
      }
    ]
  });

  /* ---- the steps ----
     at:     where in igloo's scenes (the hero, the igloo, a block, a place down the fall)
     dur:    how long the glide there takes, coming from the step before
     part:   what lies over the picture once it is there
     open:   go into that block
     inside: the last of it — the inside of an empty block, opened out of the fall
     joints: the pointer goes through the igloo, and its blocks come apart */
  var steps = [
    { at: 'hero' },
    { at: 'igloo', dur: 3.8, part: 'hats', after: 1.4 },
    { at: 'igloo', part: 'joints', joints: true },
    { at: ['block', 0], dur: 3.6 },
    { at: ['block', 0], open: 0 },
    { at: ['block', 1], dur: 2 },
    { at: ['block', 1], open: 1 },
    { at: ['fall', 0.212], dur: 3.8, part: 'phish', after: 0.6 },
    { at: ['fall', 0.318], dur: 3.2, part: 'server', after: 0.6 },
    { at: ['fall', 0.415], dur: 3.2, part: 'schutz', after: 0.6 },
    { at: ['fall', 0.462], dur: 1.8, inside: true, part: 'end', after: 0.9 }
  ];
  function place(s) {
    var p = ice.places(), a = s.at;
    if (a === 'hero') return p.hero;
    if (a === 'igloo') return p.igloo;
    if (a[0] === 'block') return p.blocks[a[1]];
    return p.fall(a[1]);
  }

  var at = 0, want = 0, running = false, opened = null, opening = true;

  /* one step to another, as the scenes allow: out of a block first, then the
     glide, then into a block; and only then what lies over the picture */
  function settle(from, to) {
    var s = steps[to], y = place(s), forward = to === from + 1;
    show(null);
    joints(false);
    var chain = Promise.resolve();
    if (opened !== null && !(s.open === opened || (s.inside && opened === 'end'))) {
      chain = chain.then(function () { return ice.close(); }).then(function () { opened = null; });
    }
    chain = chain.then(function () {
      var d = Math.abs(ice.scroll.y - y);
      if (d < 0.001) return;
      var dur = forward && s.dur ? s.dur : clamp(1.4 + d * 0.9, 1.6, 4.2);
      return ice.glide(y, dur);
    });
    if (s.open !== undefined && opened !== s.open) chain = chain.then(function () { opened = s.open; return ice.open(s.open); });
    if (s.inside && opened !== 'end') chain = chain.then(function () { opened = 'end'; return ice.inside(); });
    return chain.then(function () {
      if (steps[want] !== s) return;
      if (s.joints) joints(true);
      if (s.part) return wait(forward ? s.after || 0 : 0).then(function () { if (steps[want] === s) show(s.part); });
    });
  }
  function run() {
    if (running) return;
    running = true;
    (function on() {
      if (at === want) { running = false; return; }
      var to = want;
      settle(at, to).then(function () { at = to; on(); }, function (err) { console.error(err); at = to; on(); });
    })();
  }
  function next() { if (opening) return; want = Math.min(steps.length - 1, want + 1); run(); }
  function prev() { if (opening) return; want = Math.max(0, want - 1); run(); }
  function first() { want = 0; run(); }
  function lastStep() { want = steps.length - 1; run(); }

  /* ---- what lies over the picture ---- */
  var parts = {};
  $$('[data-part]').forEach(function (el) { parts[el.getAttribute('data-part')] = el; });
  var showing = null;
  function show(name) {
    showing = name;
    Object.keys(parts).forEach(function (k) { parts[k].classList.toggle('is-on', k === name); });
  }

  /* The labels hang as they do beside Groove Dynamics' tree: a ring on the
     thing, a hairline that leaves it the way the thing grows there and bends
     round to come in level under the name, the names in the margins. */
  function labels(part, look) {
    var leaves = $$('.leaf', part), svg = $('.lines', part);
    if (!leaves.length || !look) return;
    if (!part.__paths) {
      svg.innerHTML = leaves.map(function (l, k) { return '<path style="--d:' + (0.15 + k * 0.09).toFixed(2) + 's"/>'; }).join('');
      part.__dots = leaves.map(function (l, k) {
        var d = document.createElement('span');
        d.className = 'dot'; d.style.setProperty('--d', (0.15 + k * 0.09).toFixed(2) + 's');
        part.appendChild(d);
        return d;
      });
      part.__paths = $$('path', svg);
    }
    var W = innerWidth, H = innerHeight, GAP = 104;
    var colL = look.rect.left - 40, colR = look.rect.right + 40, top = H * 0.22, bottom = H - 80;
    var items = leaves.map(function (l, i) {
      var side = l.getAttribute('data-side'), a = look.anchors[i];
      return { i: i, ax: a.x, ay: a.y, side: side, y: a.y + 30 };
    });
    ['l', 'r'].forEach(function (side) {
      var col = items.filter(function (it) { return it.side === side; }).sort(function (a, b) { return a.ay - b.ay; });
      for (var i = 1; i < col.length; i++) col[i].y = Math.max(col[i].y, col[i - 1].y + GAP);
      var over = col.length ? col[col.length - 1].y - bottom : 0;
      if (over > 0) col.forEach(function (it) { it.y -= over; });
      if (col.length && col[0].y < top) { var dd = top - col[0].y; col.forEach(function (it) { it.y += dd; }); }
    });
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    items.forEach(function (it) {
      var leaf = leaves[it.i], dot = part.__dots[it.i], path = part.__paths[it.i];
      var x = it.side === 'l' ? colL : colR, y = it.y;
      leaf.classList.toggle('leaf--l', it.side === 'l');
      leaf.style.left = x.toFixed(1) + 'px'; leaf.style.top = y.toFixed(1) + 'px';
      dot.style.left = it.ax.toFixed(1) + 'px'; dot.style.top = it.ay.toFixed(1) + 'px';
      var bx = x, by = y - 1, span = Math.abs(bx - it.ax);
      var rx = it.ax - look.cx, ry = it.ay - look.cy, rl = Math.hypot(rx, ry) || 1, k = Math.min(70, Math.hypot(span, by - it.ay) * 0.38);
      var sx = it.ax + rx / rl * 6.5, sy = it.ay + ry / rl * 6.5;
      var c1x = it.ax + rx / rl * k, c1y = it.ay + ry / rl * k, c2x = bx + (it.side === 'l' ? 1 : -1) * Math.min(110, span * 0.55);
      path.setAttribute('d', 'M' + sx.toFixed(1) + ',' + sy.toFixed(1) + 'C' + c1x.toFixed(1) + ',' + c1y.toFixed(1) + ' ' +
        c2x.toFixed(1) + ',' + by.toFixed(1) + ' ' + bx.toFixed(1) + ',' + by.toFixed(1));
      if (!path.style.getPropertyValue('--len')) path.style.setProperty('--len', Math.ceil(path.getTotalLength() + 60));
    });
  }

  /* The igloo on screen: where each of its blocks is, its outline, and the
     blocks the labels' rings sit on — high on the dome on the left, low on
     the left, and on top of the dome towards the right. */
  function iglooLook() {
    var pts = ice.iglooBlocks().map(ice.project);
    if (!pts.length) return null;
    var rect = { left: 1e9, right: -1e9, top: 1e9, bottom: -1e9 }, cx = 0, cy = 0;
    pts.forEach(function (p) {
      rect.left = Math.min(rect.left, p.x); rect.right = Math.max(rect.right, p.x);
      rect.top = Math.min(rect.top, p.y); rect.bottom = Math.max(rect.bottom, p.y);
      cx += p.x / pts.length; cy += p.y / pts.length;
    });
    function best(score) { return pts.reduce(function (a, p) { return score(p) < score(a) ? p : a; }); }
    var w = rect.right - rect.left, h = rect.bottom - rect.top;
    var anchors = [
      best(function (p) { return Math.hypot((p.x - rect.left) / w - 0.18, (p.y - rect.top) / h - 0.3); }),
      best(function (p) { return Math.hypot((p.x - rect.left) / w - 0.06, (p.y - rect.top) / h - 0.78); }),
      best(function (p) { return Math.hypot((p.x - rect.left) / w - 0.55, (p.y - rect.top) / h - 0.04); })
    ];
    rect.left -= 110; rect.right += 110;
    return { anchors: anchors, cx: cx, cy: cy, rect: rect };
  }
  /* A ring of the fall, as it stands where the fall rests: igloo's camera has
     it a different size at each of those places (in screen heights, measured) */
  var RINGS = {
    phish: { r: 0.415, dx: 0.023, dy: 0 },
    server: { r: 0.32, dx: -0.009, dy: -0.042 },
    schutz: { r: 0.46, dx: -0.03, dy: 0.005 }
  };
  function ringLook(name, n) {
    var W = innerWidth, H = innerHeight, k = RINGS[name], R = H * k.r, cx = W / 2 + k.dx * H, cy = H / 2 + k.dy * H;
    /* the rings sit on the outer stones; the names stand well clear of them */
    var angles = n === 4 ? [150, 210, 30, 330] : [150, 210, 0];
    var pts = angles.map(function (a) { var t = a * Math.PI / 180; return { x: cx + Math.cos(t) * R * 0.94, y: cy - Math.sin(t) * R * 0.94 }; });
    return { anchors: pts, cx: cx, cy: cy, rect: { left: cx - R - 90, right: cx + R + 90, top: cy - R, bottom: cy + R } };
  }

  /* ---- the joints: the pointer goes through the igloo, and its blocks come apart ---- */
  var sweep = null;
  function joints(on) {
    if (!on) { if (sweep) { sweep = null; ice.point(); } return; }
    sweep = { t0: performance.now() };
  }
  function sweepFrame(now) {
    if (!sweep) return;
    var look = iglooLook(), t = (now - sweep.t0) / 1000;
    var w = look.rect.right - look.rect.left, h = look.rect.bottom - look.rect.top;
    /* in from the left through the middle of it, round once, and it stays held open */
    var x, y;
    if (t < 2.2) { var k = t / 2.2, e = k * k * (3 - 2 * k); x = look.rect.left - w * 0.4 + e * (w * 0.9); y = look.cy + h * 0.15 - e * h * 0.1; }
    else { var a = (t - 2.2) * 0.55; x = look.cx + Math.cos(a) * w * 0.16; y = look.cy + Math.sin(a * 1.3) * h * 0.12; }
    ice.point(x, y);
  }

  /* ---- every frame: the hero rests while the picture covers it, the labels follow it ---- */
  var heroOn = true;
  requestAnimationFrame(function frame(now) {
    requestAnimationFrame(frame);
    var y = ice.scroll.y, cover = y >= 1;
    if (cover === heroOn) { heroOn = !cover; if (heroOn) hero.enter(); else hero.leave(); }
    if (!ice.places || ice.failed()) return;
    sweepFrame(now);
    if (!showing) return;
    var part = parts[showing];
    if (showing === 'hats') labels(part, iglooLook());
    else if (showing === 'phish' || showing === 'server') labels(part, ringLook(showing, 3));
    else if (showing === 'schutz') labels(part, ringLook(showing, 4));
  });

  /* ---- the hand: click, space, arrows; no wheel, no scroll, no pointer ---- */
  addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key;
    if (k === ' ' || k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === 'Enter' || k === 'n') { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace' || k === 'p') { e.preventDefault(); prev(); }
    else if (k === 'Home') { e.preventDefault(); first(); }
    else if (k === 'End') { e.preventDefault(); lastStep(); }
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

  /* ---- the curtain: down until the scenes are warm, never less than a beat ---- */
  var pre = $('#pre'), t0 = performance.now();
  function lift() {
    setTimeout(function () {
      if (pre.animate) pre.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, easing: 'cubic-bezier(.455,.03,.515,.955)', fill: 'forwards' }).onfinish = function () { pre.style.display = 'none'; };
      else pre.style.display = 'none';
    }, Math.max(0, 1100 - (performance.now() - t0)));
  }
  Promise.all([ice.ready, document.fonts ? document.fonts.ready : null]).then(function () {
    window.__deck = { next: next, prev: prev, at: function () { return at; }, steps: steps, ice: ice, ready: true };
    /* And the curtain does not simply lift: igloo's cut, bent into a circle,
       opens it from the middle, and the hero comes up through the opening. */
    var heroEl = $('.tilt');
    setTimeout(function () {
      ice.plunge({
        dur: 1.2,
        begin: function () { pre.style.display = 'none'; },
        step: function (q) { heroEl.style.transform = 'scale(' + (1 - 0.3 * (1 - q) * (1 - q)).toFixed(4) + ')'; }
      }).then(function (went) { heroEl.style.transform = ''; opening = false; if (!went) lift(); });
    }, Math.max(0, 1100 - (performance.now() - t0)));
  }, function (err) {
    console.error('[DECK] ' + err.message);
    window.__deck = { failed: true };
    opening = false;
    lift();
  });
})();
