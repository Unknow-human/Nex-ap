# CI & Local Test Guide 🔧

This project requires the Firestore emulator for running the full test suite (rules and integration tests).

## GitHub Actions
- A workflow is provided at `.github/workflows/ci.yml`.
- It starts the Firestore emulator (using `firebase emulators:exec`) and runs `npm test` under it.
- Java 17 is installed in the runner (required by the Firestore emulator).

## Running tests locally
1. Install dependencies: `npm ci`
2. Start the Firestore emulator and run tests with the same command used in CI:

```bash
npx firebase emulators:exec --only firestore --project test --quiet "npm test"
```

This will start the emulator, run the tests, then shut down the emulator on completion.

## Notes
- If you prefer to run the emulator separately, run `npx firebase emulators:start --only firestore` in another terminal, wait for it to be ready, then run `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm test`.
- The CI workflow sets the `FIRESTORE_EMULATOR_HOST` env var so tests targeting `127.0.0.1:8080` work as expected.
