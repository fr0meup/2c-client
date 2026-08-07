# 2c-client

A third-party web client for [twocents.money](https://twocents.money) — a social platform where your net worth is your identity.

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-8-purple?logo=vite)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4-blue?logo=tailwindcss)

---

## Overview

Everything you can do on [twocents.money](https://twocents.money) you can do here too — feeds, posts, comments, voting, profiles, messaging, notifications, leaderboards, bookmarks, the works. (Except for transactions — that page just says "coming soon" lol).

On top of the standard feature set, **2c-client** adds a massive list of power-user features, privacy tools, media enhancements, group messaging workarounds, and performance polish that the official client doesn't offer.

---

## ⚡ Features

### 🔍 Advanced Search & Parallel Filtering
- **Deep Client-Side Filtering**: Filter posts by date range, net worth range, age range, gender, verified status, custom location/city, content type (text, image, video, poll, link, transaction, budget, picks), minimum upvote count, comment count, or specific author UUID.
- **Parallel Bulk Date Fetching**: Uses Web Workers and parallel API requests to rapidly scrape and filter large post volumes client-side beyond standard server query limits.
- **IndexedDB & Session Search Cache**: Persistent background caching of search results for instant cache hits and fast reloading.
- **Search History**: Saves recent search queries to `localStorage` with quick 1-click re-search and clearing options.

### 💬 Group Chats & Messaging
- **Custom Group Chat Rooms**: Full group chat room support built on top of the DM framework with live WebSocket messaging.
- **Group Invite Links & Web Snippets**: Generate 1-click direct room invite links for `2c-client` users, plus automated browser console scripts for friends on official `twocents.money` to auto-join.
- **Room Management**: View member lists, manage room metadata, and leave group chats cleanly.
- **@Mention Autocomplete Picker**: Dynamic user tag menu pops up while typing messages in DMs or rooms.
- **Mention Notifications**: Automatic DM notifications with custom deep links that jump directly to the target post or comment context.

### 🛡️ Privacy & Obfuscation
- **Zero-Width Joiner (ZWJ) Obfuscation**: Toggle ZWJ text injection in the post composer to scramble post text for AI autodetection tools, scrapers, and copy-paste indexers while leaving it readable to humans.
- **Ghost Mode / Appear Offline**: Toggle an offline flag in `localStorage` to block login telemetry pings and browse completely invisibly.
- **Clean Text Processing**: Preserves exact multi-line spacing while automatically stripping rich HTML formatting on paste.

### 🎨 Custom GIFs & Media Support
- **Custom GIF Picker & Favorites**: Integrated GIF search, custom URL saver, and persistent favorite list stored in local storage.
- **GIFs Everywhere**: Full inline GIF rendering in feed posts, comments, group rooms, and DMs with mass upload support and cross-client compatibility.
- **Textless GIFs**: Post or send standalone GIFs without needing mandatory body text.
- **Client-Side Media Compression**: Automatic client-side image and video compression prior to upload for faster posting and bandwidth savings.
- **Custom Video Player**: Full-featured HTML5 video player with custom play/pause, mute toggles, progress bar, time display, and fullscreen controls.
- **Image Lightbox**: Full-screen image viewer modal with smooth zoom and pan controls.

### 👤 Profile & Account Extras
- **Custom Location Picker**: Override fixed city presets — click `+` in profile settings to set any location string you want.
- **Full Block List Manager**: Dedicated interface to inspect and unblock users with 1-click (a feature missing in the official web app).

### 💾 Post Drafts & Data Backups
- **Post Drafts System**: Auto-saves post drafts to local storage with a dedicated draft manager modal to resume, edit, or clear saved drafts.
- **1-Click Data Export / Import**: Complete JSON backup and restore for all local data (drafts, saved GIFs, favorite GIFs, search history, settings). Zero vendor lock-in and seamless cross-device sync.

### 🎴 Rich Post Cards & Threaded Comments
- **All 9 Content Types**: Full native rendering and interactive controls for Text, Image, Video, Polls (interactive voting & live percentage bars), Links (rich OpenGraph cards), Quote Posts (nested original post previews), Budgets, Transactions, Likert Scales, and Picks.
- **Comment Sorting & Deep Linking**: Sort comments by top/best (upvotes with date tiebreaker) or newest, with deep-linking support from profile activity directly into specific comment locations.

### 🚀 UX & Performance Polish
- **Onboarding Tutorial**: Interactive step-by-step walkthrough for new users explaining key client features and data backup warnings.
- **Custom Topics & Topic Pinning**: Create custom sub-feed topics and pin favorite topics directly to the header navigation bar for instant access.
- **Smart Route Preloading**: Pre-fetches lazy route assets on hover/intent to eliminate navigation delays and white flashes.
- **Robust Scroll Position Restoration**: Multi-frame scroll restoration engine that reliably remembers exact scroll positions when navigating between feeds, post details, and user profiles.
- **Responsive Layout**: Mobile bottom navigation bar (`BottomNav`) combined with a desktop sidebar layout.

---

## ⚠️ EXPORT YOUR DATA

**This is not a backend. There is no cloud sync. Everything — your drafts, saved GIFs, favorites, search history, settings — lives in your browser's local storage and IndexedDB.** If you clear your browser data, switch devices, or reinstall, it's all gone.

Go to **Settings → Export data** and save the backup JSON. You can import it anywhere and pick up right where you left off. **Do this regularly.** The app will remind you when you log out, but don't rely on that.

---

## Made by AI

This entire repo was built by Claude (Anthropic). I have not double checked a single line of code. The repo is a bit of a mess but who cares. Long live Claude.

---

## Tech Stack

- **React 19** + **TypeScript**
- **Vite 8** — dev server & build
- **TailwindCSS 4** — styling
- **React Query** — data fetching, caching, optimistic updates
- **React Router 7** — client-side routing
- **WebSocket** — real-time messaging
- **IndexedDB** — persistent client-side search cache & data storage

---

## Getting Started

You need [Node.js](https://nodejs.org/) installed (v18+). npm comes with it.

- **Windows** — download the installer from [nodejs.org](https://nodejs.org/)
- **Mac** — `brew install node` (or use the installer)
- **Linux** — `sudo apt install nodejs npm` (Debian/Ubuntu) or `sudo pacman -S nodejs npm` (Arch)

```bash
# clone the repo
git clone https://github.com/fr0meup/2c-client.git
cd 2c-client

# install dependencies
npm install

# start the app — this is all you need
npm run dev
```

This opens the app at `http://localhost:5173`. That's it, you're done.

If you want to deploy it somewhere (Netlify, Vercel, etc.), you can build a production bundle with `npm run build` — but for normal use, `npm run dev` is all you need.

---

## Project Structure

```
src/
  components/    # UI components grouped by feature (search, gifs, messaging, leaderboard, etc.)
  hooks/         # React Query hooks & custom logic (feed, rooms, follow, votes, block)
  layouts/       # App shell, header, sidebar, navigation
  lib/           # API client, auth, IndexedDB cache, media compressor, types, utilities
  pages/         # Route-level page views
```

---

## API

Connects to the twocents.money JSON-RPC 2.0 API at `https://api.twocents.money/prod`. Auth via Bearer token. Image uploads proxied through Vite dev server to S3.

---

## Disclaimer

This is an **unofficial** third-party client. Not affiliated with or endorsed by twocents.money.
