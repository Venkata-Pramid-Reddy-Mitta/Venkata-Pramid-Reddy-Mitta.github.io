"""Builds index.html from content.json.

You normally don't run this yourself: GitHub runs it automatically every time
content.json changes (see .github/workflows/build.yml). To run it on a computer:
    python build.py
"""
import html, json, re, pathlib

ROOT = pathlib.Path(__file__).parent
C = json.loads((ROOT / "content.json").read_text(encoding="utf-8"))
S = C["site"]
GH, EMAIL = S["github"], S["email"]


def status_html(t):
    # Each part kept whole; on phones the last part drops to its own line.
    parts = t.split(' · ')
    out = []
    for i, x in enumerate(parts):
        if i: out.append(f'<span class="ssep{" slast" if i == len(parts)-1 else ""}"> · </span>')
        out.append(f'<span class="sp{" slast" if i == len(parts)-1 else ""}">{e(x)}</span>')
    return ''.join(out)

def role_html(r):
    # First part on its own line on phones; one line on wider screens.
    head, sep, rest = r.partition(' · ')
    if not sep: return e(r)
    return f'<span class="r1">{e(head)}</span><span class="rsep"> · </span><span class="r2">{e(rest)}</span>'

def e(text):
    """Escape plain text for HTML; **text** becomes bold."""
    t = html.escape(str(text), quote=False)
    return re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)


def a(text):
    return html.escape(str(text), quote=True)


def chips(items, cls="chips"):
    return f'<ul class="{cls}">' + "".join(f"<li>{e(i)}</li>" for i in items) + "</ul>"


def figs(nums):
    return '<div class="figs">' + "".join(f"<div><b>{e(n['number'])}</b><span>{e(n['label'])}</span></div>" for n in nums) + "</div>"


projects = C["projects"]
by_id = {p["id"]: p for p in projects}
cats = C["project_categories"]


# ---------- pieces ----------
def card(p, lead=False):
    thumb_file = p.get("card_thumbnail") or (p["images"][0]["thumbnail"] if p.get("images") else None)
    thumb = f'<span class="thumb"><img src="img/{a(thumb_file)}" alt="" loading="lazy" width="720" height="405"></span>' if thumb_file else ""
    tools = "|".join(t.lower() for t in p["tools"])
    return f"""    <article data-tools="{a(tools)}" class="pcard{' lead' if lead else ''}" data-cat="{a(p['category'])}">
      {thumb}
      <p class="kicker">{e(p['label'])}</p>
      <h3><a href="#p-{a(p['id'])}">{e(p['title'])}</a></h3>
      <p>{e(p['one_line'])}</p>
      <div class="stat"><b>{e(p['headline_number'])}</b><span>{e(p['headline_text'])}</span></div>
      {chips(p['tools'])}
      <span class="open" aria-hidden="true">Read the case study</span>
    </article>"""


def contact_section():
    return f"""<section class="wrap sec" aria-labelledby="contact-h">
  <div class="contact">
    <h2 id="contact-h">{e(C['contact']['heading'])}</h2>
    <p>{e(C['contact']['text'])}</p>
    <div class="mail">
      <a id="addr" href="mailto:{a(EMAIL)}">{e(EMAIL)}</a>
      <button type="button" id="copy">Copy</button>
    </div>
    <div class="btns">
      <a class="btn solid wide" href="mailto:{a(EMAIL)}">Email me</a>
      <a class="btn wide" href="mailto:{a(EMAIL)}?subject=Resume%20request">Request my resume</a>
      <a class="btn" href="{a(S['linkedin'])}" rel="noopener">LinkedIn</a>
      <a class="btn" href="{a(GH)}" rel="noopener">GitHub</a>
    </div>
  </div>
</section>"""


# ---------- views ----------
pr = C["profile"]
highlights = "".join(
    f"<div><b>{e(h['number'])}</b><span>{e(h['label'])}</span></div>" for h in pr["highlights"])
how = "".join(f"<li><b>{e(s['title'])}</b><span>{e(s['text'])}</span></li>" for s in C["about"]["how_i_work"])
featured = "\n".join(card(by_id[i]) for i in C["featured_projects"] if i in by_id)
xrows = "".join(
    f'<a href="#experience-{a(x["id"])}"><span class="co">{e(x["company"])}</span><span class="when">{e(x["short_title"])} &middot; <em>{e(x["dates"])}</em></span><span class="arrow" aria-hidden="true">&rarr;</span></a>'
    for x in C["experience"])

