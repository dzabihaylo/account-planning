# Technology Stack

**Analysis Date:** 2026-04-10

## Languages

**Primary:**
- JavaScript (ES6+) - All source code and build targets
  - Server runtime: `server.js`
  - Frontend: `index.html` (inline JavaScript)

## Runtime

**Environment:**
- Node.js >= 16 (per `package.json` engines field)
- Single-file server deployment using Node.js built-in modules only

**Package Manager:**
- npm (no dependencies installed)
- `package.json` exists but contains no external dependencies
- Lockfile: Not used (no npm packages)

## Frameworks

**Core:**
- No framework dependencies - pure Node.js HTTP server using built-in `http` and `https` modules

**Frontend:**
- Vanilla HTML/CSS/JavaScript - Single-page application in `index.html`
- Chart.js 4.4.1 - For data visualization, loaded from CDN (cdnjs.cloudflare.com)
- Google Fonts (DM Sans, DM Mono) - Loaded from fonts.googleapis.com

**Testing:**
- None detected

**Build/Dev:**
- None - No build step required

## Key Dependencies

**External Libraries:**
- Chart.js 4.4.1 (via CDN) - JavaScript charting library for data visualization in account panels
- Google Fonts API - DM Sans and DM Mono typefaces

**Built-in Node.js Modules Used:**
- `http` - HTTP server creation and request handling
- `https` - HTTPS proxy to Anthropic API
- `fs` - File system operations (reading `index.html`)
- `path` - Path manipulation for file serving
- `url` - URL parsing for routing

## Configuration

**Environment:**
Three environment variables required (no `.env` file - variables set in hosting platform or shell):

| Variable | Purpose | Required |
|---|---|---|
| `ANTHROPIC_API_KEY` | API authentication to Anthropic Claude API | Yes |
| `APP_PASSWORD` | Password for basic auth to the web UI | Yes |
| `PORT` | HTTP server port (Railway auto-assigns, defaults to 3000) | No (default: 3000) |

**Build:**
- No build configuration - Direct Node.js execution via `node server.js`
- Railway deployment: `railway.toml` specifies Nixpacks builder and start command

## Platform Requirements

**Development:**
- Node.js 16+ installed locally
- Internet access for Google Fonts and Chart.js CDN (cdnjs.cloudflare.com, fonts.googleapis.com)
- Anthropic API key from https://console.anthropic.com

**Production:**
- Hosted on Railway (railway.app)
- Linked to GitHub repo: `dzabihaylo/account-planning`
- Auto-deploys on push to main branch
- Railway provides `PORT` environment variable automatically

## Summary

This is a minimal-dependency Node.js application (zero npm packages). The server is ~191 lines of pure Node.js using only built-in modules. The frontend is a self-contained HTML file (~108KB) with inline CSS and JavaScript. External assets (Chart.js, Google Fonts) are loaded from CDN. The application is designed for simplicity and zero-friction deployment.

---

*Stack analysis: 2026-04-10*
