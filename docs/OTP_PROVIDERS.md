# One-time codes (OTP) by SMS

Where OTPs are used: guardian registration, guardian login (after the password), step-up for
sensitive actions, password recovery, and the optional "ask me for a code when this child
signs in" (the code goes to the **guardian's** phone, never the child's).

How they work (`backend/src/lib/otp.ts`): 6 digits, hashed at rest and bound to a challenge id
and purpose, valid 10 minutes, 5 attempts per challenge, resend cooldown
`OTP_RESEND_COOLDOWN_S` (45 s), per-number hourly caps, and the API never logs a code or a
phone number (only the provider's error text). Repeated failures lock the challenge.

## Providers (`SMS_PROVIDER`)

| Value | When | Setup |
|---|---|---|
| `msg91` | India production | msg91.com account → complete **DLT** registration (sender id + an OTP template containing `##OTP##`) → set `MSG91_AUTH_KEY` and `MSG91_TEMPLATE_ID`. |
| `twilio` | Outside India / fallback | Twilio account → buy an SMS-capable number → `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` (E.164). |
| `console` | Local development only | Codes are printed to the API log. Refused in production. |

`DEFAULT_COUNTRY_CODE=91` is assumed for numbers typed without one. The app shows phone
sign-in only when `features.phoneSignIn` in `/v1/config` is true (a provider or test numbers are
configured).

## Test numbers (store review, automated tests)

`OTP_TEST_NUMBERS="+919999900001:123456,+919999900002:654321"` makes those numbers sign in with
the fixed code and sends no SMS. They are ignored in production unless
`OTP_TEST_NUMBERS_ALLOW_PRODUCTION=true`; give one to the Google Play / App Store reviewer in
the review notes and remove it afterwards.

## Verifying delivery

Live delivery has not been verified from this repository (it needs a provider account and, in
India, DLT approval which takes days). After setting a provider: register from a real phone,
check the API log for provider errors (`sms send failed: ...`), and the admin console's System
health page for the provider name.
