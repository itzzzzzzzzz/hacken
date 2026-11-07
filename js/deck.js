/* ============================================================================
   THE PRESENTATION — it goes as PowerPoint goes: a click, the space bar or an
   arrow key is the next step, back is the one before. Nothing scrolls and
   there is no pointer. The first slide is the mark on paper; after that
   everything is igloo's: its room with its particles in the shape of the
   subject, its blocks of ice, the inside of a block; igloo's cut between them.
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var wait = function (s) { return new Promise(function (r) { setTimeout(r, s * 1000); }); };

  /* ---- what is said in the room: a title, a sentence, a line of light from the
     figure to the words, and the points under it. igloo's type has no umlauts:
     the sentences are written so they need none ---- */
  var sheets = {
    hacken: {
      form: 0, title: 'Was ist Hacken?',
      say: 'Schwachstellen in Software, Netzwerken\noder bei Menschen ausnutzen.',
      points: [['White Hat', 'Pentests im Auftrag, Bug-Bounty-Programme.'], ['Grey Hat', 'Hackt ohne Auftrag, meldet die Schwachstelle.'], ['Black Hat', 'Ransomware, Datendiebstahl, Erpressung.']]
    },
    phish: {
      form: 1, title: 'Phishing',
      say: 'Mails, SMS oder Anrufe im Namen echter\nFirmen, um Logins und Codes abzugreifen.',
      points: [['Spear-Phishing', 'Gezielt auf eine Person, mit echten Details.'], ['Smishing / Vishing', 'Dieselbe Masche per SMS oder per Anruf.'], ['Spoofing', 'Absender und Domain imitieren echte Firmen.'], ['AitM-Phishing', 'Proxy-Seite stiehlt Session-Cookies trotz 2FA.']]
    },
    server: {
      form: 2, title: 'Server',
      say: 'Angriffe auf Server treffen alle Nutzer\neines Dienstes auf einmal.',
      points: [['Ransomware', 'Daten kopieren, chiffrieren, dann erpressen.'], ['SQL-Injection', 'Eingaben landen als Befehl in der Datenbank.'], ['Credential Stuffing', 'Geleakte Logins werden automatisch getestet.'], ['DDoS', 'Ein Botnetz flutet den Dienst mit Anfragen.']]
    },
    schutz: {
      form: 3, title: 'Schutz',
      say: 'Basisschutz, den jeder\nselbst einrichten kann.',
      points: [['Passwort-Manager', 'Ein langes, eigenes Passwort pro Konto.'], ['Passkeys / FIDO2', 'Login, den keine Phishing-Seite abgreifen kann.'], ['Updates', 'Automatisch an: Handy, PC und Router.'], ['Backups', '3-2-1: drei Kopien, zwei Medien, eine offline.']]
    }
  };
  var COLUMN = 0.6;
  function written(name) {
    var sheet = sheets[name], list = [], n = sheet.points.length, step = n > 3 ? 0.07 : 0.085, top = 0.5 - (n > 3 ? 0.012 : 0);
    function word(id, text, size, y, after, dim, dur, left) {
      list.push({ name: name + id, text: text, align: 'left', soft: true, size: function (W, H) { return H * size; }, at: function (W, H) { return [W * COLUMN - H * (left || 0), H * y]; }, after: after, dim: dim, dur: dur });
    }
    /* large type stands further in from its edge than small: the title is moved back onto the column */
    word('-title', sheet.title, 0.046, top - 0.135, 0.35, 1, 1.5, 0.011);
    word('-say', sheet.say, 0.0195, top - 0.07, 0.65, 0.92, 1.4);
    list.push({
      name: name + '-line', soft: true, after: 0.6, dur: 1.5,
      points: function (W, H) { return [[W * 0.462, H * (top + 0.07)], [W * 0.545, H * (top - 0.012)], [W * 0.885, H * (top - 0.012)]]; }
    });
    sheet.points.forEach(function (p, i) {
      var y = top + 0.04 + i * step;
      word('-p' + i, p[0], 0.021, y, 1.05 + i * 0.2, 1, 1.1);
      word('-t' + i, p[1], 0.016, y + 0.03, 1.15 + i * 0.2, 0.85, 1.1);
    });
    return list;
  }
  var said = {};
  var words = [];
  Object.keys(sheets).forEach(function (name) {
    var list = written(name);
    said[name] = list.map(function (g) { return g.name; });
    words = words.concat(list);
  });

  /* ---- igloo's blocks, in our words (its type has no umlauts: written so they need none) ----
     Built when the page is to be seen: at once in the browser, in PowerPoint only on the slide in view
     (on the slides PowerPoint loads ahead the page is the picture of its step and builds nothing) */
  var ice = null, built = null;
  function boot() {
    if (built) return built;
    ice = make();
    built = Promise.all([ice.ready, type]);
    return built;
  }
  /* the words that shine as igloo's mark does: beside each block on the free side of the screen,
     and the last word inside the empty block (the room's words are above) */
  var extra = [
    { name: 'social', text: 'Social Engineering', align: 'left', after: 0.15, size: function (W, H) { return H * 0.046; }, at: function (W, H) { return [W * COLUMN, H * 0.5]; } },
    { name: 'hardware', text: 'Hardware', align: 'left', after: 0.15, size: function (W, H) { return H * 0.046; }, at: function (W, H) { return [W * COLUMN, H * 0.5]; } },
    { name: 'danke', text: '////// Danke', align: 'center', after: 0.15, size: function (W, H) { return H * 0.02; }, soft: true, at: function (W, H) { return [W / 2, H * 0.4]; } },
    { name: 'fragen', text: 'Fragen?', align: 'center', after: 0.5, size: function (W, H) { return H * 0.1; }, soft: true, at: function (W, H) { return [W / 2, H * 0.52]; } }
  ];
  /* how long the words of a step take to be fully there once its move is done (ice.js: soft words
     fade in over their dur, 2.2 s if none; the others flicker on in half a second) */
  var glowNamed = {};
  words.concat(extra).forEach(function (g) { glowNamed[g.name] = g; });
  function litAfter(s) {
    var t = 0;
    (s.shine || []).forEach(function (k) { var g = glowNamed[k]; if (g) t = Math.max(t, (g.after || 0) + (g.soft ? g.dur || 2.2 : 0.5)); });
    return t;
  }
  function make() { return Ice.create({
    mount: document.body,
    /* on a slide in PowerPoint the picture of the step stands in: it waits however long a slow line takes */
    patience: slide ? 0 : undefined,
    line: [Ice.PAGE, Ice.ROOM, Ice.BLOCKS, Ice.ROOM, Ice.INSIDE],
    /* what the room's particles gather into */
    shapes: [{ name: 'hat', scale: 1.28 }, { name: 'hook', scale: 1.28 }, { name: 'server', scale: 1.28 }, { name: 'lock', scale: 1.28 }],
    blocks: [
      {
        figure: 'mask', label: 'HACKING_01 Social Engineering', date: '30/10/2026',
        title: '////// Social Engineering',
        text: 'Social Engineering greift Menschen an, nicht Systeme. Beim Pretexting erfindet der Angreifer eine Rolle, etwa IT-Support oder Vorgesetzte, und nutzt Details aus LinkedIn oder der Firmenwebsite. Beim Vishing passiert das am Telefon, inzwischen auch mit KI-geklonten Stimmen und Deepfake-Videos.\n\n' +
          'MFA-Fatigue flutet das Handy mit Push-Anfragen, bis jemand eine davon annimmt. So kam 2022 ein Angreifer bei Uber ins Netz, 2023 reichte ein Anruf beim Helpdesk von MGM Resorts. Schutz: Anfragen auf einem zweiten Kanal verifizieren, Number Matching bei Push-MFA, Helpdesk-Resets nur nach Identifikation.',
        linkTitle: '/// Methoden',
        links: [{ name: 'Pretexting', link: 'https://www.bsi.bund.de' }, { name: 'Vishing', link: 'https://www.bsi.bund.de' }, { name: 'MFA-Fatigue', link: 'https://www.bsi.bund.de' }],
        moreTitle: '/// Mehr', more: [{ name: 'BSI', link: 'https://www.bsi.bund.de' }]
      },
      {
        figure: 'flipper', label: 'HACKING_02 Hardware', date: '30/10/2026',
        title: '////// Hardware',
        text: 'Hardware-Angriffe brauchen physischen Zugriff. Ein BadUSB-Stick meldet sich als Tastatur an und tippt in Sekunden Befehle. Manipulierte Ladekabel enthalten einen Funkchip, Hardware-Keylogger sitzen zwischen Tastatur und PC und speichern jede Eingabe.\n\n' +
          'Viele Zugangskarten mit 125 kHz lassen sich in Sekunden kopieren, und in fremden WLANs kann ein nachgebauter Hotspot den Verkehr mitlesen. Schutz: USB-Ports per Richtlinie sperren, BitLocker aktivieren, Bildschirm sperren, sobald man aufsteht.',
        linkTitle: '/// Methoden',
        links: [{ name: 'BadUSB', link: 'https://www.bsi.bund.de' }, { name: 'Keylogger', link: 'https://www.bsi.bund.de' }, { name: 'RFID-Klonen', link: 'https://www.bsi.bund.de' }],
        moreTitle: '/// Schutz', more: [{ name: 'USB-Ports sperren', link: 'https://www.bsi.bund.de' }]
      }
    ],
    /* the words that shine as igloo's mark does: the room's and the others (above) */
    glows: words.concat(extra)
  }); }

  /* ---- the steps ----
     page:   the first slide, on paper
     room:   igloo's room (the first time or the second), form: what its particles have become
     block:  a block of ice in the middle, open: and into it
     inside: the inside of an empty block, at the end
     shine:  the words that come on */
  function inRoom(room, name) { return { room: room, form: sheets[name].form, shine: said[name] }; }
  var steps = [
    { page: true },
    inRoom(0, 'hacken'),
    inRoom(0, 'phish'),
    { block: 0, shine: ['social'] },
    { block: 0, open: 0 },
    { block: 1, shine: ['hardware'] },
    { block: 1, open: 1 },
    inRoom(1, 'server'),
    inRoom(1, 'schutz'),
    { inside: true, shine: ['danke', 'fragen'] }
  ];
  function place(s) {
    var p = ice.places();
    if (s.page) return p.pages[0];
    if (s.room !== undefined) return p.rooms[s.room];
    if (s.block !== undefined) return p.blocks[s.block];
    return p.inside;
  }

  /* how far the mark steps aside: half of what comes out of it */
  function shift() { $('.lockup').style.setProperty('--shift', ($('.lockup-word').offsetWidth / 2).toFixed(2) + 'px'); }
  addEventListener('resize', shift);

  /* ---- one step to another ----
     The first time in the room, igloo's way into it: where in its timeline it starts, and for how long */
  var FALL_FROM = 0, FALL_TIME = 8, fallen = false, played = false;
  var at = 0, want = 0, running = false, opened = null, opening = true, lit = {};
  function settle(from, to) {
    var s = steps[to], y = place(s), moving = Math.abs(ice.scroll.y - y) > 0.001;
    var falls = !fallen && s.room === 0;
    var shine = s.shine || [];
    Object.keys(lit).forEach(function (k) { if (lit[k] && shine.indexOf(k) < 0) { ice.shine(k, false); lit[k] = false; } });
    var chain = Promise.resolve();
    if (opened !== null && s.open !== opened) chain = chain.then(function () { return ice.close(); }).then(function () { opened = null; });
    chain = chain.then(function () {
      if (falls) fallen = played = true;
      else if (s.form !== undefined) ice.form(s.form);
      if (s.inside) ice.empty();
      if (!moving) return wait(0.35);
      var d = Math.abs(ice.scroll.y - y), going = ice.glide(y, d <= 1.05 ? 1.9 : 3.0);
      /* the words wait until the fall has reached the room */
      return falls ? Promise.all([going, ice.fall(FALL_FROM, FALL_TIME)]) : going;
    });
    if (s.open !== undefined) chain = chain.then(function () { if (opened !== s.open) { opened = s.open; return ice.open(s.open); } });
    return chain.then(function () {
      if (steps[want] !== s) return;
      shine.forEach(function (k) { if (!lit[k]) { lit[k] = true; ice.shine(k, true); } });
    });
  }
  function run() {
    if (running) return;
    running = true;
    (function on() {
      if (at === want) { running = false; if (slide && slide.settled) slide.settled(); return; }
      var to = want, from = at;
      settle(from, to).then(function () { at = to; on(); }, function (err) { console.error(err); at = to; on(); });
    })();
  }
  /* a step's place at once, without its move: for a slide that waits out of sight (below) */
  function jump(to, home) {
    var s = steps[to];
    Object.keys(lit).forEach(function (k) { if (lit[k]) { ice.shine(k, false, 0, true); lit[k] = false; } });
    /* past the page the room has been come into; on the page, only if its way in has been played */
    fallen = to > 0 || played;
    ice.rest();
    if (opened !== null && s.open !== opened) { ice.close(true); opened = null; }
    /* the particles gather as they do when their shape changes; out of sight there is time for it.
       (A page going back to its own step leaves them alone if they already have its shape: a gathering
       they do not need would still be settling when the page is seen again) */
    if (s.form !== undefined) { if (home) ice.form(s.form); else ice.form(s.form, false, true); }
    if (s.inside) ice.empty(true); else ice.full();
    ice.at(place(s));
    if (s.open !== undefined && opened !== s.open) { opened = s.open; ice.open(s.open, true); }
    (s.shine || []).forEach(function (k) { lit[k] = true; ice.shine(k, true, 0, true); });
    at = want = to;
  }
  /* in PowerPoint with a slide for each step, the page on the slide decides whether it takes a step (below) */
  var slide = null;
  function next() { if (slide) return slide.go(1); if (opening) return; want = Math.min(steps.length - 1, want + 1); run(); }
  function prev() { if (slide) return slide.go(-1); if (opening) return; want = Math.max(0, want - 1); run(); }
  function first() { if (slide) return slide.go(0); if (opening) return; want = 0; run(); }

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

  /* Inside PowerPoint the page runs as an Office add-in (its address says so) and tells Office it is
     there. On a deck with a slide for each step, the add-in on each slide is told its step: its own
     setting "step". Without one (the deck of one slide) the page runs all the steps itself. */
  var inOffice = /[?&]_host_Info=/i.test(location.search);
  var told = new Promise(function (done) {
    (function office(tries) {
      if (window.Office && Office.onReady) {
        try {
          Office.onReady(function (info) {
            var step = null;
            try { if (info && info.host) step = Office.context.document.settings.get('step'); } catch (e) {}
            done(typeof step === 'number' && steps[step] ? step : null);
          });
        } catch (e) { done(null); }
        return;
      }
      if (tries < 300) setTimeout(function () { office(tries + 1); }, 100); else done(null);
    })(0);
  });

  /* ---- the curtain: the mark, breathing, until the scenes are warm. Then the
     mark takes a last full breath and stops, the curtain is gone without
     anyone seeing it (the first slide has the mark in the same place), and
     the mark steps aside for the word that comes out of it ---- */
  var pre = $('#pre'), t0 = performance.now(), first_ = $('.page');
  function lift() {
    var mark = $('svg', pre), now = getComputedStyle(mark).opacity;
    mark.style.animation = 'none';
    mark.style.opacity = now;
    mark.getBoundingClientRect();
    mark.style.transition = 'opacity .55s var(--e-soft)';
    mark.style.opacity = '1';
    wait(0.7).then(function () {
      pre.style.display = 'none';
      first_.classList.add('is-in');
      opening = false;
    });
  }
  /* ---- in PowerPoint, a slide for each step ----
     The slide list has a slide for each step, and the page on each slide shows its own step.
     In the editor the page of the slide in view is live and draws all the time, as the deck of one
     slide did. A click on it makes the move to the next step (a right click to the one before), and
     once that move and its words are done PowerPoint goes on to that slide, where the page already
     stands at that step. The page that is left goes back to its own step out of sight.
     The slide show does not go from slide to slide (it is a kiosk show: PowerPoint itself never moves
     on): the page of the slide the show starts on gives the whole presentation, step after step, as
     in the browser, because each time PowerPoint comes to a slide in a show it first shows an old
     picture of it. A page builds igloo's scenes only when its slide is the one in view; until then,
     and on the slides PowerPoint loads ahead, it is the picture of its step and draws nothing. */
  function slides(own) {
    var doc = Office.context.document, me = own + 1;
    var view = '', here = false, leading = false, live = false, starting = false, stepping = null, woken = 0, warmed = false;
    /* the pages of all the slides hear each other (they come from the same place): the page that goes on
       wakes the page of the next slide first, so that one is already moving when PowerPoint shows it */
    var near = null;
    try { near = new BroadcastChannel('hacken-slides'); } catch (e) {}
    var until = 0, sleeper = null, poll = null, asking = false;
    /* how long a page that is not in view draws after its particles have been sent into a shape: they only
       move while drawn, so it draws until they rest there (else they would still be settling when it is seen) */
    var SETTLE = 9000;
    /* the picture of the step goes when the scenes stand where it shows them (they look the same) */
    function show(fade) {
      if (pre.style.display === 'none') return;
      if (!fade) { pre.style.display = 'none'; return; }
      pre.style.transition = 'opacity .45s var(--e-soft)';
      pre.style.opacity = '0';
      wait(0.5).then(function () { pre.style.display = 'none'; });
    }
    /* the page in view draws all the time: in the editor, or giving the show */
    function seenLive() { return leading || (view === 'edit' && here) || performance.now() - woken < 2500; }
    /* the others draw while something moves or the page changes size, then hold their picture */
    function draw(ms) {
      if (!live) return;
      until = Math.max(until, performance.now() + ms);
      ice.awake(true);
      clearTimeout(sleeper);
      sleeper = setTimeout(function nap() {
        var left = until - performance.now();
        if (left > 0 || running) { sleeper = setTimeout(nap, Math.max(150, left)); return; }
        if (!seenLive()) ice.awake(false);
      }, ms);
    }
    /* back to its own step at once; its particles take a moment to gather into their shape */
    function home() {
      if (!live) return;
      if (at !== own || want !== own || running) { jump(own, true); draw(SETTLE); }
      else draw(1500);
    }
    function build() {
      if (live || starting) return;
      starting = true;
      boot().then(function () {
        live = true;
        window.__deck.ice = ice;
        window.__deck.ready = true;
        jump(own);
        draw(SETTLE);
        setTimeout(function () { show(true); }, 3200);
        if (view === 'edit' && here) setTimeout(warm, 1500);
      }, function (err) { console.error('[DECK] ' + err.message); });
    }
    /* PowerPoint makes the page of a slide only when it shows that slide. Once, when the deck is opened in
       the editor, the first page in view shows each slide whose page is not there yet for a moment and comes
       back: from then on every page builds in the background and is ready before anyone clicks to it */
    function warm() {
      if (warmed || !near || view !== 'edit' || !here || stepping !== null) return;
      warmed = true;
      var there = {};
      there[own] = true;
      var heard = function (e) { if (e.data && typeof e.data.alive === 'number') there[e.data.alive] = true; };
      near.addEventListener('message', heard);
      near.postMessage({ who: true });
      setTimeout(function () {
        near.removeEventListener('message', heard);
        var missing = steps.map(function (x, i) { return i; }).filter(function (i) { return !there[i]; });
        if (!missing.length || view !== 'edit' || stepping !== null) return;
        near.postMessage({ warming: true });
        var i = 0;
        (function one() {
          if (i < missing.length) { announce(missing[i]); toSlide(missing[i++]); setTimeout(one, 500); }
          else toSlide(own);
        })();
      }, 400);
    }
    function lead(on) {
      if (leading === on) return;
      leading = on;
      if (on) draw(1000);
      else home();
    }
    /* in the editor: PowerPoint goes to the slide of a step (slides are counted from 1) */
    function toSlide(step) {
      try {
        doc.goToByIdAsync(step + 1, Office.GoToType.Index, function (r) {
          if (r.status !== 'succeeded') { stepping = null; console.warn('[DECK] PowerPoint did not go to slide ' + (step + 1)); }
        });
      } catch (e) { stepping = null; }
    }
    /* what PowerPoint shows: the editor or the show, and which slide in it */
    function seen(v, slidesInView) {
      var was = view, h = here;
      view = v;
      /* (when PowerPoint cannot say, as while one writes in the notes, nothing changes) */
      if (view === 'read') { if (slidesInView) h = slidesInView[0] === me; }
      else if (view === 'edit') { if (slidesInView) h = slidesInView.indexOf(me) >= 0; }
      else h = false;
      /* the show begins or ends: a page that gave it goes back to its own step */
      if (was !== view && leading) lead(false);
      if (h === here && was === view) return;
      here = h;
      /* in the editor every page PowerPoint has made builds, in view or not (in the show only the page in view) */
      if (view === 'edit') build();
      if (!here) { stepping = null; lead(false); home(); return; }
      build();
      if (view === 'read') lead(true);
      else draw(1500);
    }
    function tick() {
      if (asking) return;
      asking = true;
      doc.getActiveViewAsync(function (r) {
        var v = r.status === 'succeeded' ? r.value : view;
        doc.getSelectedDataAsync(Office.CoercionType.SlideRange, function (s) {
          asking = false;
          var ok = s.status === 'succeeded' && s.value && s.value.slides && s.value.slides.length;
          seen(v, ok ? s.value.slides.map(function (x) { return x.index; }) : null);
          clearTimeout(poll);
          poll = setTimeout(tick, seenLive() || stepping !== null ? 400 : live ? 700 : 1000);
        });
      });
    }
    function soon() { clearTimeout(poll); poll = setTimeout(tick, 30); }
    if (near) near.onmessage = function (e) {
      var m = e.data || {};
      if (m.who) near.postMessage({ alive: own });
      if (m.warming) warmed = true;
      if (m.wake === own) { woken = performance.now(); draw(2500); soon(); }
    };
    /* which step PowerPoint is sent to next: a page made for it reads this before its first frame (index.html) */
    function announce(step) { try { localStorage.setItem('hacken-coming', JSON.stringify({ step: step, t: Date.now() })); } catch (e) {} }
    /* the page that goes on: the next one is woken, then PowerPoint goes there */
    function handOver(to) {
      announce(to);
      if (near) near.postMessage({ wake: to });
      setTimeout(function () { if (stepping === to) toSlide(to); }, near ? 90 : 0);
    }
    slide = {
      go: function (by) {
        /* only the slide in view hears a click or a key */
        if (view === 'read') {
          /* in the show: that page gives the presentation */
          if (!leading) { here = true; build(); lead(true); }
          if (!leading || !live) return;
          if (pre.style.display !== 'none') show(true);
          want = by === 0 ? 0 : Math.max(0, Math.min(steps.length - 1, want + by));
          run();
          return;
        }
        if (view !== 'edit' || stepping !== null) return;
        /* in the editor: the move to the step next door, then PowerPoint goes to its slide (should
           PowerPoint not go, the page goes on by itself from where it stands, as the deck of one slide) */
        var to = by === 0 ? 0 : at + by;
        if (to < 0 || to >= steps.length || to === at) return;
        here = true;
        stepping = to;
        if (!live || by === 0) { handOver(to); return; }
        if (pre.style.display !== 'none') show(true);
        want = to;
        run();
      },
      settled: function () {
        if (stepping === null || at !== stepping) return;
        var to = stepping, s = steps[to];
        /* PowerPoint goes there once the step stands still: its words lit, its particles in their shape, a block open */
        setTimeout(function () { if (stepping === to && at === to) handOver(to); }, Math.max(litAfter(s), s.form !== undefined ? 3.2 : 0, s.open !== undefined ? 3.4 : 0, 0.6) * 1000);
      }
    };
    opening = false;
    first_.classList.add('is-in');
    window.__deck = { next: next, prev: prev, at: function () { return at; }, steps: steps, jump: jump, ready: false,
      slide: function () { return { own: own, view: view, here: here, leading: leading, live: live, at: at, stepping: stepping }; } };
    /* the show begins or ends, the editor is zoomed: the page changes size, and PowerPoint is asked again at once */
    addEventListener('resize', function () { draw(1200); soon(); });
    try { doc.addHandlerAsync(Office.EventType.ActiveViewChanged, soon); } catch (e) {}
    tick();
  }

  function whole() {
    boot().then(function () {
      window.__deck = { next: next, prev: prev, at: function () { return at; }, steps: steps, ice: ice, jump: jump, ready: true };
      setTimeout(lift, Math.max(0, 1100 - (performance.now() - t0)));
    }, function (err) {
      console.error('[DECK] ' + err.message);
      window.__deck = { failed: true, next: next, prev: prev };
      type.then(lift);
    });
  }
  var type = (document.fonts ? document.fonts.load('600 64px "Inter Tight"', 'Hacken').catch(function () {}) : Promise.resolve()).then(shift);
  /* in PowerPoint, a slide's own step is known before anything else: its picture takes the mark's place */
  if (inOffice) told.then(function (step) {
    if (step === null) { whole(); return; }
    pre.classList.add('is-slide');
    pre.style.backgroundImage = 'url(assets/steps/' + step + '.jpg)' + (window.__tiny && window.__tiny[step] ? ', url(' + window.__tiny[step] + ')' : '');
    $('.pages').classList.add('still');
    slides(step);
  });
  else whole();
})();
