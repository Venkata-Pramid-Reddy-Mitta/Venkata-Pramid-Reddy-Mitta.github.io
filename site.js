// One-page app. The part of the address after # picks the screen:
// #home, #projects, #experience, #education, #contact, #p-<project>,
// #experience-<job> (opens that job's tab), #tool-<skill> (projects using that skill),
// #ask and #ask-<answer> open the Ask me chat window over the current screen (see ask.js).
(function () {
  var views = document.querySelectorAll('.view');
  var navs = document.querySelectorAll('[data-nav]');
  var tabs = document.querySelectorAll('[role="tab"]');
  var projectsView = document.querySelector('.view[data-view="projects"]');

  // ---------- Project filters (category buttons + skill links share one state) ----------
  var state = { cat: 'all', tool: null };
  var note, filterBtns = [], items = [], empty = null;
  if (projectsView) {
    filterBtns = projectsView.querySelectorAll('.filters button');
    items = projectsView.querySelectorAll('.grid [data-cat], .minor [data-cat]');
    empty = projectsView.querySelector('.empty');
    var grid = projectsView.querySelector('.grid');
    note = document.createElement('p');
    note.className = 'toolnote';
    note.hidden = true;
    grid.parentNode.insertBefore(note, grid);
  }

  function toolLabel(tool) {
    var link = document.querySelector('a.toolink[href="#tool-' + tool + '"]');
    return link ? (link.getAttribute('data-label') || link.textContent) : tool.replace(/-/g, ' ');
  }

  function slug(t) { return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  function usesTool(el, tool) {
    var ts = (el.getAttribute('data-tools') || '').split('|');
    return ts.some(function (t) { return t && (slug(t) === tool || (tool === 'sql' && t.indexOf('sql') > -1)); });
  }

  function applyFilters() {
    if (!projectsView) return;
    var shown = 0;
    items.forEach(function (el) {
      var on = state.tool ? usesTool(el, state.tool) : (state.cat === 'all' || el.getAttribute('data-cat') === state.cat);
      el.hidden = !on;
      if (on) shown++;
    });
    filterBtns.forEach(function (b) {
      var active = !state.tool && b.getAttribute('data-filter') === state.cat;
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    projectsView.querySelectorAll('.pcard.lead').forEach(function (el) {
      el.classList.toggle('solo', !!state.tool || state.cat !== 'all');
    });
    if (empty) empty.hidden = shown > 0;
    if (state.tool) {
      note.textContent = 'Projects using ' + toolLabel(state.tool) + ': ' + shown + ' ';
      var all = document.createElement('button');
      all.type = 'button';
      all.textContent = 'Show all projects';
      all.addEventListener('click', function () { state.tool = null; state.cat = 'all'; location.hash = 'projects'; applyFilters(); });
      note.appendChild(all);
      note.hidden = false;
    } else {
      note.hidden = true;
    }
  }

  if (projectsView) {
    projectsView.querySelector('.filters').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      state.cat = b.getAttribute('data-filter');
      state.tool = null;
      if (location.hash.indexOf('#tool-') === 0) history.replaceState(null, '', '#projects');
      applyFilters();
    });
  }

  // ---------- Experience tabs ----------
  function selectTab(t, focus) {
    tabs.forEach(function (x) {
      var on = x === t;
      x.setAttribute('aria-selected', on ? 'true' : 'false');
      x.tabIndex = on ? 0 : -1;
      document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) t.focus();
  }
  tabs.forEach(function (t) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var list = Array.prototype.slice.call(tabs), i = list.indexOf(t);
      if (e.key === 'ArrowRight') selectTab(list[(i + 1) % list.length], true);
      if (e.key === 'ArrowLeft') selectTab(list[(i - 1 + list.length) % list.length], true);
    });
  });

  // ---------- Router ----------
  // Remember scroll position per address so Back returns you to where you were.
  var scrollPos = {};
  var trail = [];          // addresses visited in this tab, to detect Back
  var current = null;

  function jump(y) {
    try { window.scrollTo({ top: y, left: 0, behavior: 'instant' }); }
    catch (err) { window.scrollTo(0, y); }
  }

  function route(initial) {
    var h = (location.hash || '#home').slice(1);
    if (h === 'ask' || h.indexOf('ask-') === 0) {  // chat window, not a screen
      var askId = h === 'ask' ? null : h.slice(4);
      history.replaceState(null, '', current !== null ? '#' + current : location.pathname + location.search);
      if (window.Ask) window.Ask.open(askId);
      if (current !== null) return;  // stay on the screen underneath
      h = 'home';
    }
    if (h === 'main') {  // "Skip to content" link: stay on this screen, move focus
      var visible = document.querySelector('.view:not([hidden])');
      var hd = visible && visible.querySelector('h1, h2');
      if (hd) { hd.setAttribute('tabindex', '-1'); hd.focus(); }
      return;
    }
    if (current !== null) scrollPos[current] = window.scrollY;
    var goingBack = trail.length > 1 && trail[trail.length - 2] === h;
    if (goingBack) trail.pop(); else trail.push(h);
    current = h;

    var view = h, tab = null;
    state.tool = null;
    if (h.indexOf('experience-') === 0) { view = 'experience'; tab = h.slice(11); }
    if (h.indexOf('tool-') === 0) { view = 'projects'; state.tool = h.slice(5); }
    var target = document.querySelector('.view[data-view="' + view + '"]');
    if (!target) { view = 'home'; target = document.querySelector('.view[data-view="home"]'); }
    views.forEach(function (v) { v.hidden = v !== target; });

    var section = view.indexOf('p-') === 0 ? 'projects' : view;
    navs.forEach(function (a) {
      if (a.getAttribute('data-nav') === section) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    if (view === 'experience' && tabs.length) {
      var t = tabs[0];
      tabs.forEach(function (x) { if (x.getAttribute('aria-controls') === tab) t = x; });
      selectTab(t);
    }
    if (view === 'projects') applyFilters();

    if (initial) return;  // let the browser restore scroll on first load
    jump(goingBack && scrollPos[h] ? scrollPos[h] : 0);
    var heading = target.querySelector('h1, h2');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      try { heading.focus({ preventScroll: true }); } catch (err) { /* older browsers */ }
    }
  }
  window.addEventListener('hashchange', function () { route(false); });
  route(true);

  // ---------- NFL interactive chart ----------
  (function () {
    var box = document.getElementById('nflw'), raw = document.getElementById('nfl-data');
    if (!box || !raw) return;
    var data = JSON.parse(raw.textContent), group = 'warm';
    var cfg = {
      warm: { min: 20, max: 50, def: 40, text: 'Cold game: below', ext: 'In cold games', who: 'Warm-weather teams' },
      cold: { min: 65, max: 90, def: 75, text: 'Hot game: above', ext: 'In hot games', who: 'Cold-weather teams' }
    };
    var th = document.getElementById('nfl-th'), out = document.getElementById('nfl-th-out'), txt = document.getElementById('nfl-th-text');
    var svg = document.getElementById('nfl-svg'), sum = document.getElementById('nfl-sum');
    function rate(arr) { var s = 0; arr.forEach(function (x) { s += x; }); return arr.length ? 100 * s / arr.length : 0; }
    function draw() {
      var d = data[group], c = cfg[group], v = +th.value;
      out.textContent = v;
      var ext = [];
      for (var i = 0; i < d.t.length; i++) {
        var t = d.t[i];
        if (t === null) continue;
        if (group === 'warm' ? t < v : t > v) ext.push(d.w[i]);
      }
      var er = rate(ext), br = rate(d.w), diff = er - br;
      var rows = [[c.ext + ' (' + ext.length + ' games)', er, 'var(--pen)'], ['All road games (' + d.w.length + ')', br, 'var(--muted)']];
      var bw = 210, h = '';
      rows.forEach(function (r, k) {
        var y = 14 + k * 64;
        h += '<text x="0" y="' + y + '">' + r[0] + '</text>';
        h += '<rect x="0" y="' + (y + 8) + '" width="' + bw + '" height="22" rx="4" style="fill:var(--wash)"></rect>';
        h += '<rect x="0" y="' + (y + 8) + '" width="' + (bw * r[1] / 100).toFixed(1) + '" height="22" rx="4" style="fill:' + r[2] + '"></rect>';
        h += '<text x="' + (bw + 10) + '" y="' + (y + 24) + '" style="font-weight:700">' + r[1].toFixed(1) + '% wins</text>';
      });
      svg.innerHTML = h;
      if (!ext.length) { sum.textContent = 'No games at this temperature. Try another threshold.'; return; }
      var word = diff < 0 ? 'lower' : 'higher';
      sum.textContent = c.who + "' road win rate is " + Math.abs(diff).toFixed(1) + ' points ' + word + ' when it is ' +
        (group === 'warm' ? 'below ' : 'above ') + v + '°F.' + (ext.length < 60 ? ' Small sample, so read with care.' : '');
    }
    box.querySelectorAll('.nfl-tabs button').forEach(function (b) {
      b.addEventListener('click', function () {
        group = b.getAttribute('data-g');
        box.querySelectorAll('.nfl-tabs button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        var c = cfg[group];
        th.min = c.min; th.max = c.max; th.value = c.def; txt.textContent = c.text;
        draw();
      });
    });
    th.addEventListener('input', draw);
    draw();
  })();

  // ---------- Copy email ----------
  var copyBtn = document.getElementById('copy'), addr = document.getElementById('addr');
  if (copyBtn && addr) {
    var done = function (t) { copyBtn.textContent = t; setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1800); };
    copyBtn.addEventListener('click', function () {
      var t = addr.textContent;
      var select = function () {
        var r = document.createRange(); r.selectNodeContents(addr);
        var s = getSelection(); s.removeAllRanges(); s.addRange(r); done('Selected');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { done('Copied'); }, select);
      else select();
    });
  }
})();
