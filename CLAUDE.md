# CLAUDE.md

Guidance for Claude Code (claude.ai/code) and other AI assistants working in this repository.

## Read this first: the repository is empty

As of the latest commit, this repo contains **no application code**. The entire
tracked contents are:

```
README.md   # one line: "# Top-travel-destinations-"
CLAUDE.md   # this file
```

There is no source directory, no package manifest, no build system, no test
suite, no linter config, no CI workflow, and no dependency lockfile. History is
a single commit (`9171260`, "Initial commit").

**Do not describe this project as if it had a stack.** If you are asked to "run
the tests", "start the dev server", "follow the existing patterns", or "match
the conventions", the honest answer is that none exist yet. Say so and ask what
should be built, rather than guessing at a framework or fabricating commands.

## What the project is meant to be

The repository name and README title — "Top travel destinations" — are the only
signals of intent that exist in the repo. Nothing specifies a language,
framework, or delivery target (static site, web app, API, data set, content
collection). Treat the subject matter as known and the implementation as
**undecided**.

Before scaffolding anything substantial, confirm with the user:

- The deliverable (static site? SPA? backend API? plain content/data?)
- Language and runtime (e.g. Node/TypeScript, Python, plain HTML/CSS)
- Whether a framework is wanted, and which
- Where data about destinations comes from (hand-authored, CMS, third-party API)

Picking these unilaterally locks the project into choices the owner may not
want.

## Repository facts

| | |
|---|---|
| Remote | `https://github.com/jamesdillon9051-sketch/Top-travel-destinations-` |
| Default branch | `main` |
| Owner | `jamesdillon9051-sketch` |
| History | 1 commit, no tags, no releases |
| Note | The repo name ends with a trailing hyphen — `Top-travel-destinations-`. This is intentional in the URL; keep it when cloning or referencing the remote. |

## Git workflow

- Work on a feature branch, never directly on `main`. Branches created by
  Claude Code sessions follow `claude/<short-topic>-<id>` (e.g.
  `claude/claude-md-docs-44t2q1`).
- Create the branch locally if it does not exist, commit with a clear
  descriptive message, and push with `git push -u origin <branch-name>`.
- Do **not** open a pull request unless explicitly asked.
- Retry a failed push only for network errors, with exponential backoff
  (2s, 4s, 8s, 16s).
- There is no PR template, CODEOWNERS file, or branch protection configured.

## Conventions to follow when code first lands

Nothing here is enforced by tooling yet, so these are starting defaults rather
than rules extracted from existing code:

- Keep the initial structure flat and obvious; do not introduce a monorepo,
  build pipeline, or abstraction layer before there is code that needs one.
- Add the toolchain and its entry-point commands in the same change that adds
  the first code, so `README.md` and this file can state real commands instead
  of placeholders.
- Commit generated artifacts (lockfiles) that the chosen ecosystem expects to be
  tracked; do not commit build output, `node_modules`, virtualenvs, or editor
  directories — add a `.gitignore` as part of the first scaffolding change.

## Keeping this file accurate

This file's main value right now is preventing false assumptions. That value
disappears the moment it drifts. When a change introduces any of the following,
update the relevant section in the **same** commit:

- A package manifest or dependency manager → record install and run commands
- A test runner → record the exact command to run the full suite and a single test
- A linter/formatter → record the check and fix commands
- A CI workflow → record what it runs and what must pass before pushing
- A directory structure worth explaining → replace the "repository is empty"
  section with a real architecture overview

Delete the "repository is empty" warning as soon as it stops being true.
