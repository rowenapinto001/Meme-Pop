# MemePop

MemePop is a cute, privacy-friendly Chrome extension that brings animated meme reactions, focus nudges, break reminders, streaks, and Meme Coins directly into your browser. It runs locally with no backend, no login, and no data collection.

## Demo

[![Watch the MemePop demo video](meme-pop/assets/demo/memepop-thumbnail.png)](meme-pop/assets/demo/memepop-demo.mp4)

[Watch the demo video](meme-pop/assets/demo/memepop-demo.mp4)

## What It Does

MemePop adds a playful browser companion that can pop up on webpages with jokes, motivational messages, focus reminders, hydration breaks, deadline nudges, and themed animations. Users can choose modes, set custom timings, earn Meme Coins, track streaks, unlock visual styles, and create Meme Moment PNGs.

## Highlights

- Chrome Extension Manifest V3
- TypeScript, HTML, CSS, and JavaScript
- Side panel dashboard with settings, coins, streaks, and mode controls
- Centered MemePop popup with character art, speech bubble, timer, and controls
- Multi-mode timing with custom durations per mode
- Focus Mode, Deadline Mode, Break Time, Hydration, Studying, Gaming, Office, Coding, Chill, Believe, and Party styles
- Party Mode with gradient background, disco ball, balloons, and confetti
- Chill Mode beach scene and Believe Mode motivational sunrise scene
- Local settings stored with `chrome.storage.local`
- No backend, no account, no tracking

## Install And Run

```bash
cd meme-pop
npm install
npm run build
```

Then load it in Chrome:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select `/home/rowena001/Meme-Pop/meme-pop`.
5. Open a normal webpage and click Show MemePop Now.

## Project Folder

The extension source code lives in [`meme-pop/`](meme-pop/).
