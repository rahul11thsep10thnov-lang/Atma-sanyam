# PoliceExams admin console

Next.js 16 console for the exam team: exams and syllabus, question bank,
AI generation, review queue, mock tests and blueprints, imports, source
material, users, analytics, settings and audit log.

```bash
cp .env.example .env.local   # API_URL=http://localhost:4000
npm install
npm run dev                  # http://localhost:3001
```

The browser holds only an httpOnly session cookie; `src/app/api/backend`
forwards requests to the API with the token attached. The API enforces every
permission — the console only hides what a role can't use. See the
[root README](../README.md) for the full workflow.
