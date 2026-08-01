# JOURNAL — messy problem-solving trail

parent: [CLAUDE.md](CLAUDE.md)

Append-only. This is the honest record of what broke and how it got fixed — not the clean version. See LOG.md for current state, DECISIONS.md for the human's calls.

---

## 2026-06-23 — initial build

Built the whole site as a single `index.html`: hero, Research, Publications, Path, "Beyond Math" (later renamed), Contact. Pulled facts from `shiteater/world/*.md` (education, work, postdoc, research). Deliberately left out private info (ID, phone, home address) even though it was sitting right there in the source files — shiteater's job is admin forms, not public web pages, so had to actively filter rather than just copy.

Iterated several times on user feedback:
- "not a mathematician yet" → changed eyebrow/title wording
- RWOT paper needed real coauthors (Testorf, Wang) + arXiv link — went and found it in the LaTeX bib (`RWOT/HTW_5.tex`) since it wasn't in any of the shiteater world files
- "connections between Nevanlinna theory" implied a false link between two separate research threads — user caught this, had to explicitly say "separate interests," not "connections"
- title deliberately made satirical (Jiangshi/Quanzhitepin/Shizi Bohou) per user's request to 讽刺 his own bureaucratic job title

## 2026-06-23 — GitHub Pages deploy

First deploy: created `dazhima/dazhima.github.io` repo, pushed, enabled Pages via API. Straightforward, no snags — `gh` was already authenticated as `dazhima`.

## 2026-07-04 — 查经 (Bible study) section + philosophy section

Copied rendered HTML from `claude/obsidian-ai/non-math/bible/` and `.../philosophy/` into `website/bible/` and `website/philosophy/`. Pattern that emerged: don't touch the source content's own CSS/JS, just add a breadcrumb link back to home and a card in an "Others" section.

**Snag: Pages build hung/errored repeatedly.** After pushing the philosophy pages + `.nojekyll`, the Pages API kept reporting `status: errored` with `"Page build failed"`, then would report `building` for 5+ minutes without resolving — much longer than the normal ~40 second build time. Diagnosis: unclear root cause (never got a real error message from the API — `.error.message` came back null even on `errored` builds). Fix that worked every time: manually POST a fresh build (`gh api -X POST repos/dazhima/dazhima.github.io/pages/builds`) rather than waiting for the auto-triggered one. Had to do this twice in the same session. Lesson: don't trust the first auto-build after a push if it's taking longer than ~1 minute — just force a new one.

**Local DNS/curl gotcha:** when later checking `dig` output locally, `A yanhe-math.com` returned `198.18.1.69` — looked like a real IP but is actually Clash's fake-IP interception range on this Mac (see `network_environment` project). Had to re-check via DNS-over-HTTPS (`curl https://cloudflare-dns.com/dns-query?...`) to bypass the local proxy and see the real public DNS state. Don't trust local `dig`/`curl` for domain verification on this machine — always cross-check via a public DoH resolver.

## 2026-07-06 — yanhe.us domain saga → yanhe-math.com

Tried to attach `yanhe.us` (a domain Yan already owned, registered while at NTNU). Set CNAME + Namecheap DNS instructions, but the domain had **expired 2026-05-15** and Namecheap's reactivation flow failed with "Unable to find domain information" (order #206235017) even though WHOIS still showed it in `autoRenewPeriod` grace period and registered to Yan. Drafted a support email; user decided not to keep chasing it (see DECISIONS.md) and registered a fresh domain instead: **yanhe-math.com**.

Second attempt went cleanly: DNS records added on Namecheap, CNAME file pushed, `gh api -X PUT .../pages -f cname=yanhe-math.com`, verified via DoH that all 4 apex A records + www CNAME resolved correctly, HTTPS cert auto-approved fast, then enabled enforcement. One small API gotcha: `-f https_enforced=true` fails with a type error ("not of type boolean") — `gh api` needs `-F` (capital) to send it as an actual JSON boolean instead of a string.

Also removed `yanhe.us` CNAME cleanly first (before abandoning it) so Pages wouldn't be stuck pointing at a domain that doesn't resolve.

## 2026-07-06 — SEO basics

