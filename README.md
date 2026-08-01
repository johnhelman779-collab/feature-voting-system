# Feature Voting System

A full-stack web application for collecting product ideas, prioritizing them by community votes, and surfacing who submitted each request. Authenticated users can submit features and cast one vote per feature; guests can browse and sort the backlog.

## Key features (requirements → implementation)

| Requirement | Where it lives |
|-------------|----------------|
| **Public backlog** — anyone can list and read feature details | `FeatureViewSet` permissions (`list` / `retrieve` → `AllowAny`); paginated `GET /api/features/`; full body on `GET /api/features/<id>/`; UI: `FeatureList.tsx` + `FeatureCard.tsx` |
| **Sort by popularity or recency** (“Top” / “Newest”) | DRF `OrderingFilter` on `FeatureViewSet`; `?ordering=` from `FeatureList.tsx` |
| **Submit a feature** (title + description) | `POST /api/features/` requires `IsAuthenticated`; `perform_create` sets `submitted_by`; form block in `FeatureList.tsx` |
| **Upvote** with one vote per user per feature | `POST /api/features/<id>/vote/`; `Vote` model `UniqueConstraint(user, feature)`; transactional vote in `features/views.py`; `400` on duplicate |
| **Live vote totals** | Denormalized `Feature.vote_count` updated in the vote transaction; shown on cards and in API payloads |
| **Know if the current user already voted** | `user_has_voted` queryset annotation + `has_voted` in `features/serializers.py`; highlighted vote control in `FeatureCard.tsx` |
| **Attribution** (“Submitted by …”) | `Feature.submitted_by` FK + `submitted_by_name` in serializers; Meta block in `FeatureCard.tsx` |
| **Relative submission time** (“2 days ago”) | `created_at` from API; `date-fns` in `FeatureCard.tsx` |
| **Accounts: register, log in, JWT** | `accounts/` app: `CustomUser`, `RegisterSerializer`, SimpleJWT `token/` + `token/refresh/`; `AuthContext.tsx`, `LoginPage.tsx`, `RegisterPage.tsx`; Bearer via `frontend/src/api/client.ts` |
| **Guests cannot submit or vote** | API enforced with `IsAuthenticated` on `create` / `vote`; UI hides actions and shows login hints in `FeatureList.tsx` |
| **Responsive, mobile-friendly cards** | `index.css` (`#root`), `FeatureList.css`, full-width / spacing on `FeatureCard.tsx` |
| **Installable PWA (basic)** | `frontend/public/manifest.json`; linked from `index.html` with theme / description meta |
| **Snappy votes (optimistic UI)** | TanStack Query `voteMutation` in `FeatureList.tsx` — synchronous cache patch in `onMutate`, rollback in `onError`, merge in `onSuccess` |
| **CSRF-safe browser writes** | `GET /api/csrf/` (`config/views.py`); Axios sends `X-CSRFToken` on mutating methods (`client.ts`); `CSRF_TRUSTED_ORIGINS` in `config/settings.py` |
| **Abuse-resistant auth & votes** | DRF `ScopedRateThrottle` on `register`, JWT `token` / `token/refresh`, and `vote` (`DEFAULT_THROTTLE_RATES` in `config/settings.py`; `accounts/views.py`, `features/views.py`) |

## Tech Stack

### Backend

- **Python 3** with **Django 5** and **Django REST Framework** for the HTTP API
- **PostgreSQL 16** (via Docker Compose) as the primary database, accessed with **psycopg 3**
- **djangorestframework-simplejwt** for JWT access and refresh tokens
- **django-cors-headers** for browser-based API access from the frontend origin
- **Custom user model** (`email` as a unique identifier) under an `accounts` app; `features` app for `Feature`, `Vote`, and denormalized vote counts

### Frontend

- **React 19** with **TypeScript** and **Vite 8**
- **React Router** for client-side routing and **TanStack Query** for server state, caching, and optimistic vote updates
- **Axios** for API calls (JWT in `Authorization`, CSRF where needed for unsafe methods)
- **Tailwind CSS v4** (Vite plugin), **lucide-react** for icons, and **date-fns** for relative timestamps
- **Progressive Web App** basics: `manifest.json`, theme color, and install-friendly metadata

### Infrastructure & tooling

- **Docker Compose** for a local **Postgres** service (named volume for data persistence)
- **ESLint** and **TypeScript** project references on the frontend; Django’s built-in checks and migrations on the backend

## Architecture & design decisions

### 1. Denormalized `vote_count` on `Feature`

Vote totals could be derived with `COUNT(*)` from the `Vote` table, but the product needs **fast list views sorted by popularity** (“Top” ordering). Aggregating on every list request does not scale as cleanly as reading a single indexed column on `Feature`. We therefore **increment `vote_count` in the same database transaction as inserting a `Vote`**, accepting a small amount of write complexity in exchange for **cheap, index-friendly sorts** (`ORDER BY vote_count`) and simpler serializers. The row-level vote record remains the source of truth for *who* voted; the counter is a performance-oriented projection.

