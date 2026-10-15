# Browser smoke tests (web build)

Two Playwright scripts drive the exported website against a local API. They are the
end-to-end check that the guardian flow, the player flow and the live mirror work together.

```bash
# 1. API with console OTPs and sandbox billing, logging to a file
cd backend && SMS_PROVIDER=console BILLING_SANDBOX=true OTP_RESEND_COOLDOWN_S=0 \
  CORS_ORIGINS=http://localhost:8099 npm run dev > /tmp/loji-api.log 2>&1 &

# 2. Export the website and serve it
EXPO_PUBLIC_API_URL=http://localhost:4000 npx expo export --platform web --output-dir dist-web
npx serve -l 8099 dist-web   # or: python3 -m http.server 8099 -d dist-web

# 3. Run (needs `npm i -D playwright` and `npx playwright install chromium`)
node e2e/smoke.mjs     # register → OTP → subscribe (sandbox) → add child → Player Console → play
node e2e/mirror.mjs    # guardian + player in two browser contexts: facts, craft, quiz, live mirror, pause/resume
```

Screenshots land in `e2e/out/`. `E2E_WEB_URL`, `E2E_API_LOG` and `E2E_OUT` override the defaults.
The scripts read one-time codes from the API log, which only works with `SMS_PROVIDER=console`.
