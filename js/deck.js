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
      say: 'Ein System dazu bringen, Dinge zu tun,\ndie sein Erfinder nie vorgesehen hat.',
      points: [['White Hat', 'Mit Erlaubnis. Meldet jede Schwachstelle.'], ['Grey Hat', 'Ohne Auftrag, aber ohne schlechte Absicht.'], ['Black Hat', 'Kriminell. Will Geld, Daten oder Chaos.']]
    },
    phish: {
      form: 1, title: 'Phishing',
      say: 'Eine Nachricht, die echt aussieht. Sie will,\ndass du klickst, bevor du nachdenkst.',
      points: [['Druck', 'Ihr Konto wird gesperrt. Eile ist der Trick.'], ['Absender', 'Ein vertauschter Buchstabe reicht schon.'], ['Link', 'Erst ansehen, wohin er geht. Dann klicken.']]
    },
    server: {
      form: 2, title: 'Server',
      say: 'Auf Servern liegen die Daten von allen. Wer\nhineinkommt, erpresst oder legt alles lahm.',
      points: [['Ransomware', 'Sperrt alle Dateien und verlangt Geld.'], ['Datenleck', 'Kundendaten landen im Netz.'], ['DDoS', 'Eine Flut von Anfragen legt alles lahm.']]
    },
    schutz: {
      form: 3, title: 'Schutz',
      say: 'Schutz ist kein Produkt,\nsondern eine Gewohnheit.',
      points: [['Passwort-Manager', 'Jedes Konto bekommt sein eigenes.'], ['Zwei-Faktor', 'Ein zweites Schloss: App oder Hardware-Key.'], ['Updates', 'Machen bekannte Schwachstellen dicht.'], ['Erst denken', 'Dann klicken. Immer.']]
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

  /* ---- igloo's blocks, in our words (its type has no umlauts: ae, oe, ue, ss) ---- */
  var ice = Ice.create({
    mount: document.body,
    line: [Ice.PAGE, Ice.ROOM, Ice.BLOCKS, Ice.ROOM, Ice.INSIDE],
    /* what the room's particles gather into */
    shapes: [{ name: 'hat', scale: 1.28 }, { name: 'hook', scale: 1.28 }, { name: 'server', scale: 1.28 }, { name: 'lock', scale: 1.28 }],
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
       free side of the screen, in the room, and the last word inside the empty block */
    glows: words.concat([
      { name: 'social', text: 'Social Engineering', align: 'left', after: 0.15, size: function (W, H) { return H * 0.046; }, at: function (W, H) { return [W * COLUMN, H * 0.5]; } },
      { name: 'hardware', text: 'Hardware', align: 'left', after: 0.15, size: function (W, H) { return H * 0.046; }, at: function (W, H) { return [W * COLUMN, H * 0.5]; } },
      { name: 'danke', text: '////// Danke', align: 'center', after: 0.15, size: function (W, H) { return H * 0.02; }, soft: true, at: function (W, H) { return [W / 2, H * 0.4]; } },
      { name: 'fragen', text: 'Fragen?', align: 'center', after: 0.5, size: function (W, H) { return H * 0.1; }, soft: true, at: function (W, H) { return [W / 2, H * 0.52]; } }
    ])
  });

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

  /* ---- one step to another ---- */
  var at = 0, want = 0, running = false, opened = null, opening = true, lit = {};
  function settle(from, to) {
    var s = steps[to], y = place(s), moving = Math.abs(ice.scroll.y - y) > 0.001;
    var shine = s.shine || [];
    Object.keys(lit).forEach(function (k) { if (lit[k] && shine.indexOf(k) < 0) { ice.shine(k, false); lit[k] = false; } });
    var chain = Promise.resolve();
    if (opened !== null && s.open !== opened) chain = chain.then(function () { return ice.close(); }).then(function () { opened = null; });
    chain = chain.then(function () {
      if (s.form !== undefined) ice.form(s.form);
      if (s.inside) ice.empty();
      if (!moving) return wait(0.35);
      var d = Math.abs(ice.scroll.y - y);
      return ice.glide(y, d <= 1.05 ? 1.9 : 3.0);
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
  var type = (document.fonts ? document.fonts.load('600 64px "Inter Tight"', 'Hacken').catch(function () {}) : Promise.resolve()).then(shift);
  Promise.all([ice.ready, type]).then(function () {
    window.__deck = { next: next, prev: prev, at: function () { return at; }, steps: steps, ice: ice, ready: true };
    setTimeout(lift, Math.max(0, 1100 - (performance.now() - t0)));
  }, function (err) {
    console.error('[DECK] ' + err.message);
    window.__deck = { failed: true, next: next, prev: prev };
    type.then(lift);
  });
})();