### 2. JWT instead of session-only authentication

**Session cookies** fit a same-site browser app but couple the client tightly to cookie domains, CSRF flows, and server-side session storage. **JSON Web Tokens (access + refresh)** let any client attach credentials with `Authorization: Bearer …`, which maps naturally to **SPAs**, native shells, and a **future React Native (or other mobile) client** without redesigning auth around shared cookies. Session authentication remains available in Django for admin and optional browser flows, but the primary API contract for the voting UI is JWT-first.

### 3. Database constraint: one vote per user per feature

Duplicate votes are prevented in application code, but **concurrent requests** or bugs could still race. The `Vote` model defines a **`UniqueConstraint` on `(user, feature)`** so PostgreSQL **rejects a second row** for the same pair. The API maps that integrity error to a **400** response. That keeps the rule **enforceable at the database layer**, not only in Python.

### 4. Optimistic UI with TanStack Query

Voting should feel **instant** even on slower networks. The frontend uses **TanStack Query** (`useMutation` with **`onMutate`**) to **apply optimistic updates** to the cached feature list—incrementing `vote_count` and setting `has_voted`—**before** the POST completes, then **rolling back** from snapshotted cache on error and **reconciling** with the server payload on success. That pattern gives a snappy UX while staying consistent with the API as the final authority.

### 5. Paginated list + smaller list payloads

`GET /api/features/` uses **page-number pagination** (`FeaturePagination`, default page size 20) so response size stays bounded as the backlog grows. The **list serializer** truncates long descriptions for cards; **`GET /api/features/<id>/`** (retrieve) returns the **full** `FeatureDetailSerializer` body when clients need the entire text.

### 6. `has_voted`: annotation vs database

For **list** responses, `user_has_voted` is computed in **`get_queryset()`** with an `Exists` subquery—**trust that annotation only for instances returned from that queryset**. For **detail / create / vote** responses, **`FeatureDetailSerializer`** always resolves **`has_voted`** with a **`Vote.objects.filter(...).exists()`** lookup so long-lived or refreshed instances cannot serve a stale annotated value.

### 7. Vote writes and `vote_count` drift

All vote inserts that bump the counter go through **`features.services.record_vote`** so denormalization stays in one place. For rare drift (manual DB edits, future code paths), run **`python manage.py reconcile_vote_counts`** to realign `Feature.vote_count` with `COUNT` of `Vote` rows.

## Getting started

Compose in this repository runs **PostgreSQL only**. The Django API and Vite app still run on your machine (typical local development). Ensure **Docker Desktop** (or Docker Engine + Compose v2) and **Python 3.12+** and **Node.js 20+** are available.

### 1. Start the database with Docker Compose

From the repository root:

```bash
docker compose up -d
```

Wait until Postgres is healthy (Compose defines a `healthcheck` on the `db` service). To stop the database later:

```bash
docker compose down
```

Data is kept in the `postgres_data` Docker volume unless you remove it with `docker compose down -v`.

### 2. Run the Django backend

Open a terminal in `backend/`, create a virtual environment, install dependencies, apply migrations, and start the dev server on port **8000** (the Vite proxy expects this).

Set **`DJANGO_DEBUG`** to **`1`**, **`true`**, or **`yes`** after activating your venv for local development (Django debug pages, extra checks, and dev-only features such as `X-Dev-Mock-Auth`). If you omit it, **`DEBUG` defaults to off**—closer to production and safer if you forget to unset it before a demo deploy.

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
export DJANGO_DEBUG=true   # Windows PowerShell: $env:DJANGO_DEBUG = "true"
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

