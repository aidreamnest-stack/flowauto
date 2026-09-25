# Flow Automation - Chrome Extension (v1.6.0)

> **Autonomous Engineering & Implementation Knowledge Base**  
> Standalone repository documentation for Flow Automation Chrome Extension (Manifest V3).

---

## 📌 Project Overview
**Flow Automation** is an engineering-grade Chrome Extension (Manifest V3) designed for automated, high-speed, and human-jittered batch image generation on **Google Flow** (`flow.google.com`), **Google Labs** (`labs.google`), and **AI Test Kitchen** (`aitestkitchen.withgoogle.com`).

Unlike fragile DOM-clicking browser scripts, Flow Automation communicates directly via the **Chrome DevTools Protocol (CDP)** using native `chrome.debugger` APIs to dispatch genuine, OS-level hardware keystrokes (`isTrusted: true`), bypassing React 18+ rich text and Shadow DOM input barriers.

---

## 🛠 Tech Stack & Architecture

| Layer | Technology | Role |
|---|---|---|
| **Manifest** | Chrome Extension Manifest V3 | Root permission model & content script routing |
| **Service Worker** | `background.js` (CDP / `chrome.debugger`) | Native OS-level hardware Enter & Text Input (`isTrusted: true`) |
| **DOM Engine** | `content.js` | Bottom viewport prompt finder, round-robin scheduler, jitter timing |
| **Sound Engine** | Web Audio API (`AudioContext`) | Synthetic 3-tone ascending melodic completion chime (`D5 ➔ G5 ➔ B5`) |
| **UI Studio** | `popup.html` & `popup.js` | Dark glassmorphic prompt manager, round-robin preview, live status |
| **Visual Identity**| Cyber Ghost Icon Set (`icons/`) | Custom SVG + PNG assets (16x16, 32x32, 48x48, 128x128) |

---

## 🏗 Key Architectural Systems

### 1. Chromium Debugger Protocol (CDP) True Hardware Enter
- **Problem**: Google Flow encapsulates rich-text inputs inside Lit Web Components and checks `event.isTrusted`. Synthetic JavaScript events (`new KeyboardEvent('keydown', { key: 'Enter' })`) have `isTrusted: false` and are silently ignored.
- **Solution (`background.js`)**:
  1. Attaches `chrome.debugger` to the active tab (`version: "1.3"`).
  2. Dispatches `Input.dispatchKeyEvent` with `commands: ['selectAll', 'delete']` to clear existing prompt text.
  3. Dispatches `Input.insertText` to inject the active prompt.
  4. Dispatches genuine `windowsVirtualKeyCode: 13` / `nativeVirtualKeyCode: 13` hardware Enter keydown & keyup events (`isTrusted: true`).
  5. Detaches cleanly from the tab.

### 2. Multi-Prompt Round-Robin Engine (v1.6.0)
- Supports adding up to 10 distinct prompt variations.
- Dynamically calculates fair distribution across batch limits:
  $$\text{Prompt Index} = (\text{Iteration} - 1) \pmod{\text{Total Prompts}}$$
- Example: 5 prompts across a batch of 10 runs each prompt exactly 2 times in alternating sequence.

### 3. Multi-Tier Human Jitter & Inspection Timing
- Computes natural human variations around base interval:
  $$\text{Delay} = \text{Base Interval} + \text{Random}(-2, +4)\text{s}$$
- Automatically injects an inspection pause (+3s to +5s) every 4 iterations.
- Eliminates rigid machine timing signatures, preventing anti-bot rate limit triggers.

### 4. Zero-Dependency Melodic Completion Alert
- Uses browser-native `AudioContext` to generate a 3-tone ascending harmonic chime (D5 `587.33Hz` ➔ G5 `783.99Hz` ➔ B5 `987.77Hz`) with exponential gain decay.
- Requires zero external MP3/WAV files and operates 100% offline.
- Features a persistent toggle switch (`🔔 Completion Sound Chime`) in the popup UI.

### 5. Strict Tab & Host Isolation
- Permissions and content scripts are scoped strictly to Google Flow / Labs domains.
- Does NOT inject into general Google search, Gmail, or new tab pages.
- Worker executes strictly on user trigger (`START_WORKER`), preventing accidental loop launches.

---

## 📜 Implementation History & Changelog

### v1.6.0 (Current)
- **Multi-Prompt Engine**: Dynamic prompt list in popup UI with add (`+ Add Prompt`), remove (`✕`), and local storage persistence.
- **Fair Round-Robin Scheduler**: Alternates prompts evenly across total batch iterations.
- **Web Audio Alert**: Ascending 3-tone chime upon batch completion with popup mute/unmute toggle.

### v1.5.0
- **Brand Identity**: Renamed to **Flow Automation**; added iconic Cyber Ghost shield icons.
- **Tab Isolation**: Scoped host permissions to prevent freezing on unrelated browser tabs.

### v1.4.0 - v1.1.0
- **CDP Hardware Enter**: Integrated Chrome DevTools Protocol for genuine OS-level Enter keystrokes.
- **Viewport-Locked Finder**: `rect.top > window.innerHeight * 0.55` threshold targeting bottom prompt box only.
- **Human Jitter Timing**: Added multi-tier randomized interval swings and 4-generation inspection breathers.

---

## 🚀 Installation & Setup

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select this directory (`tools/picmaze-flow-worker`).
5. Pin **Flow Automation** to your Chrome toolbar.

---

## 📂 Repository File Tree
```
picmaze-flow-worker/
├── AGENTS.md                  # Autonomous knowledge & architecture specs
├── README.md                  # User quick-start guide
├── manifest.json              # Chrome Manifest V3 config
├── background.js              # CDP Service Worker (Hardware Enter)
├── content.js                 # Automation DOM Engine & Round-Robin loop
├── popup.html                 # Extension Popup UI
├── popup.js                   # Popup state manager & prompt handler
├── styles.css                 # Content script styles
├── Launch_PicMaze_Worker.bat  # 1-Click Desktop Launcher
└── icons/
    ├── ghost.svg              # Vector brand mark
    ├── icon16.png             # 16x16 Toolbar icon
    ├── icon32.png             # 32x32 Extension list icon
    ├── icon48.png             # 48x48 Management icon
    └── icon128.png            # 128x128 Webstore store icon
```
