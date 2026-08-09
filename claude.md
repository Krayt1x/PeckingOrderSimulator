# claude.md: Automated Repository Setup Playbook

This is a **fully executable** guide for Claude to autonomously set up production-ready GitHub repositories following Trent's established patterns. Every section includes scripts, commands, and templates Claude can run directly.

**When to use:**
- New project? Give Claude the brief + point to this file
- Claude will: scaffold repo, create files, configure GitHub, set up workflows, initialize wiki
- You will: review + push

Copied from DropshipBuilder's `RUNBOOK-TEMPLATE.md` (2026-08-09) for PeckingOrderSimulator, a GitHub Pages SPA project like DropshipSimulator — no server, no database.

---

## Execution Tracking (IMPORTANT)

**As you complete each section, DELETE IT from this file.**

This keeps the file focused on what's remaining and prevents re-running completed work.

### Progress Checklist

```
Sections to Complete:

☑ A: GitHub Pages SPA Template — done, client scaffold + workflows committed
☐ B: Docker Stack Template — not applicable (client-only SPA)
☐ C: Both (Demo + Self-Hosting) — not applicable
☐ D: Data Specification — not applicable unless/until gameplay data needs a spec
☐ E: Authentication & Persistence — not applicable (no auth)
☐ F: GitHub Settings & Metadata — HELD OFF, see note below
☐ G: Releases, Versioning & Changelog — not started
☐ H: Reverse Proxy & Self-Hosting — not applicable (no server)
☐ I: Health Checks & Monitoring — not applicable (no server)
☐ J: Development vs Production Environments — not applicable (no server)
☐ K: Database Migrations & Backups — not applicable (no database)
☐ L: Repository Bootstrap Script — HELD OFF, see note below
☑ M: Code Owners & Maintenance Policy — done (.github/CODEOWNERS)
☑ N: Dependency Management Strategy — done (.github/dependabot.yml)
☑ O: Repository Documentation for Developers — done (README.md)
☐ P: Labels & Milestones — HELD OFF, see note below
```

**Note on F/L/P (held off deliberately):** branch protection, required status checks,
core labels, and milestones are intentionally not applied yet. Per the runbook's own
Gotchas #7 and #9, required-check names should only be set after the CI workflows
(`lint-and-test.yml`, `security-checks.yml`) have run at least once on a real commit,
so the real check-run names can be confirmed instead of guessed. Run Section F.1 /
Section A.4 (branch protection) and Section L (labels/milestones) after the first
push has triggered CI on `main`.

---

Everything else from the original playbook (Sections B–E, G–K) doesn't apply to this
project's shape (static SPA, no server/database) and has been removed here — see
`RUNBOOK-TEMPLATE.md` in the DropshipBuilder repo for the full reference if the
project ever grows a backend.
