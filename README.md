# My Records — Offline CRUD PWA

A mobile-first, installable CRUD (Create, Read, Update, Delete) app designed to feel like a native Android app. It is a static website and works with GitHub Pages.

## Features
- Create, view, edit, complete/reopen, search, filter, sort and delete records.
- Each record has a name, category, status, date and notes/details.
- Local-first storage using the browser's `localStorage`; no account, server, database or API required.
- Installable PWA with app icon and standalone display.
- Offline app shell through a service worker (after the first successful online load).
- Light and dark themes.
- JSON backup export and import.
- Responsive mobile layout, safe-area spacing, modal forms and toast feedback.

## Publish on GitHub Pages
1. Extract the ZIP.
2. Create a GitHub repository (for example `my-records-pwa`).
3. Upload **the contents** of this folder to the repository root. `index.html` should be at the root, not inside an extra nested folder.
4. Open **Settings → Pages**.
5. Under Build and deployment, select **Deploy from a branch**, choose `main` and `/(root)`, then Save.
6. Wait for GitHub Pages to publish your site. Open the Pages URL on your Android phone using Chrome.
7. Open the browser menu and tap **Install app** or **Add to Home screen**. Wording varies by Android/browser.

GitHub Pages uses HTTPS, which is required for service workers and PWA installation.

## Local data and important limitations
- Records are saved in local storage for the specific browser profile and website origin. They do **not** sync between devices, browsers or browser profiles.
- Clearing browser/site data may delete records. Use **Data tools → Export backup** regularly. Import the JSON backup on another device to copy records.
- The app does not send record content to a server. The optional Google Fonts import in `styles.css` is only for typography; the app still functions offline using system fonts if the font service is unavailable.
- A service worker caches the app files after the first successful load. Load the site once while online before relying on offline use.
- If you publish under a project URL such as `https://username.github.io/my-records-pwa/`, the relative asset paths are set up for that layout.
- This is a generic record manager. The fields can be adapted to tasks, contacts, inventory, expenses or another record type.

## Updating the app
Edit `index.html`, `styles.css` or `app.js`, commit the changes, and wait for GitHub Pages to redeploy. If a user's browser continues to show an old version, close and reopen the installed app or clear the site's cached files. For future releases, update `CACHE_NAME` in `sw.js` (for example, `my-records-pwa-v2`) to force a fresh app-shell cache.

## Data schema
Each record resembles:
```json
{
  "id": "unique-id",
  "name": "Example record",
  "category": "Personal",
  "status": "active",
  "date": "2026-10-15",
  "description": "Optional notes",
  "createdAt": 1792051200000,
  "updatedAt": 1792051200000
}
```
