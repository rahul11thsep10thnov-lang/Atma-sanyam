# How Naukri Chayan keeps itself up to date

## One-page handout

**Naukri Chayan watches the official government websites for you, reads every new notice, and publishes it on our site, so nobody has to type vacancies, admit cards or results by hand.**

### The 6 steps (repeats all day, no one pressing buttons)

1. **Watch** – A helper program visits each approved official site every 30 minutes to a day, depending on how important it is. It is polite: one visit at a time, it obeys each site's rules, and if a site says "no" it stops and tells us.
2. **Spot** – It finds new PDFs and links like "Admit Card for…" or "Recruitment of…". Anything it has seen before is ignored.
3. **Read** – It opens the document and pulls out the details: organization, post, vacancies, dates, fee, eligibility. If something is not written in the document, it stays "unknown". It never guesses.
4. **Connect** – It files the notice under the right exam and recruitment, so the job notice, admit card, answer key and result of one exam sit together on a dated timeline. Copies of the same notice from different websites become one.
5. **Check** – Every notice gets a confidence score.
   - Very sure and from an official site: can be published automatically.
   - Somewhat sure: waits in the **Review queue** for a person.
   - Unsure: waits in the **Inbox**.
   - Anything that came via an aggregator (like Sarkari Result): always checked by a person.
6. **Publish and alert** – The public page goes live under the right section (Latest Jobs, Results, Admit Cards, Answer Keys…) and people who subscribed get an email.

### What the admin does
- Switches on the websites to watch (the starter list of 176 begins switched off).
- Looks at the Review queue a few times a day and approves, corrects or rejects.
- Glances at "Failed items" and any website marked "needs attention".

### Honest limits
- A website has to be approved and switched on before anything is collected.
- Sites that need JavaScript to show their notices, or that block automated visits (UPSC does), need another route such as their RSS feed, or manual entry.
- The helper must run all the time, which means a cloud server, not a laptop.
- Emails and AI double-checking need their keys added in settings.

## 90-second video script

**[Show the homepage]**
"This is Naukri Chayan. Every job, admit card, answer key and result you see here was found automatically.

**[Show the Sources page]**
Behind the scenes, we list the official websites we trust: SSC, banks, railways, state commissions. A small program visits them every day, sometimes every half hour for the busiest ones.

**[Show a PDF turning into fields]**
When something new appears, the program reads it like a person would. It picks out the post, the vacancies, the dates and the fee. If something isn't written, it leaves it blank. It doesn't guess.

**[Show the Review queue]**
Then comes a safety check. If the program is very sure, it can publish on its own. If it's not, the notice waits here for a person to approve. Notices from third-party websites always wait for a person.

**[Show a recruitment timeline]**
Once approved, the notice goes live and joins the exam's timeline: job notice, admit card, answer key, result, all in one place. Subscribers get an email.

**[Show the admin dashboard]**
So the admin's job is small: choose the websites to watch, and approve what needs a human eye. The rest runs by itself."
