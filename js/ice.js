/* ============================================================================
   THE ICE — igloo.inc's own scenes, from igloo's own bundle, laid end to end
   the way igloo's own controller lays them (its jF): the snowfield with the
   igloo, the two blocks of ice, the fall through the rings — and the inside
   of a block. Before them lies the hero, a page under the canvas: the first
   cut opens the canvas over it, as on Groove Dynamics' scroll page.

   Nothing is scrolled. The presentation says where to go next, and igloo's
   own glide takes the number there that igloo's wheel would have moved; from
   that number everything follows as it does on igloo.inc — which scene is on
   screen, where its camera is, the cut between two of them and how hard it
   smears with the speed. The original code runs unmodified; this file only
   does what igloo's controller does with it, through what it exposes.
   ========================================================================== */
var Ice = (function () {
  'use strict';

  var BUNDLE_URL = 'assets/igloo/App3D-patched.js';
  /* how long a device may take to build the scenes before the presentation goes on without them */
  var PATIENCE = 30;
  /* the hero before the scenes: one screen of page */
  var PAGE = 1;
  /* how far left of centre the blocks sit, in screen widths (igloo: 0.17) */
  var SHIFT = 0.17;
  /* which of the scenes, in order: the page, then igloo's three */
  var HERO = 0, IGLOO = 1, BLOCKS = 2, FALL = 3;

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
    var comps = [], scenes = [], igloo = null, cubes = null, entry = null;
    var detail = null, detailComposer = null, ui = null, cut = null, plane = null, clear = null;
    var figures = {}, lines = [];
    var scroll = { total: 0, targetY1: 0, targetY2: 0, y: 0, velocity: 0 };
    var bridge = { scroll: scroll, isDetailOpen: false, scrollComposers: [], round: round2, centerScroll: function () {} };
    var ready = false, failed = false, warm = 0, last = 0, wayIn = false, closing = false;
    /* what the inside of a block opens from: the blocks, or, at the end, the fall */
    var insideOf = BLOCKS;
    var words = o.words && typeof GDWords !== 'undefined' ? GDWords.create(o.words) : null;
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
       in a folder of its own (GitHub Pages) it is told that folder — and its
       four workers, whose addresses are written out in full, are sent there too. */
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
         touches: there is no mouse in a presentation, the pointer is told */
      var quiet = document.createElement('div');
      var dpr = window.devicePixelRatio || 1;
      ig.he.init({
        canvasCnt: box, interactionNode: quiet, shadowMap: true, shadowMapType: 2, relativePath: home,
        fingers: 2, audioContext: false, contextMenu: true,
        DPR: Math.min(dpr, 1.5), adaptiveDPR: true
      }).then(function () {
        mendSmoothing();
        ig.he.renderer.webgl.domElement.addEventListener('webglcontextlost', function () { fail('the graphics context was lost'); });
        park();
        /* igloo tells one frame from the next by its clock, which starts with the first frame */
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

    /* Until something moves it, igloo's pointer stands in the middle of the
       screen — in the igloo, which would stand broken open. It waits at the
       foot of the picture, in the snow before the igloo. */
    var pointerAt = null;
    function park() { point(innerWidth / 2, innerHeight * 0.97); pointerAt = null; }
    function point(x, y) {
      pointerAt = { x: x, y: y };
      ig.$t.boundTouchesMove({ clientX: x, clientY: y, pointerType: 'mouse', button: 0 });
    }

    /* ---- the scenes ---- */
    function build() {
      /* igloo's words in its picture are ours (its typeface has no umlauts) */
      if (o.manifesto) { ig.Be.manifesto.title = o.manifesto.title; ig.Be.manifesto.text = o.manifesto.text; }
      if (o.copyright !== undefined) ig.Be.copyright = o.copyright;
      if (o.rights !== undefined) ig.Be.rights = o.rights;
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
      /* The room at the bottom of the fall holds a figure made of particles,
         shaped by three volume textures. The fall ends before that room, so
         the megabyte of volumes is not fetched: one empty texel each. */
      ig.Be.links.forEach(function (link) {
        var none = new ig.DA(new Uint8Array(4), 1, 1, 1);
        none._loaded = Promise.resolve();
        none.needsUpdate = true;
        ig.le._texturesCache.set('volumes/' + link.vdb + '.ktx2_<>_3d-data', none);
      });

      /* each scene renders into a composer of its own, exactly as igloo's controller sets them up */
      comps = [null,
        new ig.tA({ scene: new ig.ty.igloo({ mainController: bridge }) }),
        new ig.tA({ scene: new ig.ty.cubes({ mainController: bridge }) }),
        new ig.tA({ scene: new ig.ty.entry({ mainController: bridge }) })];
      bridge.scrollComposers = comps.slice(1);
      igloo = comps[IGLOO].passes[0].scene;
      cubes = comps[BLOCKS].passes[0].scene;
      entry = comps[FALL].passes[0].scene;
      scenes = [{ height: PAGE }, igloo, cubes, entry];
      detail = new ig.JF({ mainController: bridge });
      detailComposer = new ig.tA({ scene: detail });
      ui = new ig.GF({ mainController: bridge });

      /* one triangle fills the screen with them, through igloo's cut */
      board = ig.he.renderPass.scene;
      cut = new ig.f3();
      plane = new ig.Ce(ig.Si.triangle, cut);
      plane.frustumCulled = false;
      board.add(plane);

      Promise.all([igloo.uploaded, cubes.uploaded, entry.uploaded, detail.uploaded, ui.uploaded, board._upload()]).then(function () {
        /* Of igloo's words on the screen the presentation keeps what belongs to
           the inside of a block — its text. igloo's mark, its sound switch, its
           hint to scroll and its close button belong to igloo's site. */
        ui.projects.setMouseSim(detail.mouseSim);
        ui.children.slice().forEach(function (child) { if (child !== ui.projects.group && !child.isCamera) ui.remove(child); });
        /* the room's figure and its links are not shown: the fall stops before them */
        entry.containerparticles.mesh.material.visible = false;
        entry.containerparticles.UI.enable = function () {};
        write();
        frame();
        ig.Q.on('resize', frame);
        clear = clearPass();
        ig.he.composer.addPass(clear.pass);
        var said = new ig.h3(ui, ui.camera, undefined, false, false);
        said.clear = false;
        ig.he.composer.addPass(said);
        board.beforeRenderCbs.push(draw);
        /* a few frames behind the curtain, half-way through each cut and half-way
           into a block, so every shader is compiled before anything is shown */
        warm = 16;
        ig.Q.on('webgl_postrender', function () {
          if (!warm) return;
          if (--warm === 0) {
            cut.uniforms.uDetailProgress.value = 0;
            cut.uniforms.uDetailProgress2.value = 0;
            scroll.y = 0;
            clearTimeout(patience);
            ready = true;
            resolveReady(api);
          }
        });
        ig.Q.emit('webgl_render_active', true);
      }, function (err) { fail('the scenes did not upload: ' + (err && err.message)); });
    }

    /* A figure's picture (Groove Dynamics' make-figures.mjs): a column per
       colour, dark at the bottom, light at the top; each corner of the figure
       looks up its colour at the height of the light that falls on it. */
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

    /* The paragraphs are the page's own type, drawn into sheets by the browser
       (words.js). Each is hung in igloo's picture the way igloo hangs a label:
       white, added to the light, in front of everything — so in the fall they
       are igloo's own glowing white, on the sky and on the rings alike. */
    function write() {
      if (!words) return;
      var label = cubes.cubes[0].texts.title.text.material;
      lines = words.sheets.map(function (sheet, i) {
        var line = new ig.Ce(ig.Si.plane, new ig.fe({
          uniforms: { tSheet: { value: null }, uBox: { value: [0, 0] }, uShow: { value: 0 } },
          vertexShader: 'uniform vec2 uBox;varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy*uBox,0.0,1.0);}',
          fragmentShader: 'uniform sampler2D tSheet;uniform float uShow;varying vec2 vUv;' +
            'void main(){gl_FragColor=vec4(vec3(1.0),texture2D(tSheet,vUv).a*uShow);}',
          transparent: true, depthTest: label.depthTest, depthWrite: label.depthWrite, blending: label.blending
        }));
        line.name = 'paragraph ' + i;
        line.frustumCulled = false; line.visible = false; line.renderOrder = 999;
        line.sheet = sheet; line.version = -1;
        entry.add(line);
        return line;
      });
    }
    function hang(on) {
      lines.forEach(function (line, i) {
        var s = line.sheet, u = line.material.uniforms;
        line.visible = warm ? i === 0 : on && s.show > 0;
        if (!line.visible) return;
        if (line.version !== s.version) {
          if (u.tSheet.value) u.tSheet.value.dispose();
          u.tSheet.value = new ig.Rt(s.canvas);
          u.tSheet.value.minFilter = 1006; u.tSheet.value.magFilter = 1006; u.tSheet.value.generateMipmaps = false;
          line.version = s.version; s.dirty = true;
        }
        if (s.dirty) { u.tSheet.value.needsUpdate = true; s.dirty = false; }
        u.uShow.value = warm ? 0 : s.show;
        u.uBox.value = [2 * s.w * s.scale / innerWidth, 2 * s.h * s.scale / innerHeight];
      });
    }

    /* the blocks stand left of centre on a wide screen; the camera's window moves, not the canvas */
    function frame() {
      var w = innerWidth, h = innerHeight, shift = SHIFT * clamp01((w / h - 0.9) / 0.5);
      cubes.camera.setViewOffset(w, h, shift * w, 0, w, h);
    }

    /* behind the curtain: half-way through every cut, and half-way into a block */
    function warmAt() {
      return warm > 12 ? 0.5 : warm > 8 ? scenes[IGLOO].height + 0.5 : warm > 4 ? scenes[IGLOO].height + scenes[BLOCKS].height + 0.5 : scenes[IGLOO].height + 1;
    }

    /* Igloo's cut climbs the screen as a diagonal. The way in is the same cut
       bent into a circle, as on Groove Dynamics' scroll page: igloo's own
       shader, in which the one expression that says how far along a place
       lies is read from the middle outwards instead of from the bottom up;
       the slide and the smear along the edge have nothing to work on here
       and are switched off. */
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

    /* The way in, once, when the curtain lifts: the canvas lies over the hero
       as a sheet of paper, the round cut opens it from the middle — igloo's
       sky first, as the band it is in every cut, and behind it nothing, the
       hero itself — and runs out over the corners. */
    var dive = null, round = null;
    /* how far behind the cut the hole follows, in the cut's own 0..1 */
    var LAG = 0.22;
    api.plunge = function (o) {
      if (!ready || dive) return Promise.resolve(false);
      if (!round) round = roundCut();
      if (!round) return Promise.resolve(false);
      return new Promise(function (done) {
        dive = { t0: performance.now(), dur: (o && o.dur) || 1.2, o: o || {}, done: done };
        plane.material = round;
        /* once its first frame is on screen, the curtain under it may go */
        var first = function () { ig.Q.off('webgl_postrender', first); if (o && o.begin) o.begin(); };
        ig.Q.on('webgl_postrender', first);
        ig.Q.emit('webgl_render_active', true);
      });
    };
    function dip() {
      var k = clamp01((performance.now() - dive.t0) / 1000 / dive.dur);
      /* run out: from this frame on the canvas is the usual one, clear over the hero */
      if (k >= 1) {
        var d = dive;
        dive = null;
        plane.material = cut;
        cubes.isSceneVisible = false;
        d.done(true);
        return draw();
      }
      /* it gathers speed on the way out, as an opening does that one passes through */
      var q = k * (0.35 + 0.65 * k), hole = clamp01((q - LAG) / (1 - LAG)), u = round.uniforms;
      /* the sky is the blocks' own, from above them, before the first has come up */
      cubes.isSceneVisible = true; cubes.progress = 0;
      comps[BLOCKS].render();
      clear.mask(round, clear.everything, clear.nothing, hole);
      u.tScene1.value = clear.everything;
      u.tScene2.value = comps[BLOCKS].readBuffer.texture;
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
      var now = performance.now(), dt = clamp((now - (draw.t || now - 16)) / 1000, 0.001, 0.1);
      draw.t = now;
      scroll.velocity += Math.abs(y - last);
      scroll.velocity *= Math.pow(0.98, dt * 60);
      scroll.velocity = clamp(scroll.velocity, 0, 1);
      if (scroll.velocity < 0.001) scroll.velocity = 0;
      last = y;

      /* the screen is one unit tall: its top edge sits in one scene, its bottom edge maybe in the next */
      var top = 0, n = round2(y), r = round2(y + 1), held = null, coming = null, into = 0;
      scroll.total = 0;
      scenes.forEach(function (s, i) {
        s.__top = top; s.__bottom = top + s.height; top = s.__bottom;
        scroll.total += s.height;
        var holdsTop = n >= s.__top && n < s.__bottom, holdsBottom = r > s.__top && r <= s.__bottom;
        var on = holdsTop || holdsBottom;
        if (i) {
          s.progress = (y + 1 - s.__top) / (s.height + 1);
          s.isSceneVisible = on;
        }
        if (holdsTop) held = i; else if (holdsBottom) { coming = i; into = y + 1 - s.__top; }
      });
      if (held === null) held = scenes.length - 1;

      var d = u.uDetailProgress.value;
      if (d < 1 || warm) {
        u.tScene1.value = picture1(held);
        if (coming !== null) u.tScene2.value = picture1(coming);
      }
      u.uProgress.value = coming !== null ? clamp01(into) : 0;
      u.uProgressVel.value = scroll.velocity;
      /* the inside of a block opens out of what is on screen: the blocks — or, at the end, the fall */
      var from = insideOf === FALL ? FALL : BLOCKS;
      if (comps[from].readBuffer) u.tCubes.value = comps[from].readBuffer.texture;
      u.uInCubes.value = (held === from && coming === null) || !!warm;
      if (d > 0 || warm) {
        detailComposer.render();
        u.tDetail.value = detailComposer.readBuffer.texture;
      }
      clear.update(held === HERO || coming === HERO, held === HERO);
      if (words) words.set(entry.isSceneVisible ? entry.progress : -1);
      hang(entry.isSceneVisible);
      bridge.isDetailOpen = d > 0;
    }
    function picture1(i) {
      if (i === HERO) return clear.nothing;
      comps[i].render();
      return comps[i].readBuffer.texture;
    }

    /* While the cut runs between the hero and the scenes, what lies on the
       hero's side of it is nothing: there the canvas is clear and the page
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
      return {
        nothing: nothing.texture,
        everything: everything.texture,
        pass: pass,
        /* what stays, drawn through a cut of one's choosing: one side kept, the other clear */
        mask: function (material, one, two, at) {
          pass.enabled = true;
          var u = material.uniforms, a = u.tScene1.value, b = u.tScene2.value, p = u.uProgress.value;
          var back = renderer.getRenderTarget(), auto = renderer.autoClear, was = plane.material;
          renderer.autoClear = false;
          u.tScene1.value = one; u.tScene2.value = two; u.uProgress.value = at;
          plane.material = material;
          renderer.setRenderTarget(matte);
          renderer.render(plane, ig.he.renderPass.camera);
          plane.material = was;
          u.tScene1.value = a; u.tScene2.value = b; u.uProgress.value = p;
          renderer.setRenderTarget(back);
          renderer.autoClear = auto;
        },
        update: function (page, pageOnTop) {
          pass.enabled = page;
          if (!page) return;
          var u = cut.uniforms, one = u.tScene1.value, two = u.tScene2.value, dt = u.tDetail.value;
          var back = renderer.getRenderTarget(), auto = renderer.autoClear;
          renderer.autoClear = false;
          u.tScene1.value = pageOnTop ? nothing.texture : everything.texture;
          u.tScene2.value = pageOnTop ? everything.texture : nothing.texture;
          u.tDetail.value = everything.texture;
          renderer.setRenderTarget(matte);
          renderer.render(plane, ig.he.renderPass.camera);
          u.tScene1.value = one; u.tScene2.value = two; u.tDetail.value = dt;
          renderer.setRenderTarget(back);
          renderer.autoClear = auto;
        }
      };
    }

    /* ---- what the presentation asks for ---- */

    /* a place: in screens from the top, the hero at 0. igloo's controller
       glides there (its centerScroll) with igloo's own curve. */
    function at(scene, progress) { var s = 0; for (var i = 0; i < scene; i++) s += scenes[i].height; return s + progress * (scenes[scene].height + 1) - 1; }
    api.places = function () {
      return {
        hero: 0,
        igloo: at(IGLOO, igloo.initialScrollAutocenter),
        blocks: cubes.cubes.map(function (c, i) { return at(BLOCKS, (i + 1) / (cubes.height + 1)); }),
        fall: function (p) { return at(FALL, p); }
      };
    };
    api.glide = function (y, dur) {
      /* the first time the canvas opens over the hero, igloo's way in plays: the igloo draws itself */
      if (!wayIn && y > 0) { wayIn = true; igloo.playInAnimation(); }
      return new Promise(function (done) {
        ig.re.to(scroll, { y: y, duration: dur, ease: 'inOut3', overwrite: true, onComplete: done });
      });
    };
    api.jump = function (y) { ig.re.killTweensOf(scroll); scroll.y = y; if (!wayIn && y > 0) { wayIn = true; igloo.playInAnimation(); igloo.introTL.progress(1); } };

    /* into a block, as igloo's controller goes (its navigateToSection) */
    api.open = function (i) {
      insideOf = BLOCKS;
      var u = cut.uniforms;
      ig.re.to(u.uDetailProgress, { overwrite: true, value: 1, ease: 'power3.in', duration: 1.25 });
      ig.re.to(u.uDetailProgress2, { overwrite: true, value: 1, ease: 'sine.out', delay: 0.75, duration: 1.25 });
      cubes.detailAnimationIn(0);
      detail.playInAnimation(i, 0);
      ig.Q.emit('webgl_play_audio', 'click-project');
      return new Promise(function (done) { ig.re.delayedCall(2, done); });
    };
    api.close = function () {
      var u = cut.uniforms;
      ig.re.to(u.uDetailProgress, { overwrite: true, value: 0, ease: 'power2.out', duration: 1.25 });
      ig.re.to(u.uDetailProgress2, { overwrite: true, value: 0, ease: 'power2.out', duration: 0.6 });
      if (insideOf === BLOCKS) cubes.detailAnimationOut();
      detail.playOutAnimation();
      return new Promise(function (done) { ig.re.delayedCall(1, function () { insideOf = BLOCKS; done(); }); });
    };
    /* The last of it: the inside of a block with nothing in it, opened out of
       the fall the way a block opens — igloo's own way in, ice and all. */
    api.inside = function () {
      insideOf = FALL;
      detail.objects.forEach(function (ob) { ob.mesh.visible = false; });
      var u = cut.uniforms;
      ig.re.to(u.uDetailProgress, { overwrite: true, value: 1, ease: 'power3.in', duration: 1.25 });
      ig.re.to(u.uDetailProgress2, { overwrite: true, value: 1, ease: 'sine.out', delay: 0.75, duration: 1.25 });
      ig.re.fromTo(detail.camera.basePosition, { z: 4 }, { overwrite: true, z: 2.5, duration: 2, delay: 0.5, ease: 'inOut1' });
      return new Promise(function (done) { ig.re.delayedCall(2, done); });
    };
    /* the pointer, told where it is; without a place it goes back to the snow */
    api.point = function (x, y) { if (x === undefined) park(); else point(x, y); };
    /* where things of the snowfield are on screen, in CSS pixels */
    var v3 = null;
    api.project = function (p) {
      if (!v3) v3 = new ig.b();
      v3.set(p[0], p[1], p[2]).project(igloo.camera);
      return { x: (v3.x + 1) / 2 * innerWidth, y: (1 - v3.y) / 2 * innerHeight };
    };
    /* the igloo's blocks, each where it stands in the snowfield: igloo keeps
       one matrix per block in a texture, the middle of each is its last column */
    var blocksAt = null;
    api.iglooBlocks = function () {
      if (blocksAt) return blocksAt;
      var mesh = igloo.igloo.mesh, d = mesh._matricesTexture && mesh._matricesTexture.image.data;
      if (!d) return [];
      blocksAt = [];
      for (var i = 0; i < (mesh._geometryCount || d.length / 16); i++) blocksAt.push([d[i * 16 + 12], d[i * 16 + 13], d[i * 16 + 14]]);
      return blocksAt;
    };
    api.igloo = function () { return igloo; };
    api.ig = function () { return ig; };
    return api;
  }

  return { create: create };
})();
