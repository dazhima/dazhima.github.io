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
