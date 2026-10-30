/* ============================================================================
   THE ICE — igloo.inc's own scenes, from igloo's own bundle, laid end to end
   the way igloo's own controller lays them (its jF): a page, the two blocks
   of ice, a page again, and the inside of a block. On a page the canvas is
   clear and the slide under it shows; igloo's cut carries the screen from one
   to the next, as it does between Groove Dynamics' hero and its ice.

   Nothing is scrolled. The presentation says where to go next, and igloo's
   own glide takes the number there that igloo's wheel would have moved. The
   words that shine — a block's title beside it, the last word inside — are
   written the way igloo writes its own mark in the corner of igloo.inc: its
   mark's shader, its type, its bloom, its flicker as they come.
   ========================================================================== */
var Ice = (function () {
  'use strict';

  var BUNDLE_URL = 'assets/igloo/App3D-patched.js';
  /* how long a device may take to build the scenes before the presentation goes on without them */
  var PATIENCE = 30;
  /* how far left of centre the blocks sit, in screen widths (igloo: 0.17) */
  var SHIFT = 0.17;
  /* the kinds of place in the line */
  var PAGE = 'page', BLOCKS = 'cubes', INSIDE = 'detail';

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function round2(v) { return Math.round(v * 100) / 100; }

  /* a figure of one's own, as Groove Dynamics' src/export/make-figures.mjs writes it */
  function readFigure(name) {
    return fetch('assets/figures/' + name + '.bin').then(function (r) {
      if (!r.ok) throw new Error('not in assets/figures');
      return r.arrayBuffer();
    }).then(function (buf) {
      var dv = new DataView(buf);
      if (String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3)) !== 'GDF1') throw new Error('not a figure');
      var n = dv.getUint32(4, true), ni = dv.getUint32(8, true), nm = dv.getUint32(12, true), at = 16;
      var f = { name: name };
      f.position = new Float32Array(buf, at, n * 3); at += n * 12;
      f.normal = new Float32Array(buf, at, n * 3); at += n * 12;
      f.uv = new Float32Array(buf, at, n * 2); at += n * 8;
      f.index = new Uint32Array(buf, at, ni); at += ni * 4;
      f.colours = new Uint8Array(buf, at, nm * 3);
      return f;
    });
  }

  function create(o) {
    var ig = null, box = null, board = null;
    var line = [], cubes = null, cubesComposer = null, detail = null, detailComposer = null, ui = null;
    var cut = null, plane = null, clear = null, round = null;
    var figures = {}, glows = {};
    var scroll = { total: 0, targetY1: 0, targetY2: 0, y: 0, velocity: 0 };
    var bridge = { scroll: scroll, isDetailOpen: false, scrollComposers: [], round: round2, centerScroll: function () {} };
    var ready = false, failed = false, warm = 0, last = 0, lastT = 0;
    var resolveReady, rejectReady;
    var api = {
      ready: new Promise(function (y, n) { resolveReady = y; rejectReady = n; }),
      scroll: scroll,
      failed: function () { return failed; }
    };

    function fail(why) {
      if (failed) return;
      failed = true;
      console.error('[ICE] ' + why);
      if (box) box.style.display = 'none';
      rejectReady(new Error(why));
    }
    var patience = setTimeout(function wait() {
      if (ready) return;
      if (document.hidden) { patience = setTimeout(wait, 2000); return; }
      fail('the scenes took too long');
    }, PATIENCE * 1000);

    var supported = (function () {
      try { return !!(window.WebGL2RenderingContext && document.createElement('canvas').getContext('webgl2')); } catch (e) { return false; }
    })();
    if (!supported) { fail('no WebGL 2'); return api; }

    /* Igloo asks for its files from the top of the host. Where the page lives
       in a folder of its own it is told that folder — and its four workers,
       whose addresses are written out in full, are sent there too. */
    var home = location.pathname.replace(/[^/]*$/, '');
    if (home !== '/' && window.Worker && !window.Worker.__home) {
      var Native = window.Worker;
      window.Worker = function (url, options) {
        if (typeof url === 'string' && url.indexOf('/assets/') === 0) url = home + url.slice(1);
        return new Native(url, options);
      };
      window.Worker.prototype = Native.prototype;
      window.Worker.__home = true;
    }

    var wanted = (o.blocks || []).map(function (b) { return b && b.figure; }).filter(Boolean);
    Promise.all(wanted.map(function (name) {
      return readFigure(name).then(function (f) { figures[name] = f; }, function (err) { console.warn('[ICE] figure ' + name + ': ' + err.message); });
    })).then(function () {
      var script = document.createElement('script');
      script.src = BUNDLE_URL;
      script.onload = function () {
        ig = window.__igloo;
        if (!ig || !ig.JF) { fail('the bundle has nothing to offer'); return; }
        engine();
      };
      script.onerror = function () { fail('the bundle did not load'); };
      document.head.appendChild(script);
    });

    function engine() {
      box = document.createElement('div');
      box.className = 'scene';
      box.setAttribute('aria-hidden', 'true');
      (o.mount || document.body).appendChild(box);
      /* igloo listens for the pointer on a node of its own that nothing ever
         touches: there is no mouse in a presentation */
      var quiet = document.createElement('div');
      var dpr = window.devicePixelRatio || 1;
      ig.he.init({
        canvasCnt: box, interactionNode: quiet, shadowMap: true, shadowMapType: 2, relativePath: home,
        fingers: 2, audioContext: false, contextMenu: true,
        DPR: Math.min(dpr, 1.5), adaptiveDPR: true
      }).then(function () {
        mendSmoothing();
        ig.he.renderer.webgl.domElement.addEventListener('webglcontextlost', function () { fail('the graphics context was lost'); });
        /* the pointer waits at the foot of the picture, away from the blocks */
        ig.$t.boundTouchesMove({ clientX: innerWidth * 0.5, clientY: innerHeight * 0.98, pointerType: 'mouse', button: 0 });
        var tick = function () {
          if (!(ig.Fe.time > 0)) return;
          ig.Q.off('webgl_prerender', tick);
          try { build(); } catch (err) { fail('the scenes could not be built: ' + err.message); }
        };
        ig.Q.on('webgl_prerender', tick);
        ig.Q.emit('webgl_render_active', true);
      }, function (err) { fail('the engine did not start: ' + err.message); });
    }

    /* iOS 27 will not compile igloo's edge smoothing as written; the same three
       places as on Groove Dynamics' pages are said the long way round */
    function mendSmoothing() {
      var places = [
        [/(\w*[mM]ovec)\(c\.xy,variable\.xy,value\.xy\);\1\(c\.zw,variable\.zw,value\.zw\);/g,
         'if(c.x){variable.x=value.x;}if(c.y){variable.y=value.y;}if(c.z){variable.z=value.z;}if(c.w){variable.w=value.w;}'],
        [/detectHorizontalCornerPattern\(weights\.rg,coords\.xyzy,d\);/g,
         'vec2 across=weights.rg;detectHorizontalCornerPattern(across,coords.xyzy,d);weights.rg=across;'],
        [/detectVerticalCornerPattern\(weights\.ba,coords\.xyxz,d\);/g,
         'vec2 upright=weights.ba;detectVerticalCornerPattern(upright,coords.xyxz,d);weights.ba=upright;']
      ];
      function mend(holder) {
        if (!holder || typeof holder.fragmentShader !== 'string') return;
        var source = holder.fragmentShader;
        places.forEach(function (p) { source = source.replace(p[0], p[1]); });
        if (source === holder.fragmentShader) return;
        holder.fragmentShader = source;
        if (holder.isMaterial) holder.needsUpdate = true;
      }
      try {
        ig.he.composer.passes.forEach(function (pass) {
          ((pass._effectComposer || {}).passes || []).forEach(function (inner) {
            (inner.effects || []).forEach(function (effect) { mend(effect); mend(effect.weightsMaterial); });
            mend(inner.fullscreenMaterial);
          });
        });
      } catch (e) {}
    }

    /* ---- the scenes ---- */
    function build() {
      /* there is nothing to click in a presentation: the date stands alone */
      ig.Be.click = '';
      (o.blocks || []).forEach(function (b, i) {
        var cube = ig.Be.cubes[i], inside = cube && cube.interior;
        if (!cube || !b) return;
        if (b.label) cube.title = b.label;
        if (b.date) cube.date = b.date;
        if (b.title) inside.title = b.title;
        if (b.text) inside.content = b.text;
        if (b.linkTitle) inside.socialTitle = b.linkTitle;
        if (b.links) inside.social = b.links;
        if (b.moreTitle) inside.linkTitle = b.moreTitle;
        if (b.more) inside.links = b.more;
        var f = b.figure && figures[b.figure];
        if (f) {
          var g = new ig.ot();
          g.setAttribute('position', new ig.We(f.position, 3));
          g.setAttribute('normal', new ig.We(f.normal, 3));
          g.setAttribute('uv', new ig.We(f.uv, 2));
          g.setIndex(new ig.We(f.index, 1));
          g.computeBoundingBox(); g.computeBoundingSphere();
          var pic = picture(f.colours);
          ig.zt._geometryCache.set(f.name + '.drc_<>_default', Promise.resolve(g));
          ig.le._texturesCache.set('cubes/' + f.name + '_color.ktx2_<>_default', pic);
          ig.le._texturesCache.set(f.name + '_dark_color.ktx2_<>_default', pic);
          cube.innerobject = f.name;
          inside.obj = f.name;
          inside.objScale = 1.1;
        }
      });

      /* igloo's own way of setting its scenes up: a composer each */
      cubesComposer = new ig.tA({ scene: new ig.ty.cubes({ mainController: bridge }) });
      cubes = cubesComposer.passes[0].scene;
      bridge.scrollComposers = [cubesComposer, cubesComposer];
      detail = new ig.JF({ mainController: bridge });
      detailComposer = new ig.tA({ scene: detail });
      ui = new ig.GF({ mainController: bridge });

      /* the line of places: pages, the blocks, the inside of a block */
      var heights = { page: 1, cubes: cubes.height, detail: 1 };
      var top = 0;
      line = (o.line || [PAGE, BLOCKS, PAGE, INSIDE]).map(function (kind) {
        var s = { kind: kind, height: heights[kind], top: top };
        top += s.height;
        return s;
      });

      /* one triangle fills the screen with them, through igloo's cut */
      board = ig.he.renderPass.scene;
      cut = new ig.f3();
      plane = new ig.Ce(ig.Si.triangle, cut);
      plane.frustumCulled = false;
      board.add(plane);

      Promise.all([cubes.uploaded, detail.uploaded, ui.uploaded, board._upload()]).then(function () {
        /* Of igloo's own words on the screen the presentation keeps the text
           inside a block. igloo's mark, its sound switch, its hint to scroll
           and its close button belong to igloo's site. */
        ui.projects.setMouseSim(detail.mouseSim);
        var mark = ui.logo.mesh.material, type = ui.scroll.message;
        ui.children.slice().forEach(function (child) { if (child !== ui.projects.group && !child.isCamera) ui.remove(child); });
        shining(mark, type);
        frame();
        ig.Q.on('resize', frame);
        /* igloo's words are drawn before its bloom, as on igloo.inc, so they glow */
        var said = new ig.h3(ui, ui.camera, undefined, false, false);
        said.clear = false;
        var passes = ig.he.composer.passes, at = passes.length;
        passes.forEach(function (p, i) { if (at === passes.length && p._effectComposer) at = i; });
        ig.he.composer.insertPass ? ig.he.composer.insertPass(said, at) : passes.splice(at, 0, said);
        clear = clearPass();
        ig.he.composer.addPass(clear.pass);
        board.beforeRenderCbs.push(draw);
        /* a few frames behind the curtain, half-way through each cut and half-way
           into a block, so every shader is compiled before anything is shown */
        warm = 12;
        ig.Q.on('webgl_postrender', function () {
          if (!warm) return;
          if (--warm === 0) {
            cut.uniforms.uDetailProgress.value = 0;
            cut.uniforms.uDetailProgress2.value = 0;
            scroll.y = 0;
            Object.keys(glows).forEach(function (k) { glows[k].mesh.visible = false; });
            clearTimeout(patience);
            ready = true;
            resolveReady(api);
          }
        });
        ig.Q.emit('webgl_render_active', true);
      }, function (err) { fail('the scenes did not upload: ' + (err && err.message)); });
    }

    /* A figure's picture (Groove Dynamics' make-figures.mjs): a column per
       colour, dark at the bottom, light at the top. */
    function picture(colours) {
      var n = colours.length / 3, W = 8, H = 128, c = document.createElement('canvas');
      c.width = n * W; c.height = H;
      var x = c.getContext('2d'), img = x.createImageData(c.width, H), d = img.data;
      for (var y = 0; y < H; y++) {
        var v = 1 - y / (H - 1), lit = 0.45 + 0.6 * v, shine = Math.max(0, v - 0.86) / 0.14;
        for (var m = 0; m < n; m++) for (var k = 0; k < W; k++) {
          var at = (y * c.width + m * W + k) * 4;
          for (var ch = 0; ch < 3; ch++) d[at + ch] = Math.min(255, Math.round(colours[m * 3 + ch] * lit + 18 * shine * shine));
          d[at + 3] = 255;
        }
      }
      x.putImageData(img, 0, 0);
      var t = new ig.Rt(c);
      t.minFilter = t.magFilter = 1006;
      t.generateMipmaps = false;
      t.needsUpdate = true;
      t._loaded = Promise.resolve(t);
      return t;
    }

    /* The words that shine, written as igloo writes its mark in the corner of
       igloo.inc: the mark's own shader — its colour, the flicker and the
       blocks that shift it as it comes, its edges read from the distance
       field — over igloo's own type in place of the mark's drawing, in
       igloo's own words scene, which igloo's bloom lights. */
    function shining(mark, type) {
      var Type = type.constructor;
      var vertex = type.material.vertexShader
        .replace(/vUv\.x = mod\([^;]*;/, '')
        .replace(/vAlpha = tr1;/, 'vAlpha = 1.0;');
      var fragment = mark.fragmentShader.replace(/vec2 uv = imagefitUV\([^;]*;/, 'vec2 uv = vUv;');
      (o.glows || []).forEach(function (g) {
        var text = new Type({ font: 'IBMPlexMono-Medium', text: g.text, width: 40, align: g.align || 'left', lineHeight: 0.8, size: 0.09 }, {
          uniforms: {
            tMap: { value: ig.le.load('../fonts/IBMPlexMono-Medium-datatexture.ktx2', 'data') },
            tBlocks: mark.uniforms.tBlocks,
            uColor: { value: mark.uniforms.uColor2.value.clone() },
            uColor2: { value: mark.uniforms.uColor2.value.clone() },
            uShow: { value: 1 },
            uRand: { value: Math.random() },
            uShow1: { value: 1 }, uShow2: { value: 1 }
          },
          vertexShader: vertex, fragmentShader: fragment,
          depthWrite: false, depthTest: false, transparent: true
        });
        text.name = 'shine ' + g.name;
        text.frustumCulled = false;
        text.renderOrder = 1000;
        ui.add(text);
        glows[g.name] = { mesh: text, g: g, on: false };
      });
    }
    /* where a shining word stands: by its own edge or middle, in screen pixels, at a height in pixels */
    function place(w) {
      var g = w.g, m = w.mesh, W = innerWidth, H = innerHeight;
      var px = g.size(W, H), k = px / 0.09;
      m.scale.set(k, k, 1);
      /* the words' own outline, in their own units: they stand by its left edge or its middle, and by their middle in height */
      var geo = m.geometry, bb = geo && (geo.boundingBox || (geo.computeBoundingBox && (geo.computeBoundingBox(), geo.boundingBox)));
      var at = g.at(W, H), x = at[0], y = at[1];
      if (bb && isFinite(bb.min.x)) {
        x -= (g.align === 'center' ? (bb.min.x + bb.max.x) / 2 : bb.min.x) * k;
        m.position.set(x, -y - (bb.min.y + bb.max.y) / 2 * k, 0);
      } else m.position.set(x, -y, 0);
    }
    api.shine = function (name, on, delay) {
      var w = glows[name];
      if (!w || w.on === on) return;
      w.on = on;
      var u = w.mesh.material.uniforms;
      ig.re.killTweensOf(u.uShow);
      if (on) {
        place(w);
        u.uRand.value = Math.random();
        u.uShow.value = 0;
        w.mesh.visible = true;
        /* as igloo's mark comes on: half a second of flicker and shifted blocks */
        ig.re.fromTo(u.uShow, { value: 0 }, { value: 1, delay: delay || 0, duration: 0.5, ease: 'none', overwrite: true });
      } else {
        ig.re.to(u.uShow, { value: 0, duration: 0.25, ease: 'none', overwrite: true, onComplete: function () { w.mesh.visible = false; } });
      }
    };

    /* the blocks stand left of centre on a wide screen; the camera's window moves, not the canvas */
    function frame() {
      var w = innerWidth, h = innerHeight, shift = SHIFT * clamp01((w / h - 0.9) / 0.5);
      cubes.camera.setViewOffset(w, h, shift * w, 0, w, h);
      Object.keys(glows).forEach(function (k) { if (glows[k].on) place(glows[k]); });
    }

    /* behind the curtain: half-way through each cut, and half-way into a block */
    function warmAt() {
      var i = Math.min(line.length - 1, Math.floor((12 - warm) / 3));
      return line[i].top + line[i].height - 0.5;
    }

    /* Igloo's cut climbs the screen as a diagonal. The way in is the same cut
       bent into a circle, as on Groove Dynamics' scroll page: igloo's own
       shader, read from the middle outwards instead of from the bottom up;
       the slide and the smear along the edge are switched off. */
    function roundCut() {
      var material = new ig.f3(), source = material.fragmentShader;
      var edits = [
        ['vUv.y + inclination * abs(slope)',
         '(length((vUv - 0.5) * vec2(aspect, 1.0)) / length(vec2(aspect, 1.0) * 0.5) + (slopeDisp + 0.4) * abs(slope) * 0.5)'],
        ['const float parallaxY = 0.4;', 'const float parallaxY = 0.0;'],
        ['const float displacement = 0.025;', 'const float displacement = 0.0;'],
        ['float modulator = 12.0 *', 'float modulator = 0.0 *']
      ];
      for (var i = 0; i < edits.length; i++) {
        if (source.indexOf(edits[i][0]) < 0) return null;
        source = source.split(edits[i][0]).join(edits[i][1]);
      }
      material.fragmentShader = source;
      return material;
    }

    /* The way in, once, when the curtain lifts: the canvas lies over the first
       slide as a sheet of paper, the round cut opens it from the middle —
       igloo's sky first, as the band it is in every cut, and behind it the
       slide itself — and runs out over the corners. */
    var dive = null;
    var LAG = 0.22;
    api.plunge = function (opts) {
      if (!ready || dive) return Promise.resolve(false);
      if (!round) round = roundCut();
      if (!round) return Promise.resolve(false);
      return new Promise(function (done) {
        dive = { t0: performance.now(), dur: (opts && opts.dur) || 1.2, o: opts || {}, done: done };
        plane.material = round;
        var first = function () { ig.Q.off('webgl_postrender', first); if (opts && opts.begin) opts.begin(); };
        ig.Q.on('webgl_postrender', first);
        ig.Q.emit('webgl_render_active', true);
      });
    };
    function dip() {
      var k = clamp01((performance.now() - dive.t0) / 1000 / dive.dur);
      if (k >= 1) {
        var d = dive;
        dive = null;
        plane.material = cut;
        cubes.isSceneVisible = false;
        d.done(true);
        return draw();
      }
      var q = k * (0.35 + 0.65 * k), hole = clamp01((q - LAG) / (1 - LAG)), u = round.uniforms;
      /* the sky is the blocks' own, from above them, before the first has come up */
      cubes.isSceneVisible = true; cubes.progress = 0;
      cubesComposer.render();
      clear.mask(round, clear.everything, clear.nothing, hole);
      u.tScene1.value = clear.everything;
      u.tScene2.value = cubesComposer.readBuffer.texture;
      u.uProgress.value = q;
      u.uInCubes.value = false;
      if (dive.o.step) dive.o.step(q);
    }

    /* ---- each frame, from inside igloo's own render, as igloo's controller renders (jF.render) ---- */
    function draw() {
      if (dive) return dip();
      if (!ready && !warm) return;
      var y = warm ? warmAt() : scroll.y, u = cut.uniforms;
      if (warm) u.uDetailProgress.value = warm <= 2 ? 0.5 : 0;
      var now = performance.now(), dt = clamp((now - (lastT || now - 16)) / 1000, 0.001, 0.1);
      lastT = now;
      scroll.velocity += Math.abs(y - last);
      scroll.velocity *= Math.pow(0.98, dt * 60);
      scroll.velocity = clamp(scroll.velocity, 0, 1);
      if (scroll.velocity < 0.001) scroll.velocity = 0;
      last = y;

      /* the screen is one unit tall: its top edge sits in one place, its bottom edge maybe in the next */
      var n = round2(y), r = round2(y + 1), held = null, coming = null, into = 0;
      cubes.isSceneVisible = false;
      line.forEach(function (s, i) {
        var bottom = s.top + s.height;
        var holdsTop = n >= s.top && n < bottom, holdsBottom = r > s.top && r <= bottom;
        if (s.kind === BLOCKS && (holdsTop || holdsBottom)) { cubes.progress = (y + 1 - s.top) / (s.height + 1); cubes.isSceneVisible = true; }
        if (holdsTop) held = i; else if (holdsBottom && coming === null) { coming = i; into = y + 1 - s.top; }
      });
      if (held === null) held = line.length - 1;

      var d = u.uDetailProgress.value;
      if (d < 1 || warm) {
        u.tScene1.value = picture1(held);
        if (coming !== null) u.tScene2.value = picture1(coming);
      }
      u.uProgress.value = coming !== null ? clamp01(into) : 0;
      u.uProgressVel.value = scroll.velocity;
      if (cubesComposer.readBuffer) u.tCubes.value = cubesComposer.readBuffer.texture;
      u.uInCubes.value = (line[held].kind === BLOCKS && coming === null) || !!warm;
      if (d > 0 || warm) {
        if (line[held].kind !== INSIDE) detailComposer.render();
        u.tDetail.value = detailComposer.readBuffer.texture;
      }
      var page = line[held].kind === PAGE || (coming !== null && line[coming].kind === PAGE);
      clear.update(page, line[held].kind === PAGE);
      bridge.isDetailOpen = d > 0;
    }
    function picture1(i) {
      var s = line[i];
      if (s.kind === PAGE) return clear.nothing;
      if (s.kind === BLOCKS) { cubesComposer.render(); return cubesComposer.readBuffer.texture; }
      detailComposer.render();
      return detailComposer.readBuffer.texture;
    }

    /* While the cut runs between a page and the scenes, what lies on the
       page's side of it is nothing: there the canvas is clear and the slide
       shows through. Which side is which is sent through igloo's cut itself,
       so the clear part has igloo's edge (Groove Dynamics' eisbloecke.js). */
    function clearPass() {
      var renderer = ig.he.renderer.webgl, size = ig.he.uniforms.resolution.value;
      var matte = new ig.vt(size.x, size.y, { depthBuffer: false });
      var nothing = new ig.vt(2, 2, { depthBuffer: false }), everything = new ig.vt(2, 2, { depthBuffer: false });
      var back0 = renderer.getRenderTarget(), alpha = renderer.getClearAlpha(), colour = cubes.bg.mesh.material.uniforms.uColor1.value.clone();
      renderer.getClearColor(colour);
      [[nothing, 0x000000], [everything, 0xffffff]].forEach(function (fill) {
        renderer.setRenderTarget(fill[0]); renderer.setClearColor(fill[1], 1); renderer.clear(true, false, false);
      });
      renderer.setRenderTarget(back0);
      renderer.setClearColor(colour, alpha);
      var sheet = new ig.Ce(ig.Si.triangle, new ig.fe({
        uniforms: { tPicture: { value: null }, tMatte: { value: matte.texture } },
        vertexShader: 'void main(){gl_Position=vec4(position,1.0);}',
        fragmentShader: [
          'uniform sampler2D tPicture;uniform sampler2D tMatte;',
          'void main(){',
          '  ivec2 p=ivec2(gl_FragCoord.xy);',
          '  float here=clamp(texelFetch(tMatte,p,0).r,0.0,1.0);',
          '  gl_FragColor=vec4(texelFetch(tPicture,p,0).rgb*here,here);',
          '}'
        ].join('\n'),
        depthTest: false, depthWrite: false
      }));
      sheet.frustumCulled = false;
      var pass = {
        enabled: false, needsSwap: true, renderToScreen: false, clear: false,
        setSize: function (w, h) { matte.setSize(w, h); },
        render: function (r, writeBuffer, readBuffer) {
          var back = r.getRenderTarget(), auto = r.autoClear;
          r.autoClear = false;
          sheet.material.uniforms.tPicture.value = readBuffer.texture;
          r.setRenderTarget(writeBuffer);
          r.render(sheet, cubes.camera);
          r.setRenderTarget(back);
          r.autoClear = auto;
        },
        dispose: function () {}
      };
      function through(material, one, two, at, dt) {
        var u = material.uniforms, a = u.tScene1.value, b = u.tScene2.value, p = u.uProgress.value, t = u.tDetail.value;
        var back = renderer.getRenderTarget(), auto = renderer.autoClear, was = plane.material;
        renderer.autoClear = false;
        u.tScene1.value = one; u.tScene2.value = two; u.tDetail.value = dt || everything.texture;
        if (at !== undefined) u.uProgress.value = at;
        plane.material = material;
        renderer.setRenderTarget(matte);
        renderer.render(plane, ig.he.renderPass.camera);
        plane.material = was;
        u.tScene1.value = a; u.tScene2.value = b; u.uProgress.value = p; u.tDetail.value = t;
        renderer.setRenderTarget(back);
        renderer.autoClear = auto;
      }
      return {
        nothing: nothing.texture,
        everything: everything.texture,
        pass: pass,
        mask: function (material, one, two, at) { pass.enabled = true; through(material, one, two, at); },
        update: function (page, pageOnTop) {
          pass.enabled = page;
          if (!page) return;
          through(cut, pageOnTop ? nothing.texture : everything.texture, pageOnTop ? everything.texture : nothing.texture);
        }
      };
    }

    /* ---- what the presentation asks for ---- */

    /* the places, in screens from the top: each page, each block, the inside at the end */
    api.places = function () {
      var p = { pages: [], blocks: [], inside: null };
      line.forEach(function (s) {
        if (s.kind === PAGE) p.pages.push(s.top);
        if (s.kind === BLOCKS) cubes.cubes.forEach(function (c, i) { p.blocks.push(s.top + (i + 1) / (s.height + 1) * (s.height + 1) - 1); });
        if (s.kind === INSIDE) p.inside = s.top;
      });
      return p;
    };
    api.glide = function (y, dur) {
      return new Promise(function (done) {
        ig.re.to(scroll, { y: y, duration: dur, ease: 'inOut3', overwrite: true, onComplete: done });
      });
    };

    /* into a block, as igloo's controller goes (its navigateToSection) */
    api.open = function (i) {
      var u = cut.uniforms;
      ig.re.to(u.uDetailProgress, { overwrite: true, value: 1, ease: 'power3.in', duration: 1.25 });
      ig.re.to(u.uDetailProgress2, { overwrite: true, value: 1, ease: 'sine.out', delay: 0.75, duration: 1.25 });
      cubes.detailAnimationIn(0);
      detail.playInAnimation(i, 0);
      return new Promise(function (done) { ig.re.delayedCall(2, done); });
    };
    api.close = function () {
      var u = cut.uniforms;
      ig.re.to(u.uDetailProgress, { overwrite: true, value: 0, ease: 'power2.out', duration: 1.25 });
      ig.re.to(u.uDetailProgress2, { overwrite: true, value: 0, ease: 'power2.out', duration: 0.6 });
      cubes.detailAnimationOut();
      detail.playOutAnimation();
      return new Promise(function (done) { ig.re.delayedCall(1, done); });
    };
    /* the inside of a block with nothing in it: its light, its haze, its dust, and the camera going in */
    api.empty = function () {
      detail.objects.forEach(function (ob) { ob.mesh.visible = false; });
      ig.re.fromTo(detail.camera.basePosition, { z: 4 }, { overwrite: true, z: 2.5, duration: 2.4, ease: 'inOut1' });
    };
    return api;
  }

  return { create: create, PAGE: PAGE, BLOCKS: BLOCKS, INSIDE: INSIDE };
})();
