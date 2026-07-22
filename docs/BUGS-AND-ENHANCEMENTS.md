# Feten's Habit Tracker — Bug & Enhancement Log
_Working document for Claude. Keep this updated every session. Read it before starting any new build._

Last updated: after live-site testing session (Netlify deploy `6a46abcb…`).

---

## 🔴 CRITICAL — data loss (root cause CONFIRMED on live site via network trace)

**Symptom (user words):** "when I change the page… all the things I created are gone, nothing saved."

**Root cause:** Every Supabase request 404s because the URL is doubled:
`https://<proj>.supabase.co/rest/v1/rest/v1/<table>`.
The `VITE_SUPABASE_URL` env var in Netlify ends in `/rest/v1`, and the supabase-js
client appends its own `/rest/v1/`. Confirmed by reading network requests in-browser:
all 8 GETs (habits, habit_log, habit_entries, todos, countdowns, goals, wishlist,
planner) returned **404**.

**Why it wipes data:** `pullFromCloud` used `data || []`, so a 404 (which resolves as
`{data:null,error}`, NOT a throw) looked like "empty account." On reload the merge then
overwrote localStorage with empty arrays.

**Fixes applied in code (verify they shipped):**
1. `store.js` → `normalizeUrl()` strips a trailing `/rest/v1`, `/auth/v1`, and slashes
   from `VITE_SUPABASE_URL` so a mis-entered env var self-heals.
2. `store.js` → `pullFromCloud` now tracks `error` on every call and returns `null` if
   ANY table errored → caller skips the destructive merge (local data preserved).
3. `App.jsx` → `doSync` merges via functional `setData(cur => …)` (no stale closure) and
   skips merge when `cloud === null`.
- Verified locally: created item survives reload. ✅

**User action still required (independent of code):**
- Fix the Netlify env var to `https://<proj>.supabase.co` (no `/rest/v1`) + redeploy.
- Run `MIGRATION-v4.sql` in Supabase so the 5 new tables exist.

**Still to verify after user redeploys:** live create → close app → reopen → item persists,
and confirm the 8 requests return 200 (no doubled path).

---

## 🟠 CALENDAR / DAY PLANNER — needs redesign to match reference (user asked 3×)

**User words:** "the calendar events are small and cropped I want them well displayed
like the image attached." Reference = the Structured/Google-Calendar-style day view.

**Target layout (from reference image):**
- Full-height vertical timeline, one row per event (NOT a rigid fixed 18-hour grid).
- Left column: the time (e.g., `07:00`) in muted text, plus a hollow circle marker on
  the timeline rail.
- A continuous vertical line connecting the circles down the whole list.
- Event body: colored **time range** on top (e.g., `07:00 - 08:00` in the event color),
  **title** below it (e.g., "Jogging") in dark text. Generous vertical padding.
- Thin divider between events. No colored fill box that crops text.
- Comfortable row height (≈64–72px), text never truncated.

**Current state after last edit (`pages.jsx` PlannerTimeline / PlannerEventRow):**
- Switched from the old fixed-hour grid to an event-list. Rows show time + colored
  range + title with a left color bar. This is close but STILL NOT matching the
  reference: needs the hollow-circle rail + connecting vertical line, more padding,
  and the time-of-day gutter on the far left like the image.

**TODO for calendar (do all):**
1. Add the timeline rail: hollow circle at each event, vertical line linking them.
2. Left time gutter aligned and never clipped (min-width, right-aligned, own column).
3. Increase row height + padding so titles/ranges never crop.
4. Keep tap-to-edit and long-press-to-delete (added, re-verify on device).
5. Confirm the "+ Add event" and the edit form's "Delete event" button both work.
6. Month view: verify it's the clean grid (it renders Monday-first correctly — keep).
7. Consider a subtle "now" line on today's timeline (nice-to-have from reference).

**Reference file:** user upload `1783074468544_image.png` (Sept "Today" timeline panel).

---

## 🟡 FEATURE VISIBILITY RULES (confirm against user intent)

**User words:** "if I create a wishlist it displays in both home page and the wishlist in other."

**Current behavior:** Wishlist shows ONLY in More → Wishlist. It is intentionally NOT on
Home. **User wants it on Home too.**

**TODO:**
- Add a Wishlist preview section to the Home dashboard (e.g., top 2–3 unpurchased items,
  with "See all" → More/Wishlist). Mirror the Countdowns/Goals pattern already on Home.
