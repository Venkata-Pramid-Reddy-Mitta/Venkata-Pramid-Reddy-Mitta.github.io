// "Ask me": matches a typed question to pre-written answers from content.json.
// No AI and no server. All answers are built into the page by build.py.
(function (root) {
  'use strict';

  var MIN = 3; // lowest score that counts as a match

  // Words that carry no meaning on their own. Used for the question-overlap bonus only.
  var STOP = {};
  ('a an the and or of to in on at for with by from as is are was were be been am do does did can could would should will ' +
   'have has had having i me my mine you your yours we our it its this that these those what whats which who whom how when ' +
   'where why tell about please any some there here also just so if then than too very really get got give show want need ' +
   'like know use used using work works working experience experiences make made').split(' ').forEach(function (w) { STOP[w] = 1; });

  function norm(s) {
    var t = String(s).toLowerCase();
    try { t = t.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (err) { /* old browser */ }
    return t.replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function stem(t) {
    if (t.length > 4 && /ies$/.test(t)) return t.slice(0, -3) + 'y';
    if (t.length > 3 && /[^s]s$/.test(t)) return t.slice(0, -1);
    return t;
  }

  function tokens(s) {
    var n = norm(s);
    return n ? n.split(' ').map(stem) : [];
  }

  function lev(a, b) {
    var prev = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      var cur = [i];
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  }

  // 3 = same word (or one typo), 2 = same start, 0 = unrelated
  function tokenScore(a, b) {
    if (a === b) return 3;
    if (a.length >= 5 && b.length >= 5 && Math.abs(a.length - b.length) <= 1 && lev(a, b) <= 1) return 3;
    if (Math.min(a.length, b.length) >= 5 && (a.indexOf(b) === 0 || b.indexOf(a) === 0)) return 2;
    return 0;
  }

  function prepare(e) {
    var singles = [], phrases = [], seen = {};
    (e.kw || []).forEach(function (k) {
      var t = tokens(k), key = t.join(' ');
      if (!key || seen[key]) return;
      seen[key] = 1;
      if (t.length > 1) phrases.push(key); else singles.push(key);
    });
    var qt = {};
    tokens(e.q).forEach(function (t) { if (!STOP[t]) qt[t] = 1; });
    e._single = singles;
    e._phrase = phrases;
    e._qt = qt;
    return e;
  }

  function parse(query) {
    var all = tokens(query);
    return {
      all: all,
      content: all.filter(function (t) { return !STOP[t]; }),
      padded: ' ' + all.join(' ') + ' '
    };
  }

  function scoreEntry(e, q) {
    var s = 0, seen = {};
    // Phrases are strong evidence, so longer ones score more.
    e._phrase.forEach(function (k) {
      if (q.padded.indexOf(' ' + k + ' ') > -1) s += 3 + k.split(' ').length;
    });
    // Each word the visitor typed counts once, for its best-matching keyword.
    q.all.forEach(function (t) {
      if (seen[t]) return;
      seen[t] = 1;
      var best = 0;
      e._single.forEach(function (k) { var v = tokenScore(t, k); if (v > best) best = v; });
      s += best;
    });
    // Small bonus for sharing real words with the answer's own question.
    var o = 0;
    q.content.forEach(function (t) { if (e._qt[t]) o++; });
    return s + Math.min(o, 3);
  }

  // Returns entries sorted best first. Earlier entries win ties.
  function rank(entries, query) {
    var q = parse(query);
    return entries.map(function (e, i) { return { e: e, score: scoreEntry(e, q), i: i }; })
      .filter(function (r) { return r.score > 0; })
      .sort(function (a, b) { return b.score - a.score || a.i - b.i; });
  }

  var SKILL_INTENT = /\b(do you (know|use|have|work)|have you (used|worked|got)|experience (with|in)|familiar with|know how|proficient|skilled|expertise|comfortable with)\b/i;

  var api = { norm: norm, tokens: tokens, prepare: prepare, rank: rank, MIN: MIN, SKILL_INTENT: SKILL_INTENT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!root || !root.document) return;

  // ---------------------------------------------------------------- UI
  var doc = root.document;

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function init() {
    var form = doc.getElementById('ask-form'), input = doc.getElementById('ask-q');
    var out = doc.getElementById('ask-out'), chipBox = doc.getElementById('ask-chips');
    var dataEl = doc.getElementById('ask-data');
    if (!form || !input || !out || !dataEl) return null;

    var cfg = JSON.parse(dataEl.textContent);
    var entries = cfg.entries.map(prepare);
    var byId = {};
    entries.forEach(function (e) { byId[e.id] = e; });

    function pressed(id) {
      Array.prototype.forEach.call(chipBox.querySelectorAll('button[data-ask]'), function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-ask') === id ? 'true' : 'false');
      });
    }

    function reveal() {
      var top = out.getBoundingClientRect().top;
      var vh = root.innerHeight || doc.documentElement.clientHeight;
      var head = root.matchMedia && root.matchMedia('(min-width:720px)').matches ? 84 : 12;
      if (top < head || top > vh * 0.55) root.scrollTo(0, Math.max(0, root.scrollY + top - head));
    }

    function chipRow(list, label) {
      var wrap = el('div', 'askrel');
      wrap.appendChild(el('p', 'hint', label));
      var ul = el('ul', 'qchips');
      list.forEach(function (e) {
        var li = el('li'), b = el('button', null, e.q);
        b.type = 'button';
        b.setAttribute('data-ask', e.id);
        li.appendChild(b);
        ul.appendChild(li);
      });
      wrap.appendChild(ul);
      return wrap;
    }

    function suggestedExcept(id, n) {
      var res = [];
      cfg.suggested.forEach(function (sid) {
        if (sid !== id && byId[sid] && res.length < n) res.push(byId[sid]);
      });
      return res;
    }

    function related(id, ranked) {
      var res = [];
      (ranked || []).forEach(function (r) {
        if (r.e.id !== id && r.score >= MIN && r.e.kind !== 'skill' && res.length < 3) res.push(r.e);
      });
      suggestedExcept(id, 6).forEach(function (e) {
        if (res.length < 3 && res.indexOf(e) < 0) res.push(e);
      });
      return res;
    }

    function linkEl(l) {
      var a = el('a', 'go', l.label);
      a.href = l.href;
      if (/^https?:/.test(l.href)) a.rel = 'noopener';
      return a;
    }

    function show(e, typed, ranked) {
      out.textContent = '';
      var card = el('article', 'card askcard');
      if (typed && norm(typed) !== norm(e.q)) {
        card.appendChild(el('p', 'asked', 'You asked: ' + typed));
        card.appendChild(el('p', 'asked', 'My closest answer:'));
      }
      card.appendChild(el('h2', 'askq', e.q));
      var ans = el('div', 'askans');
      ans.innerHTML = e.html; // built and escaped by build.py
      card.appendChild(ans);
      if (e.links && e.links.length) {
        var lk = el('div', 'asklinks');
        e.links.forEach(function (l) { lk.appendChild(linkEl(l)); });
        card.appendChild(lk);
      }
      card.appendChild(chipRow(related(e.id, ranked), 'Related questions'));
      out.appendChild(card);
      pressed(e.id);
      reveal();
    }

    function mailto(typed) {
      var m = 'mailto:' + cfg.email + '?subject=' + encodeURIComponent(cfg.subject);
      if (typed) m += '&body=' + encodeURIComponent('Hi Pramid,\n\n' + typed + '\n');
      return m;
    }

    function noMatch(typed, ranked) {
      out.textContent = '';
      var skill = SKILL_INTENT.test(typed);
      var card = el('article', 'card askcard');
      card.appendChild(el('p', 'asked', 'You asked: ' + typed));
      card.appendChild(el('h2', 'askq', skill ? 'Not listed on this site' : 'No ready answer for that'));
      card.appendChild(el('p', null, skill ? cfg.no_match_skill : cfg.no_match));
      var close = [];
      ranked.forEach(function (r) { if (r.e.kind !== 'skill' && close.length < 3) close.push(r.e); });
      if (!close.length) close = suggestedExcept('', 3);
      card.appendChild(chipRow(close, 'Closest topics'));
      var btns = el('div', 'asklinks stackbtns');
      var mail = el('a', 'btn solid', 'Email me your question');
      mail.href = mailto(typed);
      btns.appendChild(mail);
      if (skill) {
        var sk = el('a', 'btn', 'See my skills');
        sk.href = '#experience';
        btns.appendChild(sk);
      }
      card.appendChild(btns);
      out.appendChild(card);
      pressed('');
      reveal();
    }

    function reset() {
      input.value = '';
      out.textContent = '';
      pressed('');
    }

    function showById(id) {
      var e = byId[id];
      if (!e) return false;
      input.value = '';
      show(e, null, null);
      if (root.history && root.history.replaceState) root.history.replaceState(null, '', '#ask-' + id);
      return true;
    }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var v = input.value.replace(/\s+/g, ' ').trim();
      if (!v) { input.focus(); return; }
      var ranked = rank(entries, v);
      if (ranked.length && ranked[0].score >= MIN) show(ranked[0].e, v, ranked);
      else noMatch(v, ranked);
      if (root.history && root.history.replaceState && root.location.hash !== '#ask') root.history.replaceState(null, '', '#ask');
      if (root.matchMedia && root.matchMedia('(max-width:719px)').matches) input.blur(); // close the phone keyboard
    });

    function onChip(ev) {
      var b = ev.target.closest ? ev.target.closest('button[data-ask]') : null;
      if (b) showById(b.getAttribute('data-ask'));
    }
    chipBox.addEventListener('click', onChip);
    out.addEventListener('click', onChip);

    return {
      open: function (id) { if (!(id && showById(id))) reset(); }
    };
  }

  root.Ask = init() || { open: function () {} };
})(typeof window !== 'undefined' ? window : null);
