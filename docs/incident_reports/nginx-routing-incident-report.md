# Incident Report: Mixed Content Error on Blog Platform

## Overview
This report documents the troubleshooting and resolution of a "Mixed Content" error encountered on the production blog platform (https://n0tv1cky.com). The error occurred when the HTTPS-secured frontend attempted to fetch API resources over HTTP, violating browser security policies. This incident involved multiple layers of the stack (frontend, backend, nginx proxy, and Docker deployment) and required iterative fixes across several days.

The report is structured chronologically, detailing problems identified, root causes, and solutions implemented. It serves as an educational resource for junior developers on debugging production issues in a full-stack application.

## Background
- **Application Stack**: Next.js frontend, FastAPI backend, PostgreSQL database, nginx reverse proxy, Docker Compose for deployment.
- **Deployment**: Frontend and backend served behind nginx with TLS termination. API endpoints proxied from `/api/*` to the backend container.
- **Initial Symptom**: Users reported that the blog list page (`/blogs`) failed to load, showing a blank page. Browser console showed:  
  ```
  Mixed Content: The page at 'https://n0tv1cky.com/blogs' was loaded over HTTPS, but requested an insecure resource 'http://n0tv1cky.com/api/blogs/'. This request has been blocked; the content must be served over HTTPS.
  ```

## Timeline of Events

### Day 1: Initial Investigation
- **Problem Identified**: Mixed content error blocking API requests from HTTPS page to HTTP URLs.
- **Initial Analysis**:
  - Frontend code was constructing absolute HTTP URLs instead of relative paths.
  - `getBaseUrl()` function in `services/frontend/src/lib/api.js` was returning `http://localhost:8000` in production due to fallback logic.
  - Components like `LandingPage.js`, `MarkdownEditor.js`, etc., had ad-hoc URL construction that bypassed centralized logic.
- **Steps Taken**:
  1. Centralized URL logic in `getBaseUrl()` to prefer relative paths for same-origin requests.
  2. Updated `getBaseUrl()` to detect production domains and return empty string (relative URLs).
  3. Modified frontend components (`LandingPage.js`, `MarkdownEditor.js`, `BlogViewer.js`, `CommentSection.js`, `ReactionButtons.js`, `ImageUploader.js`) to use `getBaseUrl()` instead of hardcoded logic.
  4. Added debug logging to `getBaseUrl()` and `fetchBlogs()` for troubleshooting.
- **Outcome**: Frontend now constructs `/api/blogs` (relative), but backend was still redirecting to HTTP URLs.

### Day 2: Backend Redirect Issues
- **Problem Identified**: Backend returning 307 Temporary Redirect with `Location: http://n0tv1cky.com/api/blogs/`, causing browser to attempt HTTP fetch.
- **Root Cause**:
  - FastAPI's `redirect_slashes=True` was redirecting `/api/blogs` to `/api/blogs/` using the request's scheme (HTTP from nginx proxy).
  - Backend routes were defined without trailing slashes, but `redirect_slashes` expected them.
  - Nginx proxy sends HTTP requests to backend, so redirects used HTTP in Location header.
- **Steps Taken**:
  1. Updated backend routes in `routes/blogs.py`, `routes/comments.py`, etc., to use trailing slashes (e.g., `/blogs/` instead of `/blogs`).
  2. Changed router prefixes in `main.py` from `/api/blogs` to `/api` for consistency.
  3. Added proxy scheme middleware in `main.py` to set `request.scope['scheme'] = 'https'` when `X-Forwarded-Proto: https` is present.
  4. Removed `HTTPSRedirectMiddleware` as it caused redirect loops behind the proxy.
- **Outcome**: Redirects now use `https://` in Location header, allowing browser to follow securely.

### Day 3: Deployment and Caching Issues
- **Problem Identified**: Changes not reflecting in production due to cached Docker images and browser cache.
- **Root Cause**:
  - Docker Compose was not rebuilding images, using old code.
  - Browser cached JavaScript bundles with old URL logic.
  - `NEXT_PUBLIC_BACKEND_URL` was set in `compose.prod.yaml`, baking HTTP URLs into frontend build.
- **Steps Taken**:
  1. Removed `NEXT_PUBLIC_BACKEND_URL` from `compose.prod.yaml` to prevent exposing internal URLs.
  2. Updated `.env.prod` and `README.md` with production environment guidance.
  3. Forced Docker image rebuilds with `--build` flag.
  4. Advised hard browser refresh (Ctrl+F5) to clear cache.
- **Outcome**: Fresh builds deployed, browser cache cleared, issue resolved.

## Detailed Problems and Solutions

### Problem 1: Inconsistent URL Construction in Frontend
**Description**: Frontend components used different methods to build API URLs, leading to HTTP requests from HTTPS pages.
**Root Cause**: Lack of centralized URL logic; fallback to `http://localhost:8000` in production.
**Solution**:
- Modified `getBaseUrl()` in `api.js` to return `''` (relative) for production domains.
- Updated all components to import and use `getBaseUrl()`.
- Added logic to upgrade HTTP to HTTPS if page is secure.
**Files Changed**: `services/frontend/src/lib/api.js`, multiple component files.
**Lessons**: Always centralize URL construction; test with production domains.

### Problem 2: Backend Redirects Using HTTP Scheme
**Description**: FastAPI redirected requests with `Location: http://...`, blocked by browser.
**Root Cause**: `redirect_slashes=True` used request scheme (HTTP from proxy); no scheme correction for proxies.
**Solution**:
- Added middleware to set request scheme based on `X-Forwarded-Proto`.
- Ensured routes use trailing slashes to match redirects.
**Files Changed**: `services/backend/app/main.py`, route files.
**Lessons**: Handle proxy headers correctly; test redirects in proxy setups.

### Problem 3: Route Prefix and Path Mismatches
**Description**: Router prefixes were inconsistent, causing 404s or incorrect redirects.
**Root Cause**: Mixed use of `/api` and `/api/blogs` prefixes; routes without trailing slashes.
**Solution**:
- Standardized prefixes to `/api`.
- Updated routes to `/blogs/`, `/blogs/{slug}/`, etc.
**Files Changed**: `main.py`, `routes/*.py`.
**Lessons**: Consistent API design; handle trailing slashes explicitly.

### Problem 4: Deployment Cache Issues
**Description**: Changes not applied due to Docker and browser caching.
**Root Cause**: Old images not rebuilt; env vars baked into builds.
**Solution**:
- Removed problematic env vars from Compose.
- Used `--build` for deployments.
- Documented cache-clearing steps.
**Files Changed**: `compose.prod.yaml`, `README.md`.
**Lessons**: Force rebuilds in CI/CD; document env var handling.

## Lessons Learned
1. **Centralize Logic**: URL construction, error handling, and configuration should be in one place to avoid inconsistencies.
2. **Test with Production Setup**: Use staging environments that mimic production (nginx proxy, TLS).
3. **Handle Proxies Correctly**: Always account for `X-Forwarded-Proto` and other proxy headers in backend middleware.
4. **Version Control and Documentation**: Keep detailed notes on changes; update README with production guidance.
5. **Debugging Tools**: Use browser dev tools, curl with `-v`, and Docker logs extensively.
6. **Incremental Fixes**: Test each change in isolation before deploying.

## Conclusion
The incident was resolved through systematic debugging, identifying root causes at each layer (frontend URL logic, backend redirects, proxy handling, and deployment). Total fixes involved 15+ file changes across frontend, backend, and config files. The platform now correctly serves secure API requests without mixed content errors.

For juniors: Always start with the browser console, trace requests through the stack, and verify changes with fresh builds. Production issues often reveal gaps in development testing.</content>
<parameter name="filePath">/home/n0tv1cky/n0tv1cky-blog/docs/incident-report.md