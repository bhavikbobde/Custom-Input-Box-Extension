# Smart Input Box Firefox Extension — Product Requirements Document (PRD)

---

## 1. Purpose
Give users a focus-friendly typing experience by letting them interact with input fields through a floating textbox rather than scrolling to boxes anchored at the page bottom.

---

## 2. Core Features (No Extras)

| #   | Feature               | Mode     | Must-Have Details                                                                                                                                                                                                              |
| --- | --------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Floating Textbox      | Habit    | • Appears top-center or mid-screen when any `<input>`/`<textarea>` is focused.<br>• Two-way sync: keystrokes mirror instantly between floating box and the original field.<br>• Auto-dismiss on blur / ESC.                    |
| 2   | Position Presets      | Habit    | Toggle between “Top Bar” and “Center Popup” layouts. Remember last choice per site (via `storage.local`).                                                                                                                      |
| 3   | LLM-Driven CSS Tweaks | Advanced | • User sets an LLM API key once (stored securely).<br>• On shortcut, current page DOM snapshot is sent to background script → LLM.<br>• LLM returns CSS; content script injects it to simplify layout and keep inputs visible. |
| 4   | LLM Summarise-Inputs  | Advanced | On demand, selected inputs / long text areas are sent to LLM, which returns a concise summary shown in a sidebar.                                                                                                              |
| 5   | Keyboard Shortcuts    | Both     | • **Ctrl + Shift + Y** – toggle Habit ↔ Advanced.<br>• **Ctrl + Shift + U** – show/hide floating box.<br>• **Ctrl + Shift + S** – run “summarise inputs.” All shortcuts editable in Add-ons Manager.                           |
| 6   | Popup UI              | Both     | Minimal popup with: current mode indicator, API-key field (Advanced), position preset selector (Habit), on/off toggle.                                                                                                         |

---

## 3. Non-Functional Requirements
* **Performance:** Debounce sync events to <5 ms latency; CSS injection ≤ 300 ms.
* **Privacy & Security:** No HTML is stored; API key stored via `browser.storage.local`, never synced or logged.
* **Compatibility:** Works on standard input/textarea plus dynamically injected fields (handled via `MutationObserver`).

---

## 4. User Flow (Habit Mode Example)
1. User focuses any textbox ➜ content script inserts floating textbox (`z-index 9999999`).
2. User types in floating box ➜ `input` event copies text to original field (and vice-versa).
3. User presses ESC or clicks outside ➜ floating box removed.

---

## 5. Acceptance Criteria
* F1: Floating textbox appears within 50 ms on focus and mirrors input with <1-char delay.
* F2: Mode toggle updates icon badge and persists across reloads.
* F3: CSS returned by LLM is applied immediately and can be reverted with the same shortcut.
* F4: Summaries contain ≤25 % of original characters and appear in under 5 s.
* F5: All keyboard shortcuts function on any website without clashing with default site shortcuts.

---

## 6. Success Metrics
* **Adoption:** ≥50 % of weekly users trigger floating box at least 5 times/day.
* **Retention:** 7-day rolling retention ≥40 %.
* **Latency:** 95th-percentile sync latency ≤25 ms.

---

## 7. High-Level Build Plan (How-To)
1. **Scaffold** extension (`manifest.json`, `background.js`, `content.js`, `popup.html`/`.js`, `styles.css`).
2. **Habit Mode** logic in `content.js` (focus listener, floating box injection, 2-way binding).
3. **Advanced Mode**:  
   * Store API key via popup.  
   * `background.js` fetches `/v1/chat/completions` (or equivalent) with HTML snapshot.  
   * Inject LLM-generated CSS/summary through `scripting.executeScript`.
4. **Shortcuts & Messaging**: use `commands` API ➜ forward events from `background.js` to `content.js`.
5. **Package & QA**: run `web-ext run` locally; test on Gmail, Reddit, YouTube comments.  
6. **Publish**: `web-ext sign` ➜ upload to AMO.

---

*Compiled: 15 Jun 2025 – v1.0*
