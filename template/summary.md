# Summary — Countdown Timer

## Branch
`first`

## Files delivered (`template/`)

| File | Description |
|---|---|
| `index.html` | Semantic HTML5 + UnoCSS CDN runtime for all styling |
| `script.js` | ES6 classes following SOLID principles |
| `prompts.md` | Full conversation record (prompts + answers) |
| `summary.md` | This file |

---

## Technical criteria

### Best practices
- Semantic HTML5 (`<main>`, `<header>`, `<section>`, `<label>`, `role`, `aria-label`)
- Strict mode (`'use strict'`) in JavaScript
- No global variables except the app entry point (`window.countdownApp`)
- Exception handling with `try/catch` in every public method

### Separation of concerns
- `index.html` — structure and presentation only
- `script.js` — all logic, no inline scripts in HTML

### SOLID principles

| Principle | Applied via |
|---|---|
| **S**ingle Responsibility | `Logger`, `I18n`, `Validator`, `Timer`, `UIController` each own exactly one concern |
| **O**pen/Closed | `Timer` accepts `onTick` / `onComplete` callbacks — behaviour extended without modifying the class |
| **L**iskov Substitution | All classes are self-contained and substitutable in their roles |
| **I**nterface Segregation | `UIController.bindEvents(handlers)` exposes only the surface `CountdownApp` needs |
| **D**ependency Inversion | `CountdownApp` depends on the high-level interfaces of its collaborators, not on DOM details |

### Logging (`logs.txt`)
- Every app event (init, language change, start, stop, reset, complete, errors) is logged
- Entries persisted in `localStorage` across browser sessions (capped at 500 entries)
- One-click download generates `logs.txt` via `Blob` + `URL.createObjectURL`

### CSS — UnoCSS
- CDN runtime (`@unocss/runtime/uno.global.js`) — zero build step required
- Tailwind-compatible utility classes
- MutationObserver detects dynamically added classes at runtime
- Safelist in `window.__unocss` covers all dynamically toggled classes
- Number input spinners removed cross-browser via a small `<style>` block

### Responsive design
- Fluid card layout (`max-w-md`, `flex-1`, `min-w-0`)
- `sm:` breakpoint on display font size
- Works on mobile, tablet and desktop

### Cross-browser compatibility
- Tested target browsers: Chrome, Edge, Opera, Firefox, Safari, Brave
- No cutting-edge APIs: standard DOM events, `setInterval`, `Blob`, `localStorage`
- CSS `disabled:` / `enabled:` pseudo-class variants for button states

---

## Functional criteria

| Requirement | Implementation |
|---|---|
| Hours field (0–99) | `<input type="number" min="0" max="99">` + `Validator._parseNonNegativeInt` |
| Minutes field (0–59) | `<input type="number" min="0" max="59">` + range check |
| Seconds field (0–59) | `<input type="number" min="0" max="59">` + range check |
| Counter display HH:MM:SS | `#display-time` updated by `Timer.formatTime(totalSeconds)` |
| Start disabled initially | `disabled` attribute set; CSS `disabled:opacity-40` handles visual state |
| Start enabled on valid input | `Validator.validate()` → `UIController.setStartEnabled(true)` |
| Error highlight on invalid input | UnoCSS classes `border-red-500 ring-2 ring-red-400 bg-red-50` per field |
| Error alert message | `#error-message` shown with translated per-field or combined message |
| Countdown second by second | `setInterval(..., 1000)` inside `Timer.start()` |
| Stops at zero | `Timer` detects `remainingSeconds === 0`, calls `onComplete` callback |
| Stop button pauses countdown | `Timer.stop()` clears the interval; display freezes at current value |
| Reset clears all fields | `UIController.clearInputs()` + `resetDisplay()` + `setStartEnabled(false)` |

---

## General criteria

| Requirement | Implementation |
|---|---|
| Attractive English title | *"⏱️ Tick Tock Countdown!"* |
| Attractive Spanish title | *"⏱️ ¡Cuenta Atrás!"* |
| Fun description (EN) | *"The clock is ticking… Set your timer and watch the seconds vanish into the void! ⚡"* |
| Fun description (ES) | *"¡El tiempo se escapa! Pon en marcha la cuenta atrás y mira cómo los segundos desaparecen uno a uno. ⚡"* |
| Bilingual UI | `I18n` class with full EN/ES dictionaries; flag buttons 🇬🇧 / 🇪🇸 toggle language at runtime |

---

## Design reference

Inspired by `res/stopwatch.png`:
- Display: indigo-50 background, 4px dark border, rounded corners, large monospace font
- Start button: green (`bg-green-500`)
- Stop button: orange (`bg-orange-500`)
- Reset button: red (`bg-red-500`)
- Completion state: display text turns red with pulse animation