User searched "yanhe guangzhou university" on Google and got nothing — expected, since the domain is <24h old and Google hasn't crawled it yet. Added `robots.txt` (allow all, point to sitemap) and `sitemap.xml` (7 URLs: homepage + all bible/philosophy pages) so that whenever Google does crawl, it finds everything instead of just the homepage. Offered to do Search Console verification + manual indexing request; user declined, chose to let it happen naturally. Bootstrapped project-records (this file + LOG.md + DECISIONS.md + CLAUDE.md) right after, since the project has clearly graduated from "one-off task" to "a thing with ongoing history."

## Lessons wall

- Pages build stuck > 1 min → force `gh api -X POST .../pages/builds`, don't wait it out.
- `gh api` booleans need `-F`, not `-f`.
- Local `dig`/`curl` on this Mac can show fake-IP (Clash) results — verify DNS via a DoH resolver instead.
- A domain in Namecheap's `autoRenewPeriod` grace window can still fail to reactivate through the normal UI/API flow for no clear reason — don't assume "still owned in WHOIS" means "reactivation will work."

## 2026-07-31 — Arendt Introduction III and the self-invalidating theme selector

Published the final Introduction reading page as `philosophy/lotm-thinking-intro-03.html`,
S99–127 / printed pp. 12–16, without extending the experimental Cain reader. Updated the
homepage description and sitemap, and linked Introduction II forward to III.

Browser testing exposed an inherited link-state bug: the theme function selected links
by a relative `href` prefix and then assigned `link.href`, converting the stored
attribute to an absolute URL. A later theme switch could no longer select the same link,
so it kept the previous `?theme=` value. The website's `lotm-` filename prefix made the
source selector miss even sooner. Changed all three pages to a stable filename-substring
selector and verified dark → light → dark propagation.

## 2026-08-01 — Arendt Appearance I, Chapter 1

Published `philosophy/lotm-thinking-appearance-01.html`, covering S128–174 / printed
pp. 19–23 and preserving the W. H. Auden epigraph. The page ends exactly with Chapter
1's question about whether invisible and soundless mental activities can appear or
find a home in the world; Chapter 2 begins next. All 47 sentences have the approved
meaning-first rescue, expression notes, reread cue, and folded literal translation.
No Cain reader was added.

Because the new filename is no longer an Introduction filename, generalized all four
reading-page theme selectors from `lotm-thinking-intro` to `lotm-thinking-`. Local
browser testing passed the epigraph, S164's dense life-curve structure, S174's ending,
expression focus, all-translation toggle, rescue focus, footer, both themes, and
Introduction III → Chapter 1 theme carryover.

## 2026-08-01 — Page II reading map, second prototype

Yan rejected the first anchor prototype's automatic phrase under every sentence number
as unhelpful, but wanted a hideable page/book map in the unused desktop margin and no
map on mobile. Replaced the right-edge spine and per-sentence labels on
`lotm-thinking-intro-02.html` with a fixed left panel: four-page book position, nine
hand-authored S49–98 argument ranges, live section/progress state, and marked-sentence
chips. Sentence numbers remain clickable coordinates; the map does not change the text
column width and remembers hidden/visible state.

The first scroll probe highlighted the previous section after a map jump because the
target sentence was centered below the probe. Moved the probe from 30% to the viewport
midpoint. Browser checks passed at 1280px in Light/Dark, including hide/reload, marks,
section jumps and no overflow. A 375px iframe check confirmed the map and Map button
are absent and the original inline sentence numbers return.

## 2026-08-01 — Arendt Appearance I §2 and the v2 map rollout

Added `philosophy/lotm-thinking-appearance-02.html`, S175–202 / printed pp. 23–26,
following the prepared Claude design exactly: five paragraph joints, six argument-map
regions, and the complete two-world-theory section. All 28 sentences have concise
meaning-first rescue, expression notes, reread cues, and folded literal translations.

Browser QA caught two copy-template leaks. The copied page silently inherited Cain code
pointing at page 4's audio directory, contrary to the standing pause, so it was removed.
The one-sentence S197 map region also made the old 26px minimum label height collide
with S198–202; raised the shared v2 minimum to 34px and re-injected all five pages.
Validator checks pass for every page. At 1280×720 the desktop map and dark rescue mode
have no overflow; at 375px the map and Map control disappear and inline numbers return.
Also propagated the active theme when the map is created: its dynamic links otherwise
missed the page's earlier theme pass, a bug masked by same-origin localStorage.