Default database settings match `docker-compose.yml` (`featurevote` / `featurevote` / `localhost:5432`). Override with environment variables if you changed them (see [Environment variables](#environment-variables)).

### 3. Run the Vite frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The app is served at **http://127.0.0.1:5173**. In development, `/api` is proxied to **http://127.0.0.1:8000**, so you usually do **not** need to set `VITE_API_BASE_URL`.

### 4. Smoke test

- Open **http://127.0.0.1:5173** — you should see the feature list (empty until you add data).
- Register a user, log in, submit a feature, and vote to confirm JWT and CSRF flows.

---

## Manual setup (without Docker)

Use this path if you already run PostgreSQL locally or prefer not to use Docker for the database.

### Backend (`backend/`)

1. Install **PostgreSQL 14+** and create a database and user (for example `featurevote` / `featurevote`, or your own names).
2. Create and activate a Python virtual environment, then:

   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. Export the [environment variables](#environment-variables) your database needs (`POSTGRES_*` or the defaults if they match your local DB). For typical local work, also set **`DJANGO_DEBUG=true`** (see table).
4. Run migrations and the server:

   ```bash
   python manage.py migrate
   python manage.py createsuperuser   # optional, for Django admin
   python manage.py runserver 127.0.0.1:8000
   ```

### Frontend (`frontend/`)

1. Install dependencies and start the dev server:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

2. **Production build** (API base defaults to `http://127.0.0.1:8000/api` when not in dev — set `VITE_API_BASE_URL` for real deployments):

   ```bash
   npm run build
   npm run preview
   ```

---

## Environment variables

Django does **not** read a single `DATABASE_URL` string; it uses discrete PostgreSQL settings (below). You can still set `DATABASE_URL` in your own tooling if you add a small adapter (e.g. `dj-database-url`) — that is not included in this repo.

### Backend (Django)

| Variable | Required | Default / notes |
|----------|----------|-----------------|
| `DJANGO_SECRET_KEY` | **Required** when `DJANGO_DEBUG` is off | Maps to Django’s `SECRET_KEY`. If unset while `DEBUG` is on, a committed **dev-only** default is used. If **`DEBUG` is off**, settings **fail fast** unless you set a **non-empty** secret that is **not** that default (staging/production). |
| `DJANGO_DEBUG` | No | If unset or any other value, `DEBUG` is **False**. Set to **`1`**, **`true`**, or **`yes`** (case-insensitive) to enable Django `DEBUG` for local development |
| `DJANGO_ALLOWED_HOSTS` | No | `localhost,127.0.0.1` (comma-separated) |
| `POSTGRES_DB` | No | `featurevote` |
| `POSTGRES_USER` | No | `featurevote` |
| `POSTGRES_PASSWORD` | No | `featurevote` |
| `POSTGRES_HOST` | No | `localhost` (use `127.0.0.1` or `db` if you later put Django in Compose on the same network) |
| `POSTGRES_PORT` | No | `5432` |
| `POSTGRES_CONNECT_TIMEOUT` | No | `5` (seconds) |

With **`DJANGO_DEBUG` disabled**, you must supply your own **`DJANGO_SECRET_KEY`** (for example a long random string from `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`). Otherwise Django raises **`ImproperlyConfigured`** at import time.

CORS and CSRF trusted origins for `http://localhost:5173` and `http://127.0.0.1:5173` are set in code; extend `config/settings.py` if you use another dev origin.

### Frontend (Vite)

| Variable | Required | Notes |
|----------|----------|--------|
| `VITE_API_BASE_URL` | No | In dev, unset uses `/api` (Vite proxy). For production builds, set to your API root (e.g. `https://api.example.com/api`) without a trailing slash |
| `VITE_USE_DEV_MOCK_AUTH` | No | Set to `0` or `false` to stop sending the `X-Dev-Mock-Auth` header in development (see backend mock auth) |

## Security & abuse prevention

- **`DJANGO_DEBUG`:** `DEBUG` is driven from the environment (see table above). With **`DEBUG` off**, Django does not expose debug tracebacks to clients, and settings **refuse to start** unless **`DJANGO_SECRET_KEY`** is set to a strong value other than the committed dev default.
- **`DevelopmentMockUserAuthentication`:** When **`DJANGO_DEBUG` is not enabled**, this class is **omitted** from `REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"]`, so the `X-Dev-Mock-Auth` shortcut **cannot run** in staging/production even if a client sends the header. When debug **is** on, it still only activates when the header is present (see `backend/config/authentication.py`).
- **API throttling:** Sensitive endpoints use DRF **`ScopedRateThrottle`** with limits defined in `config/settings.py` under **`REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]`**: registration (`register`), JWT obtain/refresh (`token_obtain`, `token_refresh`), and feature **vote** (`vote`). Other list/detail routes are not scoped-throttled by default; tighten globally with `AnonRateThrottle` / `UserRateThrottle` if your traffic profile requires it.

## Testing

### Backend (Django)

From the `backend/` directory, with your virtual environment activated and **PostgreSQL running** (same `POSTGRES_*` settings as normal development — Django creates a separate **test** database and drops it when the run finishes):

```bash
cd backend
export DJANGO_DEBUG=true   # or set DJANGO_SECRET_KEY to a non-default secret
python manage.py test
```

That uses Django’s built-in discovery (`unittest`-style tests in `tests.py` or `tests/` packages under each installed app). Run a single app, for example:

```bash
python manage.py test accounts features
```

There is no `pytest` configuration in this repository yet; add `pytest` + `pytest-django` if you prefer that runner.

To repair denormalized vote totals after manual DB edits, run:

```bash
python manage.py reconcile_vote_counts
```

### Frontend

There is **no `npm test` script** in `package.json` today. The checks you can run locally are:

```bash
cd frontend
npm run lint
```

`npm run build` also runs **`tsc -b`** (TypeScript project references) before Vite bundles the app, so it doubles as a **type-level** sanity check:

```bash
npm run build
```

To add unit or component tests, wire **Vitest** (or Jest) in `frontend/` and extend `package.json` with a `test` script; the README can then be updated with `npm test`.
