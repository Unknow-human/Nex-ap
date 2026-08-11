# EAS Production Build (GitHub Actions)

This document explains the `full-deploy` workflow and the GitHub repository secrets required to run EAS production builds from CI.

## Workflow
- Location: `.github/workflows/full-deploy.yml`
- Triggers:
  - Manual (workflow_dispatch)
  - Tag pushes matching `v*.*.*` (release tags)

## Required secrets
- `EAS_TOKEN` (required): EAS/Expo token to authenticate `eas` CLI in CI (add under Settings → Secrets → Actions).

## Optional secrets (for submission or custom credentials)
- `GOOGLE_SERVICE_ACCOUNT_JSON`: Google Play service account JSON (base64-encoded recommended) used with `eas submit` for Play Store uploads.
- `ANDROID_KEYSTORE_BASE64`: Base64-encoded Android keystore for providing your own keystore to EAS.

## How to run
- From GitHub UI: open the Actions tab, select "Full Deploy (EAS)", and click "Run workflow".
- From a local machine or release automation: push a tag `vX.Y.Z` to `main`.

## Notes
- The workflow performs a non-interactive `npx eas build` using the `production` profile and uploads `eas-build.json` as an artifact.
- For automatic Play Store submission, add `GOOGLE_SERVICE_ACCOUNT_JSON` and add a follow-up job running `npx eas submit` (not configured by default).
