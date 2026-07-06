# website/ — Yan He's personal site

parent: [../CLAUDE.md](../CLAUDE.md)

## What this is

Yan's personal academic/builder website — single self-contained `index.html` (no build step; KaTeX + Google Fonts via CDN), plus pre-rendered reading-project pages (`bible/`, `philosophy/`) copied in from his Obsidian vault. Own git repo lives in this folder, pushed to GitHub as a public Pages site.

- **Live:** https://yanhe-math.com (custom domain, active) · https://dazhima.github.io (always works, unchanged)
- **Repo:** `github.com/dazhima/dazhima.github.io`, public, Pages builds from `main` root

## Standing rules

- **Never commit anything outside `website/`** — this repo is public; the rest of the vault (shiteater, personal docs, IDs) must never enter it.
- **Keep private info off the page** — no phone number, home address, ID/passport numbers. Public office location and email only.
- **Publishing pattern for new reading-project content** (查经, philosophy, etc.): copy the already-rendered HTML in as-is, add a `主页` breadcrumb link back to `../index.html` (or `../../index.html` for nested pages), add a card to the "Others" section on the homepage. Don't re-render or redesign the source content — just wire it into the site.
- **GitHub Pages builds sometimes hang/error spuriously** on the first attempt after a push. Force a fresh build with `gh api -X POST repos/dazhima/dazhima.github.io/pages/builds` and poll `gh api repos/dazhima/dazhima.github.io/pages/builds/latest --jq '.status'` until `built`.
- **Boolean flags via `gh api`** need `-F` not `-f` (e.g. `-F https_enforced=true`), or you'll get a type error.

## Records discipline (maintain as you work — don't let these go stale)

Four records, four aspects of this project's memory:
- **LOG.md** — current state, IDs, working commands. Update after a milestone.
- **JOURNAL.md** — messy problem-solving trail; append when you hit/solve a snag.
  (how-to: `dirty-journal` skill)
- **DECISIONS.md** — the human's calls + reasoning; append when a judgment call is
  made. Durable rules also graduate to MEMORY and to this file's standing rules.
  (how-to: `decision-log` skill)
- **CLAUDE.md** (this file) — keep the index + standing rules current.
