# VK Browser — Pure Web Edition

A responsive React + Vite + FastAPI browser/search interface.

## Important architecture

This edition deliberately does NOT use Electron and does NOT use iframes for arbitrary websites.

A normal website cannot embed every external website because many sites intentionally block framing with X-Frame-Options/CSP. Therefore the address bar uses the most compatible web behavior:

- `github.com` -> `https://github.com`
- `https://youtube.com` -> opens the real YouTube site
- `www.google.com` -> opens the real Google site
- Search terms -> FastAPI search endpoint
- Clicking a result -> opens the real destination
- DuckDuckGo redirect URLs are decoded before navigation

The VK Browser application UI remains the home/search/bookmark/history interface. Once an arbitrary external site is opened, the browser follows normal browser navigation. A pure React page cannot remain around an arbitrary external site and simultaneously behave like Chrome/Brave without an embedded browser engine.

## Requirements

- Node.js 18+
- Python 3.10+
- npm
- Optional MongoDB

## Run backend — Windows PowerShell

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

If PowerShell blocks activation:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

## Run frontend

Open another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## Optional MongoDB

Copy:

```text
backend/.env.example
```

to:

```text
backend/.env
```

and set:

```text
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=vk_browser
```

The app still works without MongoDB using memory storage.

## URL behavior

Examples:

```text
github.com
https://github.com
www.youtube.com
https://www.wikipedia.org
```

All are normalized to HTTPS and opened as real browser destinations.

Search examples:

```text
python tutorial
best laptops
React documentation
GitHub
YouTube
```

## Why this is not an iframe browser

An iframe cannot guarantee access to all websites. YouTube, Google, GitHub, banking sites, authentication pages, sites with strict CSP, DRM, WebSockets, service workers, and many other modern applications may refuse framing.

A backend reverse proxy also cannot honestly guarantee every modern site because rewriting cookies, JavaScript, CSP, WebSockets, authentication, relative URLs, streaming, downloads, DRM and anti-bot systems is complex and often prohibited.

If the requirement is specifically "keep VK's UI visible while every arbitrary website renders inside it like Chrome", a native browser engine is required. Since this edition is explicitly no-Electron, it uses direct navigation instead.
