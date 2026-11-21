# Naukri Chayan — Flutter app

A native Android / iOS (and web) app for the **Naukri Chayan** government-exam
information website (the Next.js `exam-portal`). It reads the website's public
JSON API, so everything an admin publishes on the site appears in the app.

## What's in it

| Screen | Website equivalent | API used |
|---|---|---|
| Home — wordmark, motto, search bar, section tabs, latest jobs | `/` | `/api/jobs` |
| Jobs, Results, Admit Cards, Answer Keys, Syllabus, Admissions, Scholarships, Articles (infinite scroll, pull to refresh) | `/jobs`, `/results`, … | `/api/<type>?page=N` |
| Detail pages (dates, fees, vacancies, eligibility, official links, related content, syllabus tree) | `/jobs/<slug>`, … | `/api/<type>/<slug>` |
| Exam page | `/exam/<slug>` | `/api/exams/<slug>` |
| Search with type filters | `/search` | `/api/search` |
| What's new | notification feed | `/api/notifications` |
| E-mail alerts sign-up | `/alerts` | `POST /api/alerts/subscribe` |
| More — organisations, categories, recruitments, privacy (open on the website), server address | | |

The deadline badges ("4 days left to apply"), date format and colours are
ported from the site (`lib/deadline.ts`, `globals.css`).

## Pointing the app at your website

The app needs the address where the website is deployed:

```bash
flutter run --dart-define=SITE_URL=https://your-domain
flutter build apk --release --dart-define=SITE_URL=https://your-domain
```

It can also be changed inside the app (More → Server address). Without either,
it uses `http://10.0.2.2:3000` — the Android emulator's address for a site
running with `npm run dev` on your computer.

Note: for the **web** build the website must allow cross-origin requests, or
the web build must be served from the same domain.

## Develop

Requires Flutter 3.50+ (Material comes from `package:material_ui`).

```bash
flutter pub get
flutter analyze
flutter test
flutter run
```
