# HealthTrack frontend

Plain HTML, CSS and vanilla JavaScript with Chart.js (bundled in `js/vendor`, no CDN needed). No build step.

## Run it

1. Start MongoDB and the API (`cd backend && npm install && npm run dev`). The API listens on port 5000.
2. In `backend/.env` set `CLIENT_URL=http://localhost:5500` (the CORS origin; it must match the address you open in the browser).
3. Serve this folder on port 5500, for example:
   ```
   cd frontend
   npx serve -l 5500        # or: python3 -m http.server 5500
   ```
4. Open http://localhost:5500

If your API runs somewhere else, change `API_BASE` in `js/config.js`. Use the same host name for both (for example `localhost`) so the login cookie is sent.

## Pages

| Page | File | What it does |
| --- | --- | --- |
| Register / Log in | `register.html`, `login.html` | Validates input, creates the account, signs in |
| Onboarding | `onboarding.html` | 3-step health profile wizard, shown until a profile exists |
| Dashboard | `dashboard.html` | Today's steps, water, weight, sleep, calories in/out, active goals |
| Daily health, Workouts, Sleep, Food, Goals | `daily.html`, `workouts.html`, `sleep.html`, `food.html`, `goals.html` | Add, edit, delete, filter and page through records |
| Analytics | `analytics.html` | Six Chart.js charts over 7, 30 or 90 days |
| Health profile | `profile.html` | Update your profile; withdraw medical-data consent |

`index.html` sends people to login, onboarding or the dashboard depending on their session.

## How it works

- Every request uses `fetch()` with `credentials: "include"`. The JWT lives in an HttpOnly cookie that JavaScript cannot read. Passwords and tokens are never stored in `localStorage`; the only thing stored there is your light/dark preference.
- `js/core.js` holds the API client, validation helpers, toasts and the app shell. `js/trackers.js` is one config-driven engine behind the five tracker pages.
- Dates are local `YYYY-MM-DD`. Sleep times are sent with your UTC offset.
- Dashboard "calories burned" uses today's daily record if it has a value, otherwise the sum of today's workouts, so nothing is counted twice.

## Tests

`tests/e2e/journey.py` drives a real Firefox through the whole journey (register, onboarding, every tracker, goals, dashboard, analytics, profile, theme, mobile, logout, route guards). It needs the API and frontend running, plus `pip install selenium`, Firefox and geckodriver:

```
cd frontend/tests/e2e
python3 journey.py
```

Optional environment variables: `FRONTEND_URL`, `API_URL`, `FIREFOX_BIN`, `GECKODRIVER`, `SHOTS_DIR`.
