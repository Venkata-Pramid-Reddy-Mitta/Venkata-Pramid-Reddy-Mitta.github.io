# Portfolio: Venkata Pramid Reddy Mitta

Live at **https://venkata-pramid-reddy-mitta.github.io/** (once the repo is public and Pages is on).

All the words on the site live in one file: **`content.json`**.
You never need to touch the HTML. Edit `content.json`, commit, and GitHub rebuilds and republishes the site in about a minute.

---

## How to edit (on github.com, no tools needed)

1. Open `content.json` in this repo and click the pencil icon (Edit).
2. Change or add text.
3. Click **Commit changes**.
4. Wait about a minute, then refresh the site. You can watch progress under the repo's **Actions** tab (a green tick means it's live).

**Rules for the file (this is where mistakes usually happen):**
- Text goes inside straight double quotes: `"like this"`.
- Items in a list are separated by commas. **No comma after the last item.**
- To make a word bold, wrap it in two stars: `**97.4%**`.
- If the Actions tab shows a red X, the file has a typo. Open the failed run to see the line number.

---

## Add a project

Copy this block into the `"projects"` list (add a comma after the project before it):

```json
{
  "id": "short-name-no-spaces",
  "title": "Project Title",
  "category": "bi",
  "label": "SQL + Power BI",
  "one_line": "The question in one short line.",
  "headline_number": "23.0%",
  "headline_text": "what that number means",
  "tools": ["Python", "SQL", "Power BI"],
  "github_repo": "Your-Repo-Name",
  "intro": "One sentence of context: dataset, size, years.",
  "question": "What you set out to answer.",
  "what_i_did": "How you did it.",
  "result": "What you found, with the key number in **bold**.",
  "key_numbers": [
    {"number": "99,441", "label": "orders analyzed"},
    {"number": "-0.327", "label": "correlation"}
  ],
  "recommendation": "What someone should do with this result.",
  "images": [
    {"file": "my-chart.webp", "thumbnail": "my-chart-sm.webp", "alt": "Short description", "caption": "What the chart shows."}
  ],
  "extra_sections": []
}
```

- `category` must be one of the ids in `"project_categories"`: `bi`, `ml` or `data`. You can add a new category there too.
- Put images in the `img` folder (Add file → Upload files). PNG or JPG works; use the same name in `file` and `thumbnail` if you don't have a small version. Leave `"images": []` if there's no picture.
- To show it on the home page, add its `id` to `"featured_projects"`.
- `recommendation` is optional. Delete the line to hide that section.

## Add a certification

Add to the `"certifications"` list:

```json
{"name": "Microsoft Certified: Power BI Data Analyst (PL-300)", "issuer": "Microsoft", "year": "2027", "link": "https://link-to-your-credential"}
```

`year` and `link` can be left as `""`.

## Add a smaller project (one line, links straight to GitHub)

Add to `"smaller_projects"`:

```json
{"title": "Project name", "text": "One-line description.", "github_repo": "Repo-Name", "category": "ml"}
```

## Edit the "Ask me" answers
The **Ask me** chat button (bottom-right corner of every screen) opens a small chat window that answers typed questions from pre-written text. There is no AI and no server.
- `ask` in `content.json`: one block per answer. Fields: `id`, `question` (shown as the heading and chip), `keywords` (comma-separated words or phrases a visitor might type), `answer`, and optional `links`.
- In `answer`, use `\n\n` for a new paragraph and `**word**` for bold.
- In `links`, `to` can be a screen (`p-olist`, `experience-adobe`, `education`, `projects`), another answer (`ask-sql`), a full web address, or `email`, `resume`, `linkedin`, `github`.
- `ask_suggested` lists the question chips shown when the chat opens.
- `ask_page`: the chat's title, subtitle, greeting (`text`), placeholder and the "no match" messages.
- Project answers and "Do you know X?" answers (one per skill) are made automatically from the projects and skills lists. To write your own for a skill, add it to `covers_skills` on an answer. Add extra words people might type for a project with `ask_keywords`.
- Only put facts in answers that the site itself backs up (a project, a role or the skills list). Keep personal and job-search topics (salary, age, work authorization, why you're looking) out of the chat. If a question has no match, the visitor sees the closest topics and an Email me button with their question filled in.

## Other things you can change in content.json
- `profile`: name, "goes by", the status line, title, intro, photo file, the three highlight numbers
- `about`: the About me text and the three "How I work" steps
- `experience`: each job's title, dates, four key numbers, one-line focus and tools. Add a job by copying a block.
- `skills`, `education`, `contact`

---

## How it's built (for reference)
- `content.json`: all the content
- `build.py`: turns `content.json` into `index.html` (GitHub runs it for you)
- `.github/workflows/deploy.yml`: builds and publishes on every commit to `main`
- `style.css`: all styling. `site.js`: screen switching, filters, tabs and the NFL chart
- `ask.js`: the matching and display for the Ask me screen
- `img/`: photo and project images. `data/nfl.json`: game data for the NFL interactive chart

To preview on a computer: `python build.py`, then open `index.html` in a browser.

The page has several screens; the part after `#` in the address picks one:
`#home`, `#projects`, `#experience`, `#education`, `#contact`, or a project such as `#p-olist`.
`#ask` opens the chat window, and `#ask-sql` opens it on one answer.