- Re-confirm every type's dual visibility after change:
  | Type       | Home | Dedicated page |
  |------------|------|----------------|
  | Habit      | ✅ Today's Habits | Habit detail page |
  | To-do      | ✅ Today's To-dos | (Home only today; consider a list) |
  | Countdown  | ✅ Countdowns strip | More → Countdowns |
  | Goal       | ✅ Goals progress | More → Goals |
  | Wishlist   | ❌ (ADD) | More → Wishlist |
  | Schedule   | ✅ Today's Schedule | Calendar → Day Planner |

---

## 🟡 EDIT / DELETE — verify every path on device

Implemented but must be re-tested end-to-end after redeploy:
- Habit: open detail → Edit; long-press card → confirm delete.
- To-do: tap check toggles done; long-press → confirm delete. (Edit? currently no edit
  path for to-dos — ADD tap-to-edit.)
- Countdown: long-press → confirm delete. (Edit? no edit path — ADD.)
- Goal: tap card → edit form (has "Mark achieved"); long-press → delete.
- Wishlist: tap check = purchased; long-press → delete. (Edit? no edit path — ADD.)
- Schedule event: tap row → edit form (+ "Delete event" button); long-press → delete.

**TODO:** add tap-to-edit for To-do, Countdown, and Wishlist rows for consistency.

---

## 🟡 HABIT REPEAT OPTIONS — re-verify all four on device

Logic tested OK in isolation (Daily / Weekdays / Weekends / Specific Days) and the
`DAY_PICKER` (Monday-first, stores JS weekday values) fix is in `CreateHabit.jsx`.
- NOTE: there is no "Weekly" option; the set is Daily / Weekdays / Weekends / Specific
  Days / Every X Days / Custom (per spec). User said "weekly" — clarify wording with them.
- Re-test: create one habit of each repeat type, confirm it appears on Home on the
  correct days (Weekends won't show on a weekday — that's correct, not a bug).

---

## ⚙️ TEST HARNESS NOTES (so future testing is fast)

- Passcode: `azizfeten27`. Unlock flag: `sessionStorage feten_unlocked='1'`.
- Chrome extension driving is the best way to test the LIVE site; Playwright local build
  is best for verifying fixes pre-deploy.
- Playwright seeding: `add_init_script` did NOT reliably set sessionStorage before first
  paint — instead `goto`, `evaluate(seed)`, `reload`, then unlock via UI.
- Seed `log` must init sub-objects (`{h1:{},h2:{}}`) before assignment or eval throws.
- Emoji in seed strings breaks inline eval — write seed to a file and read it.
- Button labels: habit wizard uses **"Continue"** (steps 1–5) then **"Save Habit"** (step 6),
  not "Next". Create forms: "Add To-do", "Add Countdown", "Add Goal", "Add to Wishlist",
  "Add event".
