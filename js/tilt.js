/* ============================================================================
   The hero over the first slide: Groove Dynamics' tilted grid hero (ruixen.ui,
   21st.dev), taken over as it stands in that project's src/05-script.html.
   ========================================================================== */
var tiltDriver = (function () {
'use strict';
var $ = function (s, c) { return (c || document).querySelector(s); };
var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
/* ============================================================================
   01 — TILTED GRID HERO
   The component's own geometry and its own defaults. A CSS box cannot bend,
   so every tile is cut into sixteen upright strips, each a flat facet of the
   cylinder; the tile carries them round on one rotation, and only its delay
   says where on the arc it is.
   ========================================================================== */
function tiltDriver(panel) {
  var root = $('.tilt', panel), band = $('.tilt__band', panel);
  var SLICES = 16, CAMERA = 1.6, MAX_WIDTH = 55;
  var speed = 4, tileHeight = 26, aspect = 16 / 9, gap = 6, axis = 56, curve = 80, fade = 12;
  var bend = clamp(curve, 5, 85) * Math.PI / 180;

  /* the pictures of the component's own demo, in its order: photographs and
     gradients in turn, served from where the demo serves them */
  var CDN = 'https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev';
  var images = [
    '/stock-images/767d99bb371a54d0d36751e8cecae43c.jpg',
    '/gradients/hero_gradient/hero-gradients-01.png',
    '/stock-images/821d815affa6496c39cbdeeec7a84603.jpg',
    '/gradients/moon/moon-grade-03.png',
    '/stock-images/937438c560ada1c83317f2c11b3454b0.jpg',
    '/gradients/shade_shiters/shade-shifters-05.png',
    '/stock-images/98f89cb9994f5c382ab964062c4039db.jpg',
    '/gradients/shade_shiters/shade-shifters-09.png',
    '/stock-images/ddcbee38be8b7274e19e132d7ab35b53.jpg',
    '/gradients/moon/moon-grade-06.png'
  ].map(function (path) { return CDN + path; });
  /* fetched up front: a tile picks up its next one just before it comes back
     into view, too late to start loading it then */
  images.forEach(function (src) { new Image().src = src; });

  /* radius, as a share of the width, that puts the frame's edge `bend` round the arc */
  function arc(b) { return (CAMERA - 1 + Math.cos(b)) / (2 * CAMERA * Math.sin(b)); }
  function measure(width, height) {
    var h = Math.min(tileHeight / 100 * height, MAX_WIDTH / 100 * width / aspect);
    var radius = width * arc(bend);
    if (!(h > 0) || !(radius > 0)) return { columns: 2, sweep: 0, unit: 0, limit: 0 };
    var deg = function (rad) { return rad * 180 / Math.PI; };
    var unit = deg(h / radius);
    var pitch = (aspect + gap / 100) * unit;
    var limit = deg(bend) + aspect * unit / 2;
    var columns = Math.min(60, Math.max(2, Math.ceil(2 * limit / pitch)));
    var round = function (v) { return +v.toFixed(4); };
    var sweep = round(columns * pitch / 2);
    return { columns: columns, sweep: sweep, unit: round(unit), limit: round(Math.min(sweep, limit)) };
  }

  /* every length is a multiple of the tile's height */
  function u(v) {
    return 'calc(' + +v.toFixed(4) + ' * min(' + tileHeight + 'cqh, ' + +(MAX_WIDTH / aspect).toFixed(4) + 'cqw))';
  }
  var r = 100 * arc(bend), radius = +r.toFixed(3) + 'cqw';
  /* out to the axis, round it, back in */
  function turn(deg) {
    return 'translateZ(' + radius + ') rotateY(' + +deg.toFixed(4) + 'deg) translateZ(-' + radius + ')';
  }

  var mask = 'linear-gradient(90deg,transparent,#000 ' + fade + '%,#000 ' + (100 - fade) + '%,transparent)';
  band.style.perspective = +(r * CAMERA).toFixed(3) + 'cqw';
  band.style.perspectiveOrigin = '50% ' + axis + '%';
  band.style.maskImage = mask; band.style.webkitMaskImage = mask;

  var sheet = document.createElement('style');
  root.insertBefore(sheet, band);
  var layout = null;

  function lay(l) {
    var hide = +((l.sweep - l.limit) / (2 * l.sweep || 1) * 100).toFixed(4);
    var share = aspect / SLICES, duration = l.columns * speed;
    sheet.textContent =
      '@keyframes tilt-orbit{from{transform:' + turn(-l.sweep) + '}to{transform:' + turn(l.sweep) + '}' +
      '0%,' + hide + '%,' + (100 - hide) + '%,100%{visibility:hidden}' +
      (hide + 0.001) + '%,' + (100 - hide - 0.001) + '%{visibility:visible}}' +
      '@media(prefers-reduced-motion:reduce){.tilt__tile{animation-play-state:paused}}';

    band.textContent = '';
    for (var t = 0; t < l.columns; t++) {
      (function (t) {
        /* the last tile starts nearest the exit, so this numbers them as they come on */
        var first = l.columns - 1 - t;
        var tile = document.createElement('div'), pics = [];
        tile.className = 'tilt__tile';
        tile.style.left = 'calc(50% - ' + u(aspect / 2) + ')';
        tile.style.top = 'calc(' + axis + '% - ' + u(0.5) + ')';
        tile.style.width = u(aspect); tile.style.height = u(1);
        tile.style.animation = 'tilt-orbit ' + duration + 's linear ' + (-t * speed) + 's infinite';
        for (var k = 0; k < SLICES; k++) {
          var strip = document.createElement('div'), img = document.createElement('img');
          strip.className = 'tilt__strip';
          strip.style.left = u((aspect - share) / 2);
          /* a pixel wider than its share, so no hairline opens between facets */
          strip.style.width = k === SLICES - 1 ? u(share) : 'calc(' + u(share) + ' + 1px)';
          strip.style.height = u(1);
          strip.style.transform = turn((aspect / 2 - (k + 0.5) * share) * l.unit);
          img.alt = ''; img.draggable = false;
          img.style.left = u(-k * share); img.style.width = u(aspect); img.style.height = u(1);
          img.src = images[first % images.length];
          strip.appendChild(img); tile.appendChild(strip); pics.push(img);
        }
        /* a tile takes its next picture each time it wraps, out of sight */
        tile.addEventListener('animationiteration', function (e) {
          if (e.target !== tile) return;
          var src = images[(Math.round(e.elapsedTime / duration) * l.columns + first) % images.length];
          for (var i = 0; i < pics.length; i++) if (pics[i].src !== src) pics[i].src = src;
        });
        band.appendChild(tile);
      })(t);
    }
  }

  new ResizeObserver(function (entries) {
    var box = entries[0].contentRect, next = measure(box.width, box.height);
    if (layout && layout.columns === next.columns && layout.sweep === next.sweep && layout.unit === next.unit) return;
    layout = next; lay(next);
    band.classList.add('is-laid');
  }).observe(root);

  return {
    /* off screen the row holds still; it picks up where it stopped */
    enter: function () { root.classList.remove('is-off'); },
    leave: function () { root.classList.add('is-off'); },
    progress: function () {},
    step: function () {}
  };
}
return tiltDriver;
})();
