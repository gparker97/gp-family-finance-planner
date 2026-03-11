---
name: deploy-prod-auto-skip-ci
description: Auto-approved commit, push, and deploy to production — skips CI gate for fast deploys
disable-model-invocation: true
---

# Deploy to Production (Skip CI)

This skill commits all pending changes, pushes to `main`, and deploys to production immediately — skipping the CI/Security gate. Use this for small, verified changes (config tweaks, copy updates, hotfixes) that have already been tested locally.

**All actions are pre-approved:** commit, push, and deploy will proceed automatically. The only reason to stop is an unrecoverable failure after 3 fix attempts.

---

## Step 1: Commit & Push

1. Run `git status` and `git diff` to review all pending changes.
2. Draft a commit message based on the changes (follow the repo's commit style).
3. Stage relevant files (never stage `.env`, credentials, or secrets).
4. Commit immediately with the drafted message — no need to confirm with the user.
5. Push to `main`. The pre-push hook (`npm run test:run`) will run automatically.
6. If pre-push tests fail:
   - Analyze the failure output.
   - Fix the root cause (do not skip hooks with `--no-verify`).
   - Re-commit the fix and push again.
   - Repeat until push succeeds.

## Step 2: Deploy (Skip CI Gate)

Immediately after a successful push, trigger the deploy with the CI gate skipped — do NOT wait for the CI/Security workflows:

1. Trigger the deploy with `skip_gate=true`:
   ```
   gh workflow run deploy.yml --ref main -f skip_gate=true
   ```
2. Wait ~10 seconds, then find the run:
   ```
   gh run list --workflow=deploy.yml --limit=1
   ```
3. Monitor the deploy workflow:
   ```
   gh run watch <run-id> --exit-status
   ```
4. If deploy fails, fetch logs and report to the user. Do not retry automatically.
5. On success, report: deployed commit SHA, deploy duration, and the production URL.

**Note:** The CI/Security workflows still run in the background (triggered by the push). They are not waited on, but if they fail, investigate on the next deploy cycle.

---

## GitHub Account

This repo requires the **`gparker97`** GitHub account.

Before pushing or triggering workflows, verify the active account:
```
gh auth status
```

If a different account is authorized, switch first:
```
gh auth switch --user gparker97
```

If `gparker97` is not logged in at all, prompt the user to authenticate:
```
gh auth login
```

---

## Rules

- **Never use `--no-verify` or `--force`** on any git command.
- **Never amend published commits** — always create new fix commits.
- **Stop and ask the user only** if there is an unrecoverable failure after 3 fix attempts, or something truly unexpected (merge conflicts, unknown infrastructure failures).
- The deploy workflow name is exactly `deploy.yml` (display name: "Deploy beanies PROD").
- The `skip_gate` flag only bypasses the CI/Security wait — the build and S3 deploy still run normally.