home = f"""<div class="view" data-view="home">
<div id="top" class="wrap hero">
 <img class="portrait" src="img/{a(pr['photo'])}" alt="Photo of {a(pr['name_line_1'])} {a(pr['name_line_2'])}" width="720" height="900">
 <div class="hero-main">
  <p class="status"><i aria-hidden="true"></i><span>{status_html(pr['status'])}</span></p>
  <h1><span>{e(pr['name_line_1'])}</span><span>{e(pr['name_line_2'])}</span><small class="aka">{e(pr['goes_by'])}</small></h1>
  <p class="role">{role_html(pr['role'])}</p>
  <p class="pitch">{e(pr['pitch'])}</p>
  <div class="btns">
    <a class="btn solid" href="#projects">View projects</a>
    <a class="btn" href="#contact">Contact me</a>
  </div>
 </div>
  <div class="ledger" aria-label="Highlights">{highlights}</div>
</div>

<section id="about" class="wrap sec" aria-labelledby="about-h">
  <h2 id="about-h">About me</h2>
  <p class="lede" style="max-width:62ch">{e(C['about']['text'])}</p>
  <ol class="how">{how}</ol>
</section>

<section class="wrap sec" aria-labelledby="feat-h">
  <h2 id="feat-h">Featured projects</h2>
  <p class="lede">Projects to start with. Tap one for the full story.</p>
  <div class="grid feat">
{featured}
  </div>
  <a class="btn" style="margin-top:18px" href="#projects">See all projects</a>
</section>

<section class="wrap sec" aria-labelledby="xp-h">
  <h2 id="xp-h">Experience</h2>
  <div class="xrows">{xrows}</div>
  <a class="go" href="#experience">See skills and tools</a>
</section>
</div>"""

small = C.get("smaller_projects", [])
counts = {"all": len(projects) + len(small)}
for c in cats:
    counts[c["id"]] = sum(p["category"] == c["id"] for p in projects) + sum(m["category"] == c["id"] for m in small)
filters = f'<button type="button" data-filter="all" aria-pressed="true">All<span class="count">{counts["all"]}</span></button>' + "".join(
    f'<button type="button" data-filter="{a(c["id"])}" aria-pressed="false">{e(c["name"])}<span class="count">{counts[c["id"]]}</span></button>' for c in cats)
cards = "\n".join(card(p, i == 0) for i, p in enumerate(projects))
minis = "".join(
    f'<a class="mini" data-cat="{a(m["category"])}" href="{a(GH + m["github_repo"])}" rel="noopener"><strong>{e(m["title"])}</strong><span>{e(m["text"])}</span><em>GitHub &rarr;</em></a>'
    for m in small)
projects_view = f"""<div class="view" data-view="projects">
<section class="wrap sec" aria-labelledby="work-h">
  <h2 id="work-h">Projects</h2>
  <p class="lede">Each one started with a question. Tap a project for the full story: what I asked, what I built, and what came out.</p>
  <div class="filters" role="group" aria-label="Filter projects">{filters}</div>
  <div class="grid">
{cards}
  </div>
  <div class="minor" id="minor">{minis}</div>
  <p class="empty" hidden>No projects in this group yet.</p>
</section>
</div>"""

project_tools = {t.lower() for p in projects for t in p["tools"]}


def skill_chip(t):
    low = t.lower()
    if low in project_tools or (low == "sql" and any("sql" in x for x in project_tools)):
        slug = re.sub(r"[^a-z0-9]+", "-", low).strip("-")
        return f'<li class="linked"><a class="toolink" href="#tool-{slug}" data-label="{a(t)}">{e(t)}</a></li>'
    return f"<li>{e(t)}</li>"


tabs = "".join(
    f'<button type="button" role="tab" id="tab-{a(x["id"])}" aria-controls="{a(x["id"])}" aria-selected="{"true" if i == 0 else "false"}"{"" if i == 0 else " tabindex=\"-1\""}>{e(x["company"])}</button>'
    for i, x in enumerate(C["experience"]))
