# Extra Implementations (beyond README)

This file lists all the additional features, improvements, and changes that were implemented on top of the original README plan for the project. Use this as a quick reference for what was added during development.

---

## Backend

- Added JWT-based authentication helpers (`services/backend/app/auth.py`):
  - `create_access_token(data, expires_delta)` — issues HS256 access tokens.
  - `create_refresh_token(data, expires_delta)` — issues refresh tokens with a `typ: refresh` claim and configurable expiry.
  - `verify_token(token)` — decodes and validates tokens.

- Extended admin auth endpoints (`services/backend/app/routes/admin.py`):
  - `POST /api/admin/auth` now returns `{ access_token, refresh_token, token_type }` after successful password login.
  - `POST /api/admin/auth/refresh` accepts a `refresh_token` and returns a new `access_token` (stateless refresh flow).
  - `require_admin()` updated to accept either `X-ADMIN-PASSWORD`, a static `ADMIN_TOKEN` bearer token, or a verified JWT bearer token.

- Image upload improvements (`services/backend/app/routes/uploads.py`):
  - Enforced `MAX_UPLOAD_SIZE` server-side (configurable via env).
  - MIME-type checks and safer filename handling.

- Auto-sync after writes:
  - Calls to create/update blog files trigger `sync_blogs_from_filesystem()` to keep the DB index in sync with markdown source files.

## Frontend

- Auth helpers (`services/frontend/src/lib/api.js`):
  - `login(password)` stores both `admin_token` and `admin_refresh` in `localStorage` when returned by the backend.
  - `refreshToken()` exchanges stored `admin_refresh` for a new `admin_token` using `/api/admin/auth/refresh`.
  - `authFetch(url, opts)` wrapper automatically attaches the stored `Authorization: Bearer <token>` header (and `X-ADMIN-PASSWORD` if provided), and will attempt a single refresh+retry when a request returns `401`.
  - `logout()` to clear stored tokens.
  - Rewired `createBlog`, `updateBlog`, and `uploadImage` to use `authFetch()` so admin flows transparently refresh tokens if necessary.

- Admin login UI and flow:
  - `LoginForm` component (`services/frontend/src/components/LoginForm.js`) and `/admin/login` page (`services/frontend/src/app/admin/login/page.js`) to authenticate and store tokens client-side.
  - `AdminDashboard` updated to show `Log in` when unauthenticated and `Create New Blog` + `Log out` when authenticated.

- Image upload UX:
  - Client-side size checks and XHR upload progress UI in `ImageUploader` (already present) — can be wired to use `authFetch`/Authorization header for uploads.

## Devops / Docker / Compose

- Docker Compose and env enhancements:
  - Compose files updated to expose frontend `NEXT_PUBLIC_*` environment variables (`NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_MAX_UPLOAD_SIZE`, `NEXT_PUBLIC_ADMIN_TOKEN`), and environment-driven container names.
  - `.env.dev` / `.env.prod` templates were extended with `ADMIN_TOKEN`, `MAX_UPLOAD_SIZE`, and `JWT_SECRET` options.

## Minor Fixes and Improvements

- Fixed frontend container `next: not found` build/dev issue by adjusting volume handling (avoid hiding build-time node_modules in dev volumes).
- Fixed a broken `BlogViewer` client component and other small UI import issues.
- Added sample markdown content for local development (`blogs/20251226_120000_sample-post.md`).

## Security & Notes

- The refresh flow implemented is stateless (JWT refresh tokens are not persisted server-side). For production, consider:
  - Storing refresh tokens server-side (allowing revocation) or using rotating refresh tokens.
  - Issuing refresh tokens as HttpOnly, Secure cookies instead of `localStorage` to mitigate XSS.
  - Rate limiting, IP checks, and monitoring for auth endpoints.

## Pending / Recommended Next Steps

- Wire the `authFetch()` semantics into the `ImageUploader` XHR flow so uploads use the Authorization header and will refresh if needed.
- Add proactive token refresh before expiry by parsing the `exp` claim on the client and refreshing if near expiry.
- Implement refresh token revocation (server-side store) to support logout across multiple devices.
- Replace client `localStorage` storage with HttpOnly cookie-based refresh flow for improved security.

---

If you want, I can also:
- Patch `ImageUploader` to include Authorization header and attempt a refresh before starting uploads.
- Add a small admin UI indicator showing token expiry and automatic background refresh.
- Migrate refresh token storage to HttpOnly cookies (requires backend and compose changes).

Request the next action and I'll apply it.