- Server: `cd dist && (setsid python3 -m http.server 4173 … &); sleep 3; python3 script.py`
  all in ONE bash call (bg servers don't persist across calls). Use
  `wait_until='domcontentloaded'` (PWA SW never goes networkidle).

---

## ✅ VERIFIED WORKING (fixed build, local Playwright)
- All 6 create types create without errors; counts persist to localStorage.
- Home shows Habit, To-do, Countdown, Goal, Schedule, and now **Wishlist** (added per user request).
- More page shows Countdowns / Goals / Wishlist sections.
- Month calendar renders Monday-first (M T W T F S S), correct day alignment.
- **Day Planner timeline REDESIGNED to match reference** — time gutter on left, hollow
  colored circles on a connecting rail, colored time-range + full untruncated title,
  spacious rows. Verified with 5 overlapping events incl. a long title. ✅
- Reports page: 6 stat cards + adaptive chart + achievements.
- Data-safety fix: created item survives reload when sync fails.

## 📌 DONE THIS SESSION
- Calendar day-planner redesign (rail + circles + no cropping). ✅
- Wishlist now shows on Home (preview of up to 3 unpurchased) + still in More. ✅
- **Tap-to-edit added for To-do, Countdown, Wishlist** (they were create+delete only). ✅
- Full internal test suite passed (see below).

## 📌 SESSION 3 FIXES (from user's live bug report)
1. Wishlist created shows on Home now (was More-only). ✅ verified
2. "See all" on Home routes to the correct More section (Goals→Goals, not Countdowns).
   Added moreSection state + goToMore(section). ✅ verified
3. Day-planner redesigned: full-width rows, wrapping titles (`.pl-title` word-break),
   rail + hollow circles. Long titles no longer cropped. ✅ verified with screenshot
4. Paused habits stay VISIBLE on Home with a "Paused" badge (were disappearing);
   excluded from progress ring count. ✅ verified
5. Calendar month days are now tappable → opens that day in Day Planner (were dead dots). ✅
6. Weekends / Specific-Days(<5) scheduling confirmed correct on their actual days
   (was the old DOW/index storage bug; fixed in current CreateHabit). ✅ logic-verified
   - Reminder: a Weekends habit correctly does NOT show on a weekday — that's expected.

## 📌 STILL TODO / WATCH
- Planner events: edit (tap) + delete (long-press or Delete button in form) — implemented,
  needs live re-verify on device.
- "Every X Days" / "Custom" repeat: NOT in REPEATS array (only Daily/Weekdays/Weekends/
  Specific Days). scheduledOn falls to default(true) for unknown repeats. If user wants
  those, must add both the option AND scheduledOn handling.
- Date/time on cards: countdowns(date)✅ todos(due+time)✅ events(time)✅ goals(target if set)
  wishlist(price, no date — could add createdAt). Habit shows time only if reminderOn.
- #1 CRITICAL still: user must fix Netlify VITE_SUPABASE_URL (drop /rest/v1) + redeploy,
  else live data loss persists regardless of code.

## 🧪 INTERNAL TEST RESULTS (fixed build, Playwright, all PASS, 0 errors)
- CREATE: all 6 types (habit, todo, countdown, goal, wishlist, event) → persist ✅
- DISPLAY: Home shows habit/todo/countdown/goal/schedule/**wishlist**; More shows
  countdowns/goals/wishlist ✅
- EDIT: todo ('Original'→'Edited'), countdown, wishlist, goal, habit, event all persist
  the change ✅
- DELETE: long-press → "Are you sure…" confirm dialog → item removed (count→0) ✅
- HABIT REPEATS on Friday: Daily=show, Weekdays=show, Weekends=hide, Specific(Fri)=show,
  Specific(Mon)=hide — all correct ✅

## 📌 SESSION 4 (permanent life-tracker refactor) — all verified internally
- iOS keyboard fix: Sheet uses visualViewport API to lift above keyboard + transition. ✅
- Completed items NEVER disappear (habits/todos/wishlist/goals stay visible with done style). ✅
- Long-press → confirm delete everywhere. ✅
- Calendar: tapping a day stays on Calendar and shows a DailyView (schedule/habits/todos/goals). ✅
- More: 5 sections via scrollable chips — Habits, To-do List, Countdowns, Goals, Wishlist. ✅
- New HabitsPage + TodosPage in pages.jsx (completed stay visible). ✅
- Persistence: localStorage every change; pullFromCloud returns null on error (no wipe). ✅ code

STILL TODO: live re-verify after Netlify VITE_SUPABASE_URL fix + redeploy (#1 blocker);
"Every X Days"/"Custom" repeat not implemented; iOS keyboard verified structurally not on device.

## 📌 SESSION 4 CHANGES
- Removed passcode/lock screen entirely — app opens straight to Home. (Lockscreen.jsx
  left in project but no longer imported/rendered.)
- REPORTS page fully rebuilt (was gamified Insights). Now minimal, matching reference:
  - Week/Month/Year tabs.
  - Vertical list of habits, each card = icon + name + frequency label.
  - Week: 7 fixed cells Mon..Sun (circles), check + habit color when done.
  - Month: every day of current month as small squares.
  - Year: GitHub-style contribution grid (one square/day, Monday-first columns).
  - Reads real log history; updates live on completion (verified before/after = +1).
  - Removed: stat cards, bar chart, streak highlight, achievements, StatCard component.
  - New CSS: .rep-week/.rep-month/.rep-year/.rep-cell(-lg/-sm/-xs) in styles.css.
- Unused imports cleaned (Award, Sparkles, Trophy, Flame, TrendingUp).
- Image rendering in the test harness was flaky this session; verified Reports via DOM
  assertions instead (cell counts, day labels, filled-state, live update). All passed.