panels = "".join(f"""
  <article id="{a(x['id'])}" class="card job panel" role="tabpanel" aria-labelledby="tab-{a(x['id'])}">
    <div class="head">
      <span class="co">{e(x['company'])}</span>
      <strong>{e(x['title'])}</strong>
      <span class="when"><em>{e(x['dates'])}</em> &middot; {e(x['place'])}</span>
    </div>
    {figs(x['key_numbers'])}
    <p class="focus">{e(x['focus'])}</p>
    <ul class="chips">{''.join(skill_chip(t) for t in x['tools'])}</ul>
  </article>""" for x in C["experience"])
skills = "".join(
    f"<div><h3>{e(g['group'])}</h3><ul class=\"chips\">{''.join(skill_chip(i) for i in g['items'])}</ul></div>" for g in C["skills"])
experience_view = f"""<div class="view" data-view="experience">
<div class="wrap phead">
  <a class="crumb" href="#home">Home</a>
  <h1>Experience</h1>
  <p class="sub">Key results from each role. Full details are in my resume.</p>
</div>
<section class="wrap" aria-label="Roles">
  <div class="tabs" role="tablist" aria-label="Employer">{tabs}</div>{panels}
</section>
<section id="skills" class="wrap sec" aria-labelledby="skills-h">
  <h2 id="skills-h">Skills</h2>
  <p class="hint">Tap a skill with an arrow to see the projects that use it.</p>
  <div class="card skillgrid" style="margin-top:18px">{skills}</div>
</section>
</div>"""

edu_cards = "".join(f"""
    <article class="card">
      <h3>{e(x['school'])}</h3>
      <p style="margin:6px 0 4px"><strong>{e(x['degree'])}</strong></p>
      <p class="sub" style="margin:0"><em>{e(x['dates'])}</em> &middot; {e(x['details'])}</p>
    </article>""" for x in C["education"])


def cert(c):
    bits = " &middot; ".join(e(b) for b in [c.get("issuer"), c.get("year")] if b)
    name = f'<a href="{a(c["link"])}" rel="noopener">{e(c["name"])}</a>' if c.get("link") else e(c["name"])
    return f"<li><strong>{name}</strong>{'<span>' + bits + '</span>' if bits else ''}</li>"


certs = C.get("certifications", [])
cert_html = f"""
  <h2 style="margin-top:32px">Certifications</h2>
  <ul class="certs">{''.join(cert(c) for c in certs)}</ul>""" if certs else ""
education_view = f"""<div class="view" data-view="education">
<div class="wrap phead"><a class="crumb" href="#home">Home</a><h1>Education</h1></div>
<section class="wrap">
  <div class="pair stack" style="margin-top:18px">{edu_cards}
  </div>{cert_html}
</section>
</div>"""

contact_view = f'<div class="view" data-view="contact">\n{contact_section()}\n</div>'

nfl_json = (ROOT / "data" / "nfl.json").read_text() if (ROOT / "data" / "nfl.json").exists() else None
NFL_WIDGET = '''<div class="wrap" style="margin-bottom:18px">
<figure class="fig nflw" id="nflw">
  <div class="nfl-tabs" role="group" aria-label="Choose a comparison">
    <button type="button" data-g="warm" aria-pressed="true">Warm teams in the cold</button>
    <button type="button" data-g="cold" aria-pressed="false">Cold teams in the heat</button>
  </div>
  <label class="nfl-label" for="nfl-th"><span id="nfl-th-text">Cold game: below</span> <output id="nfl-th-out">40</output>&deg;F</label>
  <input type="range" id="nfl-th" min="20" max="50" step="1" value="40">
  <svg id="nfl-svg" viewBox="0 0 340 150" role="img" aria-label="Win rate comparison"></svg>
  <p class="nfl-sum" id="nfl-sum" aria-live="polite"></p>
  <figcaption><b>Try it</b>Road win rate from the project's game data, 2000 to 2024. Drag the threshold to see how the result changes. The default thresholds match the notebook.</figcaption>
</figure>
<script type="application/json" id="nfl-data">__DATA__</script>
</div>'''


def figure(img):
    f = a(img["file"])
    return (f'<figure class="fig"><a href="img/{f}" aria-label="Open full-size image: {a(img["alt"])}"><img src="img/{f}" alt="{a(img["alt"])}" loading="lazy"></a>'
            f'<figcaption><b>Figure</b>{e(img["caption"])} <span class="zoomhint">Tap to enlarge.</span></figcaption></figure>')


