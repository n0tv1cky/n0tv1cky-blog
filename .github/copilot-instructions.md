# Copilot / AI Agent Instructions — n0tv1cky-blog

Short, actionable guide to be productive in this repo. Focus on what matters for making safe, correct edits.

1) Big-picture architecture
- Backend: `services/backend/app` — FastAPI service that treats Markdown files in `./blogs` as the source of truth and uses PostgreSQL as a metadata store (models: `models.py`, DB init: `database.py`). The app syncs .md frontmatter into the DB on startup (`main.py` -> `sync_blogs_from_filesystem`) and provides admin routes under `/api/admin`.
- Frontend: `services/frontend` — Next.js (app router) that fetches metadata and blog content from the backend via `src/lib/api.js`. Client code expects `NEXT_PUBLIC_BACKEND_URL` for runtime configuration but falls back to `http://localhost:8000` in dev.
- Storage: Markdown files live in the repository `blogs/` folder; images are stored under `blogs/images/` and are served by the backend via `StaticFiles` at `/images`.

2) Key patterns and why they matter
- Markdown-as-Source-of-Truth: Any content change should update `.md` files (not DB). The DB contains only metadata for fast queries. See `markdown_parser.py` and `blog_sync.py` for parsing and upsert logic.
- Filenames include timestamps and slug: `YYYYMMDD_HHMMSS_slug.md`. Many helpers rely on this to map slugs to filenames (see `routes/blogs.py` and `blog_sync.py`). Do not rename files without updating references and DB sync logic.
- Frontmatter controls publish status: `published: true/false` and `published_at` are respected by public endpoints. Admin endpoints can read/edit unpublished drafts.
- Image uploads: `uploads` API writes files to `blogs/images` with naming convention `YYYYMMDD_HHMMSS_slug_N.ext`. Frontend `MarkdownEditor.js` expects the upload response to return a usable image URL to insert into markdown.

3) Developer workflows & commands
- Backend local dev: from repo root run `pip install -r services/backend/requirements.txt` then `uvicorn app.main:app --reload --port 8000` inside `services/backend` (ensure `DATABASE_URL` or local Postgres available). The backend reads `./blogs` relative to its working directory.
- Frontend local dev: from `services/frontend` run `npm install` then `npm run dev` (Next default port 3000). Set `NEXT_PUBLIC_BACKEND_URL` in environment or rely on default `http://localhost:8000`.
- Docker Compose: `compose.dev.yaml` and `compose.prod.yaml` are present — use them if orchestrating Postgres + services. When running in Docker, the backend service name `backend` may be used as `BACKEND_URL` for server-side requests.
- Manual DB sync: POST `/api/admin/sync-blogs` will re-run sync without restarting. Use after pulling new markdown files.

4) Project-specific conventions
- Never store blog content in the DB — only metadata. If you add new DB fields, ensure `blog_sync.upsert_blog_metadata` includes them and that frontmatter parsing (`markdown_parser.py`) supports the field.
- Date handling: YAML frontmatter may parse datetimes to `datetime` objects. When returning JSON, code converts those to ISO strings (see `routes/blogs.py`). Preserve this behavior when changing serialization.
- Admin auth: simple token/password flow; frontend uses `localStorage` keys `admin_token` / `admin_refresh`. When modifying auth flows, update `services/frontend/src/lib/api.js` accordingly.
- Rate limits: Reactions/comments/uploads have rate limiting middleware (`ratelimit.py`) — prefer adjusting limits there rather than adding ad-hoc client-side checks.

5) Integration & cross-component touchpoints (search these files when making changes)
- `services/backend/app/markdown_parser.py` — parse frontmatter + content
- `services/backend/app/blog_sync.py` — reading .md files -> DB upserts
- `services/backend/app/routes/blogs.py` and `admin.py` — public vs admin behavior and security checks
- `services/backend/app/models.py` & `database.py` — DB schema and engine
- `services/frontend/src/lib/api.js` — how frontend calls backend, auth, retries, and `getBaseUrl()` logic
- `blogs/` — actual content and `blogs/images/` for assets
- `compose.dev.yaml` / `compose.prod.yaml` — docker networking and env expectations

6) Safe edit rules for AI agents
- When editing content: prefer updating `.md` files in `blogs/` and ensure `published` frontmatter is correct. Do not add content-only changes directly to DB models.
- When changing backend endpoints: run through `routes/blogs.py` and `admin.py` to preserve public/admin access rules (published filter, 404 behavior for unpublished content).
- When adding fields to frontmatter or DB: update `models.py`, `blog_sync.upsert_blog_metadata` (valid_fields set), and the frontend `api.js` if it consumes the field.
- When modifying image URLs or storage: update backend `StaticFiles` mounting (`main.py`) and frontend image domain config in `next.config.js`.
- Avoid changing filename conventions unless you update all mapping logic (`routes/blogs.py`, `blog_sync.py`, and any upload code).

7) Examples (copyable patterns)
- Parsing frontmatter: `parse_markdown_file(path)` in `services/backend/app/markdown_parser.py` returns `(frontmatter_dict, markdown_text)`.
- Syncing on startup: `main.py` calls `sync_blogs_from_filesystem()`; to trigger manually call `POST /api/admin/sync-blogs`.
- Client base URL logic: `services/frontend/src/lib/api.js:getBaseUrl()` — on server-side reads `BACKEND_URL`, on client-side uses `NEXT_PUBLIC_BACKEND_URL` or falls back to `http://localhost:8000`.

