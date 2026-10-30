/* ============================================================================
   WORDS — what igloo's fall through the rings does not carry: three paragraphs,
   one in each quiet stretch between two rings, and the one button where the
   fall ends. A paragraph comes up out of the depth, stands to be read, and
   burns away letter by letter as the next ring arrives.

   The paragraphs are the page's own type, set by the browser, so they break
   and space like any other text here — but they are not shown as HTML. Each is
   drawn into a sheet of its own, and the ice (src/ice/ice.js) hangs the sheets
   in igloo's picture the way igloo hangs its labels: there they are ink on the
   paper and igloo's glowing white on a ring.
   ========================================================================== */
var GDWords = (function () {
  'use strict';

  /* how far down the fall each paragraph stands still. Igloo's rings flash as
     they pass; these are the places in between where nothing flashes. */
  var STOPS = [0.212, 0.318, 0.415];
  /* where the fall ends: just through the third ring, the last paragraph
     burnt away, before the floor and its circles would come up (the ice
     leaves them out). Igloo goes on from here into a room; this page does not. */
  var END = 0.462;

  /* the fall, turned into "which paragraph is in front" as a running number */
  var KNOTS = [[0.14, -0.95], [0.212, 0.5], [0.318, 1.5], [0.415, 2.5], [0.462, 3.1]];
  var LEAD = 0.7, BURN_AT = 0.62, BURN_LEN = 0.38;
  var FLOOR = 0.3, FAR = 4, NEAR = 0.25, OVER = 0.09;
  /* the next paragraph only shows once the one being read has begun to burn:
     nothing small and grey behind the lines while they stand */
  var APPEAR = 0.42, RISE = 0.3;
  /* a margin round a paragraph, so no letter touches the edge of its sheet */
  var PAD = 6;

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function head(p) {
    var last = KNOTS.length - 1;
    if (p <= KNOTS[0][0]) return KNOTS[0][1];
    if (p >= KNOTS[last][0]) return KNOTS[last][1];
    for (var i = 1; i <= last; i++) {
      if (p <= KNOTS[i][0]) {
        var a = KNOTS[i - 1], b = KNOTS[i];
        return a[1] + (b[1] - a[1]) * (p - a[0]) / (b[0] - a[0]);
      }
    }
  }

  function create(panel) {
    var ps = Array.prototype.slice.call(panel.querySelectorAll('.words__p'));
    var go = panel.querySelector('.words__go');
    var shown = false;
    /* sheet pixels per CSS pixel: a standing paragraph is shown a little under
       its set size, a burning one grows — this keeps both crisp enough */
    var K = Math.min(3, Math.max(1.5, (window.devicePixelRatio || 1) * 1.5));

    ps.forEach(function (p) {
      var text = p.textContent; p.textContent = '';
      for (var i = 0; i < text.length; i++) {
        if (text[i] === ' ') { p.appendChild(document.createTextNode(' ')); continue; }
        var s = document.createElement('span'); s.textContent = text[i]; p.appendChild(s);
      }
    });

    var sheets = ps.map(function () {
      var canvas = document.createElement('canvas');
      return {
        canvas: canvas, ctx: canvas.getContext('2d'),
        version: 0,            /* goes up when the sheet changes size */
        dirty: false,          /* set when it has been redrawn */
        w: 0, h: 0,            /* its size on the page, margin included */
        show: 0, scale: 1,     /* how it is to be hung this frame */
        letters: [], font: '', burn: -1
      };
    });

    /* where the browser put every letter, and the moment each one catches:
       from the middle outwards, unevenly */
    function measure() {
      ps.forEach(function (p, i) {
        var s = sheets[i], box = p.getBoundingClientRect(), style = getComputedStyle(p);
        if (!box.width || !box.height) return;
        s.font = style.fontWeight + ' ' + (parseFloat(style.fontSize) * K).toFixed(2) + 'px ' + style.fontFamily;
        s.ctx.font = s.font;
        var ascent = s.ctx.measureText('Hg').fontBoundingBoxAscent / K;
        s.letters = Array.prototype.map.call(p.children, function (el) {
          var r = el.getBoundingClientRect();
          var X = (r.left + r.width / 2 - box.left) / box.width;
          var Y = (r.top + r.height / 2 - box.top) / box.height;
          var noise = 0.5 + 0.28 * Math.sin(X * 11.3 + Y * 6.1 + 1.7)
                          + 0.22 * Math.sin(X * 5.7 - Y * 13.9 + 4.2);
          var rad = Math.hypot(X - 0.5, (Y - 0.5) * 1.15) / 0.62;
          return { ch: el.textContent, x: r.left - box.left, y: r.top - box.top + ascent,
                   t: clamp01(0.05 + 0.55 * rad + 0.45 * noise) };
        });
        s.w = box.width + 2 * PAD; s.h = box.height + 2 * PAD;
        var cw = Math.ceil(s.w * K), ch = Math.ceil(s.h * K);
        if (s.canvas.width !== cw || s.canvas.height !== ch) {
          s.canvas.width = cw; s.canvas.height = ch; s.version++;
        }
        draw(s, s.burn < 0 ? 0 : s.burn);
      });
    }

    /* the sheet carries only where the letters are; the colour is igloo's */
    function draw(s, burn) {
      var c = s.ctx;
      s.burn = burn;
      c.clearRect(0, 0, s.canvas.width, s.canvas.height);
      c.font = s.font; c.textBaseline = 'alphabetic'; c.fillStyle = '#fff';
      for (var i = 0; i < s.letters.length; i++) {
        var l = s.letters[i], a = clamp01((l.t + 0.09 - burn) * 11);
        if (a <= 0) continue;
        c.globalAlpha = a;
        c.fillText(l.ch, (PAD + l.x) * K, (PAD + l.y) * K);
      }
      c.globalAlpha = 1;
      s.dirty = true;
    }

    measure();
    addEventListener('resize', measure, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

    return {
      stops: STOPS, end: END,
      /* one sheet per paragraph: its canvas, and how it is to be hung this frame */
      sheets: sheets,
      /* p: how far down the fall, 0..1 — below zero while the rings are not on screen */
      set: function (p) {
        var h = head(p);
        /* on a device that could not build the ice there is no picture to hang
           them in: there the paragraphs are shown as the text they are */
        var plain = panel.classList.contains('is-plain');
        for (var i = 0; i < sheets.length; i++) {
          var s = sheets[i], tt = h - i, line = ps[i].parentNode;
          var vis = clamp01((tt + APPEAR) / RISE) * (FLOOR + (1 - FLOOR) * clamp01(tt / 0.45));
          if (vis <= 0 || tt > 1 || !s.letters.length) {
            s.show = 0;
            if (plain) line.style.opacity = '0';
            continue;
          }
          var depth = Math.max(FAR - (FAR - NEAR) * (tt + LEAD) / (1 + LEAD), NEAR);
          if (plain) {
            line.style.opacity = (vis * (1 - clamp01((tt - BURN_AT) / BURN_LEN))).toFixed(3);
            line.style.transform = 'scale(' + (1 / depth).toFixed(4) + ')';
            s.show = vis; s.scale = 1 / depth;
            continue;
          }
          /* burning is redrawn in steps too fine to see */
          var burn = Math.round(clamp01((tt - BURN_AT) / BURN_LEN) * (1 + OVER) * 96) / 96;
          if (burn !== s.burn) draw(s, burn);
          s.show = vis; s.scale = 1 / depth;
        }
        var on = p > END - 0.012;
        if (on !== shown) { shown = on; if (go) go.classList.toggle('is-on', on); }
      }
    };
  }

  return { create: create };
})();
