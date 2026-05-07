const DEFAULT_LANGUAGE = 'en';
const STORAGE_KEY = 'actualTutorial.language';

export const LANGUAGES = {
  en: { label: 'English', nativeLabel: 'English', dir: 'ltr', bodyClass: '' },
  ar: { label: 'Arabic', nativeLabel: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629', dir: 'rtl', bodyClass: 'ar' },
  es: { label: 'Spanish', nativeLabel: 'Espa\u00f1ol', dir: 'ltr', bodyClass: '' },
  fr: { label: 'French', nativeLabel: 'Fran\u00e7ais', dir: 'ltr', bodyClass: '' },
  'pt-BR': { label: 'Portuguese (Brazil)', nativeLabel: 'Portugu\u00eas (Brasil)', dir: 'ltr', bodyClass: '' }
};

const dictionaries = {};
const warnedMissingKeys = new Set();
let currentLanguage = DEFAULT_LANGUAGE;

async function loadDictionary(language) {
  if (dictionaries[language]) return dictionaries[language];

  const response = await fetch(`./i18n/${language}.json`);
  if (!response.ok) {
    throw new Error(`Failed to load translation file for "${language}" (${response.status})`);
  }

  dictionaries[language] = await response.json();
  validateLanguageKeys(language);
  return dictionaries[language];
}

function getStoredLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return LANGUAGES[stored] ? stored : DEFAULT_LANGUAGE;
  } catch (_error) {
    return DEFAULT_LANGUAGE;
  }
}

function storeLanguage(language) {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch (_error) {
    // Private browsing or locked-down storage should not block language switching.
  }
}

export async function initI18n() {
  await loadDictionary(DEFAULT_LANGUAGE);
  await setLanguage(getStoredLanguage(), { persist: false });
}

export function initLanguageSelector() {
  const selector = document.getElementById('language-selector');
  const button = document.getElementById('language-button');
  const menu = document.getElementById('language-menu');
  if (!selector || !button || !menu) return;

  renderLanguageOptions(menu);
  updateLanguageSelector();

  button.addEventListener('click', () => {
    setMenuOpen(!isMenuOpen());
  });

  menu.addEventListener('click', async (event) => {
    const option = event.target.closest('[data-language-code]');
    if (!option) return;
    await setLanguage(option.dataset.languageCode);
    setMenuOpen(false);
    button.focus();
  });

  document.addEventListener('click', (event) => {
    if (!selector.contains(event.target)) setMenuOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (!isMenuOpen()) return;
    setMenuOpen(false);
    button.focus();
  });
}

export async function setLanguage(language, options = {}) {
  let nextLanguage = LANGUAGES[language] ? language : DEFAULT_LANGUAGE;

  try {
    await loadDictionary(nextLanguage);
  } catch (error) {
    console.warn(error);
    nextLanguage = DEFAULT_LANGUAGE;
    await loadDictionary(DEFAULT_LANGUAGE);
  }

  currentLanguage = nextLanguage;
  if (options.persist !== false) storeLanguage(currentLanguage);
  applyLanguageShell();
  applyTranslations(document);
  updateLanguageSelector();
  document.dispatchEvent(new CustomEvent('actualtutorial:languagechange', {
    detail: { language: currentLanguage }
  }));
}

export function getCurrentLanguage() {
  return currentLanguage;
}

export function translate(key, replacements = {}) {
  const dictionary = dictionaries[currentLanguage] || {};
  const fallback = dictionaries[DEFAULT_LANGUAGE] || {};
  let value = dictionary[key];

  if (value == null) {
    value = fallback[key] ?? '';
    warnMissingKey(currentLanguage, key);
  }

  Object.entries(replacements).forEach(([name, replacement]) => {
    value = value.replaceAll(`{${name}}`, replacement);
  });

  return value;
}

export function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((element) => {
    const value = translate(element.dataset.i18n);
    if (value) element.textContent = value;
  });

  root.querySelectorAll('[data-i18n-html]').forEach((element) => {
    const value = translate(element.dataset.i18nHtml);
    if (value) element.innerHTML = value;
  });
}

function renderLanguageOptions(menu) {
  menu.innerHTML = Object.entries(LANGUAGES).map(([code, language]) => `
    <button class="language-option" type="button" role="option" data-language-code="${code}">
      <span>${language.nativeLabel}</span>
      <span class="language-option-code">${code}</span>
    </button>
  `).join('');
}

function updateLanguageSelector() {
  const button = document.getElementById('language-button');
  const buttonLabel = document.getElementById('language-button-label');
  const menu = document.getElementById('language-menu');
  const language = LANGUAGES[currentLanguage] || LANGUAGES[DEFAULT_LANGUAGE];
  if (buttonLabel) buttonLabel.textContent = `\u{1F310} ${language.nativeLabel}`;
  if (button) button.setAttribute('aria-label', `Language: ${language.label}`);
  if (!menu) return;

  menu.querySelectorAll('[data-language-code]').forEach((option) => {
    const isSelected = option.dataset.languageCode === currentLanguage;
    option.setAttribute('aria-selected', isSelected ? 'true' : 'false');
  });
}

function setMenuOpen(isOpen) {
  const button = document.getElementById('language-button');
  const menu = document.getElementById('language-menu');
  if (!button || !menu) return;

  button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  menu.hidden = !isOpen;

  if (isOpen) {
    const selected = menu.querySelector('[aria-selected="true"]');
    const first = menu.querySelector('.language-option');
    (selected || first)?.focus();
  }
}

function isMenuOpen() {
  const menu = document.getElementById('language-menu');
  return Boolean(menu && !menu.hidden);
}

function applyLanguageShell() {
  const config = LANGUAGES[currentLanguage] || LANGUAGES[DEFAULT_LANGUAGE];
  document.documentElement.lang = currentLanguage;
  document.documentElement.dir = config.dir;

  Object.values(LANGUAGES).forEach((language) => {
    if (language.bodyClass) document.body.classList.remove(language.bodyClass);
  });

  if (config.bodyClass) document.body.classList.add(config.bodyClass);
}

function validateLanguageKeys(language) {
  if (language === DEFAULT_LANGUAGE || !dictionaries[DEFAULT_LANGUAGE] || !dictionaries[language]) return;

  const referenceKeys = Object.keys(dictionaries[DEFAULT_LANGUAGE]);
  const languageKeys = Object.keys(dictionaries[language]);
  const languageKeySet = new Set(languageKeys);
  const referenceKeySet = new Set(referenceKeys);
  const missing = referenceKeys.filter((key) => !languageKeySet.has(key));
  const extra = languageKeys.filter((key) => !referenceKeySet.has(key));

  if (missing.length || extra.length) {
    console.warn(`[i18n] Key differences for ${language}`, { missing, extra });
  }
}

function warnMissingKey(language, key) {
  if (language === DEFAULT_LANGUAGE) return;
  const warningKey = `${language}:${key}`;
  if (warnedMissingKeys.has(warningKey)) return;
  warnedMissingKeys.add(warningKey);
  console.warn(`[i18n] Missing key "${key}" for ${language}; using English fallback.`);
}
