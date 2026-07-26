# Frontend Git Commit Guide

This guide applies to the `FE/Quan-ly-nha-hang` repository.

## General Commit Principles

- Inspect all current Git changes before creating a commit.
- Do not modify source code while preparing commits unless the user explicitly requests a code change.
- Group changes by feature, bug fix, refactor, UI behavior, or business purpose.
- Each commit must contain one cohesive change only.
- Prefer several small, clearly scoped commits over one large commit.
- Never combine unrelated pages, components, services, models, routes, styles, or configuration changes in one commit.
- Preserve existing user changes and do not discard, overwrite, or reformat unrelated work.
- Create local commits only. Do not push to a remote repository unless explicitly requested.
- Write commit messages in English only.
- Save text files as UTF-8.

## Required Inspection Before Committing

Before organizing any commit, run and review:

```text
git status --short
git diff
git diff --cached
```

Use the results to identify separate features and detect generated, temporary, or unrelated files.

## Grouping Frontend Changes

Keep files together only when they directly support the same feature. A frontend feature may include:

- Page or component templates, logic, and styles.
- TypeScript models and API methods required by the UI behavior.
- Routes, guards, and shared UI styles required by the feature.
- Tests and documentation for that feature.

Split changes into separate commits when they serve different business purposes, even if they are in the same file. Use partial staging when necessary.

For a large feature, divide the work into the smallest meaningful and reviewable groups. Keep files tightly coupled to one valid user-facing behavior in the same commit.

## Files That Must Not Be Committed

Do not commit generated, local, temporary, or sensitive files, including:

- `node_modules/`, build output, caches, and IDE-specific files.
- Environment files containing secrets, access tokens, passwords, or private keys.
- Debug logs, temporary exports, screenshots, or test output not required by the feature.
- Unrelated formatting or line-ending changes.

## Checks Before Each Commit

Stage only the files or hunks related to one feature, then review:

```text
git diff --cached --check
git diff --cached --stat
git diff --cached
```

Confirm that the staged changes contain no debug code, temporary data, secrets, generated files, or unrelated changes. When practical, run relevant tests or the frontend build before committing.

## Commit Message Format

Use Conventional Commits:

```text
<type>: <short feature description>
```

Common types are `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `build`, `ci`, and `perf`.

Examples:

```text
feat: add item availability filter
fix: preserve return URL after login
refactor: extract order table actions
docs: add frontend commit guidelines
```

Do not use vague messages such as `update code`, `fix bug`, `changes`, or `modify files`.

## After Each Commit

1. Display the commit hash.
2. Summarize the committed files and their purpose.
3. Run `git status --short` again.
4. Continue with the next change group if uncommitted work remains.
5. Clearly report files intentionally left uncommitted and why.

## Final Commit Report

When all requested commits are complete, report every commit hash and message, its purpose, included files, verification performed, remaining uncommitted changes, and confirmation that nothing was pushed.
