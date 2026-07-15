# Web API Git Commit Guide

This guide applies to the `Web API/Quan-ly-nha-hang` repository.

## General Commit Principles

- Inspect all current Git changes before creating a commit.
- Do not modify source code while preparing commits unless the user explicitly requests a code change.
- Group changes by feature, bug fix, refactor, or business purpose.
- Each commit must contain one cohesive change only.
- Prefer several small, clearly scoped commits over one large commit.
- Never create a single oversized commit when the changes can be safely divided into independently understandable groups.
- Never combine unrelated controllers, services, models, DTOs, mappings, or configuration changes in one commit.
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

## Grouping Backend Changes

Keep files together only when they directly support the same feature. A backend feature may include:

- Controller endpoints.
- Service implementation.
- Request and response DTOs.
- Entities and database context changes.
- AutoMapper configuration.
- Dependency injection registration.
- A database migration created for that feature.
- Tests for that feature.

Split changes into separate commits when they serve different business purposes, even if they are in the same file. Use partial staging when necessary.

Do not separate a required migration from the entity or database change that it represents unless there is a clear technical reason.

For a large feature, divide the work into the smallest meaningful and reviewable groups, for example:

1. Add or update the entity, DTOs, mapping, database context, and required migration.
2. Add the service or business logic.
3. Add the controller endpoints and dependency registration.
4. Add or update tests and documentation.

Only use this split when each commit remains coherent and does not leave misleading or unrelated changes. Files that are tightly coupled and required for one valid change should remain in the same commit.

Before committing a large staged diff, review whether it contains multiple features, endpoints, fixes, or business flows. If it does, unstage it and regroup the changes into smaller commits.

## Files That Must Not Be Committed

Do not commit generated, local, temporary, or sensitive files, including:

- `.vs/`
- `.idea/`
- `bin/`
- `obj/`
- IDE caches and user-specific settings.
- Debug logs, temporary exports, test output, or local database files.
- Secrets, access tokens, passwords, private keys, or local connection strings.
- Unrelated formatting or line-ending changes.

If one of these files is already tracked, do not include its changes in a feature commit unless the user explicitly requests it.

## Checks Before Each Commit

Stage only the files or hunks related to one feature, then review:

```text
git diff --cached --check
git diff --cached --stat
git diff --cached
```

Confirm that the staged changes contain no:

- Debug code or temporary diagnostics.
- Breakpoints.
- Commented-out experimental code.
- Temporary test data or fake production data.
- Secrets or environment-specific values.
- Generated files.
- Unrelated changes.

When practical, build or run the relevant tests before committing. Do not change source code merely to make a commit cleaner without explicit authorization.

## Commit Message Format

Use Conventional Commits:

```text
<type>: <short feature description>
```

Common types:

- `feat`: add or complete a feature.
- `fix`: correct faulty behavior.
- `refactor`: restructure code without changing behavior.
- `test`: add or update tests.
- `docs`: update documentation only.
- `chore`: maintenance that does not change application behavior.
- `build`: update build configuration or dependencies.

Examples:

```text
feat: add reservation status management
feat: implement payroll calculation API
fix: correct order payment status update
refactor: extract revenue calculation service
docs: add API commit guidelines
```

Do not use vague messages such as:

- `update code`
- `fix bug`
- `changes`
- `modify files`

## After Each Commit

After creating a commit:

1. Display the commit hash.
2. Summarize the committed files and their purpose.
3. Run `git status --short` again.
4. Continue with the next change group if uncommitted work remains.
5. Clearly report any files intentionally left uncommitted and why.

## Final Commit Report

When all requested commits are complete, report:

- Every commit hash and message.
- The feature or business purpose of each commit.
- The files included in each commit.
- Verification performed, such as build or tests.
- Remaining uncommitted changes.
- Confirmation that nothing was pushed to a remote repository.