8) Useful development notes
- The backend's working directory matters: it expects `./blogs` relative to where the server runs. When running from repo root, ensure paths are correct or run from `services/backend`.
- Tests: repository has no automated tests. If you add tests, place backend tests under `services/backend/tests` and run with `pytest` after adding `pytest` to `requirements.txt`.

If anything here is unclear or you want more detail on a specific area (Docker setup, auth flow, or the publish workflow), tell me which section to expand and I will iterate.

---

Additional quick-reference (endpoints, Docker, frontmatter checklist)

1) Exact endpoint payload examples
- Create blog (admin POST `/api/admin/blogs`):

	```json
	{
		"title": "My New Post",
		"slug": "my-new-post",
		"description": "Short summary",
		"published": false,
		"published_at": "2025-12-27T12:00:00Z",
		"created_at": "2025-12-27T12:00:00Z",
		"updated_at": "2025-12-27T12:00:00Z",
		"reading_time": 4,
		"tags": ["dev", "python"],
		"category": "engineering",
		"content": "# Markdown body here..."
	}
	```

- Update blog (admin PUT `/api/admin/blogs/{slug}`): same body as create; backend will overwrite the file identified by the slug's filename and sync metadata.

- Publish toggle (admin PATCH `/api/admin/blogs/{slug}/publish`):

	```json
	{ "published": true, "published_at": "2025-12-27T12:00:00Z" }
	```

- Image upload (admin POST `/api/uploads/image`): multipart/form-data with `file` and optional `blog_slug`. Response returns JSON `{ "image_url": "/images/<filename>" }`.

2) Admin auth flow (how the pieces fit)
- Login: frontend calls `POST /api/admin/auth` with `{ password }`. Successful response includes `access_token` and `refresh_token` which the frontend stores in `localStorage` as `admin_token` and `admin_refresh` (see `services/frontend/src/lib/api.js:login`).
- Protected admin endpoints check `Authorization: Bearer <token>` or `X-ADMIN-PASSWORD` header. The frontend `authFetch()` helper attaches tokens and will attempt a refresh via `POST /api/admin/auth/refresh` if a `401` is returned.
- Refresh: `POST /api/admin/auth/refresh` with `{ refresh_token }` returns a new `access_token`. If refresh fails, frontend logs out (removes tokens).
- When changing auth implementation: update both `services/backend/app/routes/admin.py` and `services/frontend/src/lib/api.js` (especially `authFetch`, `login`, `refreshToken` functions).

3) Docker Compose quick runs & environment
- Common dev steps (from repo root):

	```bash
	# build and run services (Postgres + backend + frontend)
	docker compose -f compose.dev.yaml up --build

	# bring down
	docker compose -f compose.dev.yaml down
	```

- Notes:
	- When running in Docker, `BACKEND_URL` used server-side can be `http://backend:8000` (service name). Client-side must use an externally routable URL or `localhost` mapping.
	- The backend expects `./blogs` relative to its working dir inside the container (compose dev mounts the repo into the container).

4) `.env.dev` template (place at repo root for local testing)

	```ini
	# Development env example
	DOMAIN_NAME=localhost:3000
	DATABASE_URL=postgresql://bloguser:blogpass@postgres:5432/blogdb
	POSTGRES_USER=bloguser
	POSTGRES_PASSWORD=blogpass
	POSTGRES_DB=blogdb
	BACKEND_URL=http://backend:8000
	NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
	FRONTEND_URL=http://localhost:3000
	NODE_ENV=development
	ADMIN_PASSWORD=admin123
	CORS_ORIGINS=http://localhost:3000
	```

5) Checklist: adding a new frontmatter field
- Goal: add a new metadata field (e.g., `reading_level`) that appears in DB and is exposed to frontend.

	1. Add field to DB model: update `services/backend/app/models.py` (`Blog` model) with a new Column (choose appropriate SQLAlchemy type).
	2. Allow the field during upsert: add the field name to `valid_fields` in `services/backend/app/blog_sync.py:upsert_blog_metadata` so frontmatter gets written to DB.
	3. Ensure parser supports the value type: frontmatter is parsed by `services/backend/app/markdown_parser.py` using PyYAML — for custom types convert or validate in `blog_sync.py` before DB write.
	4. Update admin APIs/schemas: if admin endpoints validate payloads, update `services/backend/app/schemas.py` and any route payloads that accept blog bodies (e.g., `routes/admin.py`).
	5. Update frontend consumption: if the field is needed by the UI, update `services/frontend/src/lib/api.js` usage or data mapping and any components that render the field (e.g., `BlogViewer.js`, `AdminDashboard.js`).
	6. Migration: since the repo doesn't include migrations, create and run an SQL migration (or use a temp script) to ALTER the table in your dev DB. Update docs/README with the change.
	7. Add tests / manual verification: create a sample `.md` with the new frontmatter key, run `POST /api/admin/sync-blogs` and verify the DB contains the new column populated.

If you'd like, I can also add a small helper script or SQL migration example for step 6.
