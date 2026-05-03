# 2c-client

A third-party web client for [twocents.money](https://twocents.money) — a social platform where your net worth is your identity.

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-8-purple?logo=vite)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4-blue?logo=tailwindcss)

## Features

Everything you can do on [twocents.money](https://twocents.money) you can do here too — feed, posts, comments, voting, profiles, messaging, notifications, leaderboard, bookmarks, the works. Except for transactions (that page just says "coming soon" lol).

On top of that, a couple extras:

- **Advanced Search** — filter posts by date range, net worth, age, gender, verified status, location, content type, vote count, comment count, and specific author UUID. Server only handles cursor/date/topic/search query — everything else is filtered client-side with bulk date fetching via web workers for speed.
- **ZWJ Obfuscation** — posts are injected with zero-width joiners so AI autodetection tools can't flag or match the text. Copy-paste proof.
- **Drafts** — save post drafts locally and pick up where you left off.
- **Video Support** — inline video player with custom controls (play/pause, mute, progress bar, fullscreen).
- **Custom GIFs** — save, favorite, and paste your own GIF URLs. They persist in localStorage and can be inserted into comments and messages.
- **Block List** — actually see who you've blocked and unblock them from a proper list. The official app doesn't have this.
- **Appear Offline** — toggle an offline key in localStorage so the login ping doesn't fire. Ghost mode.
- **Export / Import Data** — one-click backup of all your local data (drafts, saved GIFs, favorites, settings) to a JSON file. Import it on another device or after a wipe and you're right back where you were.
- **Fresh Design** — completely rebuilt UI. Looks better. That's it.

## ⚠️ EXPORT YOUR DATA

**This is not a backend. There is no cloud sync. Everything — your drafts, saved GIFs, favorites, emoji recents, preferences — lives in your browser's local storage and IndexedDB.** If you clear your browser data, switch devices, or reinstall, it's all gone.

Go to **Settings → Export data** and save the backup JSON. You can import it anywhere and pick up right where you left off. **Do this regularly.** The app will remind you when you log out, but don't rely on that.

## Made by AI

This entire repo was built by Claude (Anthropic). I have not double checked a single line of code. The repo is a bit of a mess but who cares. Long live Claude.

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** — dev server & build
- **TailwindCSS 4** — styling
- **React Query** — data fetching, caching, optimistic updates
- **React Router 7** — client-side routing
- **WebSocket** — real-time messaging

## Getting Started

You need [Node.js](https://nodejs.org/) installed (v18+). npm comes with it.

- **Windows** — download the installer from [nodejs.org](https://nodejs.org/)
- **Mac** — `brew install node` (or use the installer)
- **Linux** — `sudo apt install nodejs npm` (Debian/Ubuntu) or `sudo pacman -S nodejs npm` (Arch)

```bash
# install dependencies
npm install

# start dev server
npm run dev

# type check
npx tsc --noEmit

# build for production
npm run build
```

## Project Structure

```
src/
  components/    # UI components grouped by feature
  hooks/         # React Query hooks (data fetching & mutations)
  layouts/       # App shell, header, sidebar
  lib/           # API client, auth, types, utilities
  pages/         # Route-level page components
```

## API

Connects to the twocents.money JSON-RPC 2.0 API at `https://api.twocents.money/prod`. Auth via Bearer token. Image uploads proxied through Vite dev server to S3.

## Disclaimer

This is an **unofficial** third-party client. Not affiliated with or endorsed by twocents.money.
