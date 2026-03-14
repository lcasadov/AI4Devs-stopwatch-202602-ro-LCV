'use strict';

/**
 * Countdown Timer — script.js
 *
 * Architecture follows SOLID principles:
 *   S — Logger, I18n, Validator, Timer, UIController each have one responsibility
 *   O — Timer accepts callbacks so behaviour is extended without modifying the class
 *   L — All classes are self-contained and substitutable
 *   I — UIController.bindEvents() accepts only the handler interface CountdownApp needs
 *   D — CountdownApp depends on abstractions (class instances injected/constructed once)
 */

// ─────────────────────────────────────────────────────────────────────────────
// LOGGER
// Single Responsibility: persist log entries in localStorage; download as file
// ─────────────────────────────────────────────────────────────────────────────
class Logger {
  constructor() {
    this._storageKey = 'countdown_logs';
    this._maxEntries = 500;
    this._entries    = this._loadFromStorage();
    this._listeners  = [];
  }

  _loadFromStorage() {
    try {
      const raw = localStorage.getItem(this._storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('[Logger] Could not read localStorage:', e);
      return [];
    }
  }

  _saveToStorage() {
    try {
      if (this._entries.length > this._maxEntries) {
        this._entries = this._entries.slice(-this._maxEntries);
      }
      localStorage.setItem(this._storageKey, JSON.stringify(this._entries));
    } catch (e) {
      console.error('[Logger] Could not write localStorage:', e);
    }
  }

  _addEntry(level, message) {
    const entry = { timestamp: new Date().toISOString(), level, message };
    this._entries.push(entry);
    this._saveToStorage();
    this._listeners.forEach(fn => fn(entry));
    return entry;
  }

  /** Register a callback invoked for every new entry. */
  addListener(fn) { this._listeners.push(fn); }

  info(message) {
    const e = this._addEntry('INFO', message);
    console.info(`[${e.timestamp}] [INFO]  ${message}`);
  }

  warn(message) {
    const e = this._addEntry('WARN', message);
    console.warn(`[${e.timestamp}] [WARN]  ${message}`);
  }

  error(message) {
    const e = this._addEntry('ERROR', message);
    console.error(`[${e.timestamp}] [ERROR] ${message}`);
  }

  getEntries() { return [...this._entries]; }

  /** Trigger browser download of logs.txt */
  download() {
    try {
      const lines = this._entries.map(
        e => `[${e.timestamp}] [${e.level.padEnd(5)}] ${e.message}`
      );
      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'logs.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.info('Logs downloaded as logs.txt');
    } catch (e) {
      console.error('[Logger] Download failed:', e);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// I18N
// Single Responsibility: provide translated strings for EN / ES
// ─────────────────────────────────────────────────────────────────────────────
class I18n {
  constructor() {
    this._lang = 'en';
    this._dict = {
      en: {
        page_title:       '⏱️ Tick Tock Countdown!',
        app_title:        '⏱️ Tick Tock Countdown!',
        app_description:  'The clock is ticking… Set your timer and watch the seconds vanish into the void! ⚡',
        label_hours:      'Hours',
        label_minutes:    'Min',
        label_seconds:    'Sec',
        btn_start:        'Start',
        btn_stop:         'Stop',
        btn_reset:        'Reset',
        logs_show:        '📋 Show Logs',
        logs_hide:        '📋 Hide Logs',
        logs_download:    '⬇ Download',
        err_hours:        'Hours must be a whole number between 0 and 99.',
        err_minutes:      'Minutes must be a whole number between 0 and 59.',
        err_seconds:      'Seconds must be a whole number between 0 and 59.',
        err_zero:         'Time cannot be zero. Enter at least 1 second.',
        err_multiple:     'Please correct the highlighted fields.',
        log_init:         'Application initialised',
        log_lang:         'Language changed to',
        log_start:        'Timer started',
        log_stop:         'Timer stopped at',
        log_reset:        'Timer reset',
        log_complete:     'Countdown finished — reached zero',
        log_invalid_start:'Start attempted with invalid input',
      },
      es: {
        page_title:       '⏱️ ¡Cuenta Atrás!',
        app_title:        '⏱️ ¡Cuenta Atrás!',
        app_description:  '¡El tiempo se escapa! Pon en marcha la cuenta atrás y mira cómo los segundos desaparecen uno a uno. ⚡',
        label_hours:      'Horas',
        label_minutes:    'Min',
        label_seconds:    'Seg',
        btn_start:        'Iniciar',
        btn_stop:         'Parar',
        btn_reset:        'Reiniciar',
        logs_show:        '📋 Ver Registros',
        logs_hide:        '📋 Ocultar Registros',
        logs_download:    '⬇ Descargar',
        err_hours:        'Las horas deben ser un entero entre 0 y 99.',
        err_minutes:      'Los minutos deben ser un entero entre 0 y 59.',
        err_seconds:      'Los segundos deben ser un entero entre 0 y 59.',
        err_zero:         'El tiempo no puede ser cero. Introduce al menos 1 segundo.',
        err_multiple:     'Por favor, corrige los campos marcados.',
        log_init:         'Aplicación inicializada',
        log_lang:         'Idioma cambiado a',
        log_start:        'Temporizador iniciado',
        log_stop:         'Temporizador parado en',
        log_reset:        'Temporizador reiniciado',
        log_complete:     'Cuenta atrás terminada — llegó a cero',
        log_invalid_start:'Inicio intentado con entrada inválida',
      }
    };
  }

  t(key) {
    return (this._dict[this._lang] || {})[key]
        || (this._dict['en']       || {})[key]
        || key;
  }

  setLang(lang) {
    if (!['en', 'es'].includes(lang)) {
      throw new Error(`Unsupported language: ${lang}`);
    }
    this._lang = lang;
  }

  getLang() { return this._lang; }
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATOR
// Single Responsibility: validate hours / minutes / seconds inputs
// ─────────────────────────────────────────────────────────────────────────────
class Validator {
  /**
   * @param {string} hours
   * @param {string} minutes
   * @param {string} seconds
   * @returns {{ isValid: boolean, errors: Object }}
   */
  validate(hours, minutes, seconds) {
    const errors = {};

    const h = this._parseNonNegativeInt(hours);
    const m = this._parseNonNegativeInt(minutes);
    const s = this._parseNonNegativeInt(seconds);

    if (h === null || h < 0 || h > 99) errors.hours   = true;
    if (m === null || m < 0 || m > 59) errors.minutes = true;
    if (s === null || s < 0 || s > 59) errors.seconds = true;

    // Only check for zero when individual fields are each valid
    if (!errors.hours && !errors.minutes && !errors.seconds) {
      if (h === 0 && m === 0 && s === 0) errors.zero = true;
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      parsed: { h: h ?? 0, m: m ?? 0, s: s ?? 0 }
    };
  }

  _parseNonNegativeInt(value) {
    const str = String(value ?? '').trim();
    if (str === '') return null;
    const n = Number(str);
    return Number.isInteger(n) ? n : null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMER
// Single Responsibility: manage countdown state and interval ticking
// Open/Closed: callbacks allow extending behaviour without modifying this class
// ─────────────────────────────────────────────────────────────────────────────
class Timer {
  /**
   * @param {{ onTick: function(number), onComplete: function() }} callbacks
   */
  constructor({ onTick, onComplete }) {
    this._onTick      = onTick;
    this._onComplete  = onComplete;
    this._remaining   = 0;   // seconds
    this._intervalId  = null;
    this._running     = false;
  }

  /** Set the countdown duration. Throws if called while running. */
  setTime(hours, minutes, seconds) {
    if (this._running) throw new Error('Cannot set time while timer is running.');
    this._remaining = (hours * 3600) + (minutes * 60) + seconds;
  }

  start() {
    if (this._running)          throw new Error('Timer is already running.');
    if (this._remaining <= 0)   throw new Error('No time set — cannot start.');

    this._running    = true;
    this._intervalId = setInterval(() => {
      try {
        this._remaining = Math.max(0, this._remaining - 1);
        this._onTick(this._remaining);
        if (this._remaining <= 0) {
          this.stop();
          this._onComplete();
        }
      } catch (e) {
        this.stop();
        throw e;
      }
    }, 1000);
  }

  stop() {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    this._running = false;
  }

  reset() {
    this.stop();
    this._remaining = 0;
  }

  get running()          { return this._running;   }
  get remainingSeconds() { return this._remaining; }

  /** @param {number} totalSeconds @returns {string} "HH:MM:SS" */
  static formatTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UI CONTROLLER
// Single Responsibility: all DOM reads / writes live here
// ─────────────────────────────────────────────────────────────────────────────
class UIController {
  constructor() {
    this._logsVisible = false;
    this._el = {
      htmlRoot:        document.getElementById('html-root'),
      pageTitle:       document.getElementById('page-title'),
      appTitle:        document.getElementById('app-title'),
      appDescription:  document.getElementById('app-description'),
      labelHours:      document.getElementById('label-hours'),
      labelMinutes:    document.getElementById('label-minutes'),
      labelSeconds:    document.getElementById('label-seconds'),
      inputHours:      document.getElementById('input-hours'),
      inputMinutes:    document.getElementById('input-minutes'),
      inputSeconds:    document.getElementById('input-seconds'),
      errorMessage:    document.getElementById('error-message'),
      displayTime:     document.getElementById('display-time'),
      btnStart:        document.getElementById('btn-start'),
      btnStop:         document.getElementById('btn-stop'),
      btnReset:        document.getElementById('btn-reset'),
      btnLangEn:       document.getElementById('btn-lang-en'),
      btnLangEs:       document.getElementById('btn-lang-es'),
      btnToggleLogs:   document.getElementById('btn-toggle-logs'),
      btnDownloadLogs: document.getElementById('btn-download-logs'),
      logsPanel:       document.getElementById('logs-panel'),
      logsContent:     document.getElementById('logs-content'),
    };

    this._validateElements();
  }

  _validateElements() {
    Object.entries(this._el).forEach(([key, el]) => {
      if (!el) console.warn(`[UIController] Element not found: #${key}`);
    });
  }

  /** Wire all DOM events via a single handler map. */
  bindEvents(handlers) {
    const { btnLangEn, btnLangEs,
            inputHours, inputMinutes, inputSeconds,
            btnStart, btnStop, btnReset,
            btnToggleLogs, btnDownloadLogs } = this._el;

    btnLangEn.addEventListener('click',  handlers.onLangEn);
    btnLangEs.addEventListener('click',  handlers.onLangEs);

    inputHours.addEventListener('input',   handlers.onInputChange);
    inputMinutes.addEventListener('input', handlers.onInputChange);
    inputSeconds.addEventListener('input', handlers.onInputChange);

    btnStart.addEventListener('click',  handlers.onStart);
    btnStop.addEventListener('click',   handlers.onStop);
    btnReset.addEventListener('click',  handlers.onReset);

    btnToggleLogs.addEventListener('click',   handlers.onToggleLogs);
    btnDownloadLogs.addEventListener('click', handlers.onDownloadLogs);
  }

  // ── Text / language ────────────────────────────────────────────────────────

  updateTexts(i18n) {
    const e = this._el;
    document.title           = i18n.t('page_title');
    e.pageTitle.textContent  = i18n.t('page_title');
    e.appTitle.textContent   = i18n.t('app_title');
    e.appDescription.textContent = i18n.t('app_description');
    e.labelHours.textContent   = i18n.t('label_hours');
    e.labelMinutes.textContent = i18n.t('label_minutes');
    e.labelSeconds.textContent = i18n.t('label_seconds');
    e.btnStart.textContent     = i18n.t('btn_start');
    e.btnStop.textContent      = i18n.t('btn_stop');
    e.btnReset.textContent     = i18n.t('btn_reset');
    e.btnDownloadLogs.textContent = i18n.t('logs_download');
    e.btnToggleLogs.textContent   = this._logsVisible
      ? i18n.t('logs_hide')
      : i18n.t('logs_show');
    e.htmlRoot.setAttribute('lang', i18n.getLang());
  }

  setActiveLang(lang) {
    this._el.btnLangEn.style.opacity = lang === 'en' ? '1' : '0.4';
    this._el.btnLangEs.style.opacity = lang === 'es' ? '1' : '0.4';
  }

  // ── Inputs ─────────────────────────────────────────────────────────────────

  getInputValues() {
    return {
      hours:   this._el.inputHours.value,
      minutes: this._el.inputMinutes.value,
      seconds: this._el.inputSeconds.value,
    };
  }

  clearInputs() {
    this._el.inputHours.value   = '';
    this._el.inputMinutes.value = '';
    this._el.inputSeconds.value = '';
  }

  markFieldError(field, hasError) {
    const map = { hours: 'inputHours', minutes: 'inputMinutes', seconds: 'inputSeconds' };
    const input = this._el[map[field]];
    if (!input) return;

    if (hasError) {
      input.classList.remove('border-gray-200');
      input.classList.add('border-red-500', 'ring-2', 'ring-red-400', 'bg-red-50');
    } else {
      input.classList.remove('border-red-500', 'ring-2', 'ring-red-400', 'bg-red-50');
      input.classList.add('border-gray-200');
    }
  }

  clearAllFieldErrors() {
    ['hours', 'minutes', 'seconds'].forEach(f => this.markFieldError(f, false));
    this._hideError();
  }

  // ── Error message ──────────────────────────────────────────────────────────

  showError(message) {
    this._el.errorMessage.textContent = message;
    this._el.errorMessage.classList.remove('hidden');
  }

  _hideError() {
    this._el.errorMessage.classList.add('hidden');
    this._el.errorMessage.textContent = '';
  }

  // ── Display ────────────────────────────────────────────────────────────────

  updateDisplay(totalSeconds) {
    this._el.displayTime.textContent = Timer.formatTime(totalSeconds);
  }

  setDisplayFromInputs(h, m, s) {
    this._el.displayTime.textContent = Timer.formatTime(h * 3600 + m * 60 + s);
  }

  resetDisplay() {
    this._el.displayTime.textContent = '00:00:00';
    this._el.displayTime.classList.remove('text-red-500', 'animate-pulse');
    this._el.displayTime.classList.add('text-gray-800');
  }

  setDisplayComplete() {
    this._el.displayTime.classList.remove('text-gray-800');
    this._el.displayTime.classList.add('text-red-500', 'animate-pulse');
  }

  // ── Buttons ────────────────────────────────────────────────────────────────

  setStartEnabled(enabled) {
    this._el.btnStart.disabled = !enabled;
  }

  // ── Logs ───────────────────────────────────────────────────────────────────

  toggleLogs(i18n) {
    this._logsVisible = !this._logsVisible;
    if (this._logsVisible) {
      this._el.logsPanel.classList.remove('hidden');
    } else {
      this._el.logsPanel.classList.add('hidden');
    }
    this._el.btnToggleLogs.textContent = this._logsVisible
      ? i18n.t('logs_hide')
      : i18n.t('logs_show');
  }

  appendLogEntry(entry) {
    const levelColour = { INFO: 'text-blue-500', WARN: 'text-yellow-500', ERROR: 'text-red-500' };
    const colour = levelColour[entry.level] || 'text-gray-400';
    const ts     = entry.timestamp.replace('T', ' ').substring(0, 19);

    const div = document.createElement('div');
    div.innerHTML =
      `<span class="text-gray-400">${ts}</span> ` +
      `<span class="${colour} font-bold">[${entry.level}]</span> ` +
      `${entry.message}`;

    this._el.logsContent.appendChild(div);
    // Scroll to the latest entry
    this._el.logsPanel.scrollTop = this._el.logsPanel.scrollHeight;
  }

  loadExistingLogs(entries) {
    entries.forEach(e => this.appendLogEntry(e));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COUNTDOWN APP
// Orchestrator — Dependency Inversion: depends on injected/constructed objects,
// not concrete implementation details
// ─────────────────────────────────────────────────────────────────────────────
class CountdownApp {
  constructor() {
    this._logger    = new Logger();
    this._i18n      = new I18n();
    this._validator = new Validator();
    this._ui        = new UIController();
    this._timer     = new Timer({
      onTick:     (secs) => this._handleTick(secs),
      onComplete: ()     => this._handleComplete(),
    });

    this._init();
  }

  _init() {
    try {
      // Populate log panel with any entries already in localStorage
      this._ui.loadExistingLogs(this._logger.getEntries());

      // Stream new log entries to the UI panel in real time
      this._logger.addListener(entry => this._ui.appendLogEntry(entry));

      // Wire DOM events
      this._ui.bindEvents({
        onLangEn:       () => this._setLanguage('en'),
        onLangEs:       () => this._setLanguage('es'),
        onInputChange:  () => this._handleInputChange(),
        onStart:        () => this._handleStart(),
        onStop:         () => this._handleStop(),
        onReset:        () => this._handleReset(),
        onToggleLogs:   () => this._ui.toggleLogs(this._i18n),
        onDownloadLogs: () => this._logger.download(),
      });

      // Initial render
      this._ui.updateTexts(this._i18n);
      this._ui.setActiveLang(this._i18n.getLang());
      this._ui.setStartEnabled(false);

      this._logger.info(this._i18n.t('log_init'));
    } catch (e) {
      this._logger.error(`Init error: ${e.message}`);
      console.error(e);
    }
  }

  // ── Language ───────────────────────────────────────────────────────────────

  _setLanguage(lang) {
    try {
      this._i18n.setLang(lang);
      this._ui.updateTexts(this._i18n);
      this._ui.setActiveLang(lang);
      this._logger.info(`${this._i18n.t('log_lang')}: ${lang}`);
    } catch (e) {
      this._logger.error(`Language switch error: ${e.message}`);
    }
  }

  // ── Inputs ─────────────────────────────────────────────────────────────────

  _handleInputChange() {
    try {
      // Ignore input changes while a countdown is running
      if (this._timer.running) return;

      const { hours, minutes, seconds } = this._ui.getInputValues();

      this._ui.clearAllFieldErrors();

      // All empty → reset to initial state
      if (hours === '' && minutes === '' && seconds === '') {
        this._timer.reset();
        this._ui.resetDisplay();
        this._ui.setStartEnabled(false);
        return;
      }

      const result = this._validator.validate(hours, minutes, seconds);

      if (!result.isValid) {
        Object.keys(result.errors)
          .filter(k => k !== 'zero')
          .forEach(field => this._ui.markFieldError(field, true));

        this._ui.showError(this._buildErrorMessage(result.errors));
        this._ui.setStartEnabled(false);
        this._ui.resetDisplay();
      } else {
        const { h, m, s } = result.parsed;
        this._timer.setTime(h, m, s);
        this._ui.setDisplayFromInputs(h, m, s);
        this._ui.setStartEnabled(true);
      }
    } catch (e) {
      this._logger.error(`Input change error: ${e.message}`);
    }
  }

  _buildErrorMessage(errors) {
    const i18n = this._i18n;
    const msgs = [];
    if (errors.hours)   msgs.push(i18n.t('err_hours'));
    if (errors.minutes) msgs.push(i18n.t('err_minutes'));
    if (errors.seconds) msgs.push(i18n.t('err_seconds'));
    if (errors.zero)    msgs.push(i18n.t('err_zero'));
    return msgs.length === 1 ? msgs[0] : i18n.t('err_multiple');
  }

  // ── Timer controls ─────────────────────────────────────────────────────────

  _handleStart() {
    try {
      if (this._timer.running) return;

      // Re-validate before starting (guards against direct button click edge cases)
      const { hours, minutes, seconds } = this._ui.getInputValues();
      const result = this._validator.validate(hours, minutes, seconds);

      if (!result.isValid) {
        this._logger.warn(this._i18n.t('log_invalid_start'));
        return;
      }

      this._ui.resetDisplay();  // clear any completion style
      this._timer.start();
      this._ui.setStartEnabled(false);

      this._logger.info(
        `${this._i18n.t('log_start')}: ${Timer.formatTime(this._timer.remainingSeconds)}`
      );
    } catch (e) {
      this._logger.error(`Start error: ${e.message}`);
    }
  }

  _handleStop() {
    try {
      if (!this._timer.running) return;

      this._timer.stop();
      this._ui.setStartEnabled(true);

      this._logger.info(
        `${this._i18n.t('log_stop')}: ${Timer.formatTime(this._timer.remainingSeconds)}`
      );
    } catch (e) {
      this._logger.error(`Stop error: ${e.message}`);
    }
  }

  _handleReset() {
    try {
      this._timer.reset();
      this._ui.clearInputs();
      this._ui.clearAllFieldErrors();
      this._ui.resetDisplay();
      this._ui.setStartEnabled(false);
      this._logger.info(this._i18n.t('log_reset'));
    } catch (e) {
      this._logger.error(`Reset error: ${e.message}`);
    }
  }

  // ── Timer callbacks ────────────────────────────────────────────────────────

  _handleTick(seconds) {
    try {
      this._ui.updateDisplay(seconds);
    } catch (e) {
      this._logger.error(`Tick error: ${e.message}`);
    }
  }

  _handleComplete() {
    try {
      this._ui.setDisplayComplete();
      this._ui.setStartEnabled(false);
      this._logger.info(this._i18n.t('log_complete'));
    } catch (e) {
      this._logger.error(`Complete handler error: ${e.message}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOTSTRAP
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  try {
    window.countdownApp = new CountdownApp();
  } catch (e) {
    console.error('[FATAL] Application failed to initialise:', e);
  }
});