def project_view(i, p):
    nxt = projects[(i + 1) % len(projects)]
    imgs = p.get("images", [])
    lead = ""
    if p.get("interactive") == "nfl" and nfl_json:
        lead = NFL_WIDGET.replace("__DATA__", nfl_json)
    elif imgs:
        lead = f'<div class="wrap" style="margin-bottom:18px">{figure(imgs[0])}</div>'
    rest = "".join(figure(x) for x in (imgs[1:] if not p.get("interactive") else imgs))
    rows = (f"<div><dt>{e(p.get('question_heading', 'The question'))}</dt><dd>{e(p['question'])}</dd></div>"
            f"<div><dt>{e(p.get('what_i_did_heading', 'What I did'))}</dt><dd>{e(p['what_i_did'])}</dd></div>"
            f"<div><dt>Result</dt><dd>{e(p['result'])}</dd></div>")
    blocks = ""
    if p.get("recommendation"):
        blocks += f'<div class="block"><h2>What I\'d recommend</h2><p>{e(p["recommendation"])}</p></div>'
    blocks += "".join(f'<div class="block"><h2>{e(b["heading"])}</h2>{b["html"]}</div>' for b in p.get("extra_sections", []))
    return f"""<div class="view" data-view="p-{a(p['id'])}">
<div class="wrap phead">
  <a class="crumb" href="#projects">All projects</a>
  <p class="kicker">{e(p['label'])}</p>
  <h1>{e(p['title'])}</h1>
  <p class="sub">{e(p['intro'])}</p>
</div>
{lead}
<article class="wrap">
  <div class="card feature">
    <dl class="rows" style="margin-top:0">{rows}</dl>
    {figs(p['key_numbers'])}
    {chips(p['tools'])}
    <a class="btn solid gh-btn" href="{a(GH + p['github_repo'])}" rel="noopener">View code on GitHub</a>
  </div>
  {rest}
  {blocks}
  <nav class="pager" aria-label="More projects">
    <a href="#projects"><small>back</small><strong>All projects</strong></a>
    <a class="next" href="#p-{a(nxt['id'])}"><small>next project</small><strong>{e(nxt['title'])}</strong></a>
  </nav>
</article>
</div>"""


project_views = "\n".join(project_view(i, p) for i, p in enumerate(projects))

# ---------- page ----------
ICON = {
    "home": '<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/>',
    "projects": '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18"/>',
    "experience": '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
    "education": '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
    "contact": '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
}
NAV = ["home", "projects", "experience", "education", "contact"]
full_name = f"{pr['name_line_1']} {pr['name_line_2']}"
title = f"{full_name} | Data Analyst"
desc = "Business Data Analyst with 5+ years at Adobe and Amazon. SQL, Power BI, Python. Rutgers MS. Open to full-time roles."
nav = "".join(f'      <a href="#{k}" data-nav="{k}">{k.title()}</a>\n' for k in NAV)
dock = "".join(f'  <a href="#{k}" data-nav="{k}"><svg viewBox="0 0 24 24" aria-hidden="true">{ICON[k]}</svg>{k.title()}</a>\n' for k in NAV)
url = S["url"]

page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{a(desc)}">
<meta name="author" content="{a(full_name)}">
<meta name="theme-color" content="#ffffff">
<meta name="color-scheme" content="light only">
<link rel="canonical" href="{a(url)}">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{a(full_name)}">
<meta property="og:title" content="{a(title)}">
<meta property="og:description" content="{a(desc)}">
<meta property="og:url" content="{a(url)}">
<meta property="og:image" content="{a(url)}og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{a(title)}">
<meta name="twitter:description" content="{a(desc)}">
<meta name="twitter:image" content="{a(url)}og.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Source+Sans+3:wght@400;600;700&display=swap">
<link rel="stylesheet" href="style.css?v=10">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="top">
  <div class="wrap">
    <a class="brand" href="#home">{e(full_name)}</a>
    <nav aria-label="Main">
{nav}    </nav>
  </div>
</header>
<main id="main">
{home}
{projects_view}
{experience_view}
{education_view}
{contact_view}
{project_views}
</main>
<footer class="wrap">&copy; 2026 {e(full_name)} &middot; {e(S['location_footer'])}</footer>
<nav class="dock" aria-label="Quick links">
{dock}</nav>
<script src="site.js?v=9" defer></script>
</body>
</html>
"""
(ROOT / "index.html").write_text(page, encoding="utf-8")
print(f"Built index.html: {len(projects)} projects, {len(small)} smaller projects, {len(certs)} certifications")
