# Maputo Publicidade working agreement

## Scope and efficiency

- Keep small tasks small: inspect the affected files and their direct dependencies first.
- Prefer the smallest complete change; do not add unrelated refactors or infrastructure.
- Batch independent read-only checks. Reuse existing test/preview tools instead of building temporary harnesses for routine edits.
- Avoid repeating successful checks unless a later change affects what they verify.
- Keep updates and final reports concise. Distinguish implemented, tested, pushed, and deployed.
- Do not use sub-agents unless explicitly requested by the user.

## Proportionate verification

- Copy/spacing/small UI changes: relevant component tests, changed-file lint, and one desktop/mobile visual check when layout changes warrant it.
- Forms and workflow behaviour: targeted integration tests plus frontend type-check when TypeScript is affected.
- Authentication, permissions, financial calculations, data migrations, and security changes: broader regression and relevant security checks.
- For releases, preserve all required CI gates. Let CI perform full-suite release validation rather than duplicating it locally without a specific reason.
- Never weaken tests, security gates, or production controls to save time.

## Project and commands

- `frontend/`: Next.js application. Run commands from this directory using `npm.cmd` on Windows.
- Focused tests: `npm.cmd run test:ci -- <test-path>`.
- Type-check: `npm.cmd run type-check`.
- Changed-file lint: `node node_modules/eslint/bin/eslint.js <paths>`.
- `backend/`: Django API; `.github/workflows/ci.yml` defines current release validation.

## Safe delivery

- Preserve unrelated user changes. Use an isolated worktree when the main checkout is dirty.
- Never read or print credentials, `.env` values, browser tokens, or authentication state.
- Deploy only when requested. Verify the intended project, environment, and exact commit before release.
- Keep unrelated pending features out of the release. Do not bypass failing required checks.
- After deployment, confirm the deployed commit, production URL, and relevant health/status evidence; disclose any verification gaps.
