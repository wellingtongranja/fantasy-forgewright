/**
 * I18nManager - Manages internationalization, localization, and RTL support
 * Following TDD implementation from i18n-manager.test.js
 */
export class I18nManager {
  constructor() {
    this.currentLanguage = 'en'
    this.supportedLanguages = [
      'en',
      'es',
      'fr',
      'de',
      'it',
      'pt',
      'ru',
      'ja',
      'ko',
      'zh',
      'ar',
      'he',
      'fa'
    ]
    this.rtlLanguages = ['ar', 'he', 'fa', 'ur', 'yi']
    this.translations = new Map()
    this.translationCache = new Map()
    this.eventCallbacks = []
    this.isInitialized = false
  }

  /**
   * Initialize i18n system
   */
  async init() {
    try {
      // Detect or restore language preference
      const savedLanguage = this.getSavedLanguage()
      const detectedLanguage = this.detectSystemLanguage()
      const targetLanguage = savedLanguage || detectedLanguage

      if (this.isLanguageSupported(targetLanguage)) {
        this.currentLanguage = targetLanguage
      }

      // Load translations for current language
      await this.loadTranslations(this.currentLanguage)

      // Apply language settings to DOM
      this.applyLanguageToDOM()

      this.isInitialized = true
    } catch (error) {
      console.warn('I18nManager initialization failed:', error)
      // Fallback to English
      this.currentLanguage = 'en'
      await this.loadTranslations('en')
      this.applyLanguageToDOM()
    }
  }

  /**
   * Set active language
   */
  async setLanguage(languageCode) {
    if (!this.isLanguageSupported(languageCode)) {
      return false
    }

    const previousLanguage = this.currentLanguage
    this.currentLanguage = languageCode

    try {
      // Load translations if not already loaded
      if (!this.translations.has(languageCode)) {
        await this.loadTranslations(languageCode)
      }

      // Apply language settings
      this.applyLanguageToDOM()
      this.saveLanguage(languageCode)
      this.notifyLanguageChange(languageCode, previousLanguage)

      return true
    } catch (error) {
      console.error('Failed to set language:', error)
      this.currentLanguage = previousLanguage
      return false
    }
  }

  /**
   * Translate text with interpolation and pluralization
   */
  t(key, variables = {}) {
    // Check cache first
    const cacheKey = `${this.currentLanguage}:${key}:${JSON.stringify(variables)}`
    if (this.translationCache.has(cacheKey)) {
      return this.translationCache.get(cacheKey)
    }

    let translation = this.getTranslation(key)

    // Handle pluralization
    if (typeof translation === 'object' && translation !== null && 'count' in variables) {
      const pluralRule = this.getPluralRule(this.currentLanguage, variables.count)
      translation = translation[pluralRule] || translation.other || key
    }

    // Handle interpolation
    if (typeof translation === 'string') {
      translation = this.interpolate(translation, variables)
    }

    // Cache the result
    this.translationCache.set(cacheKey, translation)

    return translation || key
  }

  /**
   * Get raw translation without processing
   */
  getTranslation(key) {
    const translations = this.translations.get(this.currentLanguage)
    if (!translations) {
      return null
    }

    // Support nested keys like 'menu.file.new'
    const keys = key.split('.')
    let value = translations

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        return null
      }
    }

    return value
  }

  /**
   * Interpolate variables in translation string
   */
  interpolate(template, variables) {
    return template.replace(/\{(\w+)\}/g, (match, varName) => {
      return variables[varName] !== undefined ? variables[varName] : match
    })
  }

  /**
   * Get plural rule for language and count
   */
  getPluralRule(languageCode, count) {
    // Handle special cases for known languages
    switch (languageCode) {
      case 'ru':
      case 'uk':
        return this.getRussianPluralRule(count)
      case 'ar':
        return this.getArabicPluralRule(count)
      case 'zh':
      case 'ja':
      case 'ko':
        return 'other' // No pluralization
      default:
        return this.getEnglishPluralRule(count)
    }
  }

  /**
   * English pluralization rules
   */
  getEnglishPluralRule(count) {
    return count === 1 ? 'one' : 'other'
  }

  /**
   * Russian pluralization rules (complex)
   */
  getRussianPluralRule(count) {
    const mod10 = count % 10
    const mod100 = count % 100

    if (count === 1) return 'one'
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few'
    return 'many'
  }

  /**
   * Arabic pluralization rules
   */
  getArabicPluralRule(count) {
    if (count === 0) return 'zero'
    if (count === 1) return 'one'
    if (count === 2) return 'two'
    if (count >= 3 && count <= 10) return 'few'
    if (count >= 11 && count <= 99) return 'many'
    return 'other'
  }

  /**
   * Check if language is RTL
   */
  isRTL(languageCode = this.currentLanguage) {
    return this.rtlLanguages.includes(languageCode)
  }

  /**
   * Apply language settings to DOM
   */
  applyLanguageToDOM() {
    // Set language attribute
    document.documentElement.lang = this.currentLanguage

    // Set direction
    const direction = this.isRTL() ? 'rtl' : 'ltr'
    document.documentElement.dir = direction

    // Add/remove CSS classes
    document.documentElement.classList.remove('rtl', 'ltr')
    document.documentElement.classList.add(direction)
  }

  /**
   * Detect system language from navigator
   */
  detectSystemLanguage() {
    if (typeof navigator === 'undefined') {
      return 'en'
    }

    // Check navigator.language first
    if (navigator.language) {
      const lang = this.extractLanguageCode(navigator.language)
      if (this.isLanguageSupported(lang)) {
        return lang
      }
    }

    // Check navigator.languages array
    if (navigator.languages) {
      for (const language of navigator.languages) {
        const lang = this.extractLanguageCode(language)
        if (this.isLanguageSupported(lang)) {
          return lang
        }
      }
    }

    return 'en' // Fallback to English
  }

  /**
   * Extract language code from locale string
   */
  extractLanguageCode(locale) {
    return locale.split('-')[0].toLowerCase()
  }

  /**
   * Check if language is supported
   */
  isLanguageSupported(languageCode) {
    return this.supportedLanguages.includes(languageCode)
  }

  /**
   * Load translations for specified language
   */
  async loadTranslations(languageCode) {
    // Skip if already loaded
    if (this.translations.has(languageCode)) {
      return true
    }

    try {
      // Load all translation files for the language
      const translationFiles = ['common', 'editor', 'gutenberg', 'themes']
      const translations = {}

      for (const file of translationFiles) {
        try {
          const response = await fetch(`/src/locales/${languageCode}/${file}.json`)
          if (response.ok) {
            const fileTranslations = await response.json()
            Object.assign(translations, fileTranslations)
          }
        } catch (error) {
          console.warn(`Failed to load ${file}.json for ${languageCode}:`, error)
        }
      }

      this.translations.set(languageCode, translations)
      return true
    } catch (error) {
      console.error(`Failed to load translations for ${languageCode}:`, error)
      return false
    }
  }

  /**
   * Format date according to current locale
   */
  formatDate(date, options = {}) {
    try {
      const formatter = new Intl.DateTimeFormat(this.currentLanguage, {
        dateStyle: 'medium',
        ...options
      })
      return formatter.format(date)
    } catch (error) {
      console.warn('Date formatting failed:', error)
      return date.toLocaleDateString()
    }
  }

  /**
   * Format time according to current locale
   */
  formatTime(date, options = {}) {
    try {
      const formatter = new Intl.DateTimeFormat(this.currentLanguage, {
        timeStyle: 'short',
        ...options
      })
      return formatter.format(date)
    } catch (error) {
      console.warn('Time formatting failed:', error)
      return date.toLocaleTimeString()
    }
  }

  /**
   * Format relative time
   */
  formatRelativeTime(date) {
    try {
      const formatter = new Intl.RelativeTimeFormat(this.currentLanguage, {
        numeric: 'auto'
      })

      const now = new Date()
      const diffInSeconds = Math.floor((date - now) / 1000)
      const diffInMinutes = Math.floor(diffInSeconds / 60)
      const diffInHours = Math.floor(diffInMinutes / 60)
      const diffInDays = Math.floor(diffInHours / 24)

      if (Math.abs(diffInDays) >= 1) {
        return formatter.format(diffInDays, 'day')
      } else if (Math.abs(diffInHours) >= 1) {
        return formatter.format(diffInHours, 'hour')
      } else if (Math.abs(diffInMinutes) >= 1) {
        return formatter.format(diffInMinutes, 'minute')
      } else {
        return formatter.format(diffInSeconds, 'second')
      }
    } catch (error) {
      console.warn('Relative time formatting failed:', error)
      return date.toLocaleString()
    }
  }

  /**
   * Format number according to current locale
   */
  formatNumber(number, options = {}) {
    try {
      const formatter = new Intl.NumberFormat(this.currentLanguage, options)
      return formatter.format(number)
    } catch (error) {
      console.warn('Number formatting failed:', error)
      return number.toString()
    }
  }

  /**
   * Format currency
   */
  formatCurrency(amount, currency, options = {}) {
    return this.formatNumber(amount, {
      style: 'currency',
      currency,
      ...options
    })
  }

  /**
   * Format percentage
   */
  formatPercentage(value, options = {}) {
    return this.formatNumber(value, {
      style: 'percent',
      ...options
    })
  }

  /**
   * Get language metadata
   */
  getLanguageMetadata(languageCode) {
    const metadata = {
      en: { name: 'English', nativeName: 'English', rtl: false },
      es: { name: 'Spanish', nativeName: 'Español', rtl: false },
      fr: { name: 'French', nativeName: 'Français', rtl: false },
      de: { name: 'German', nativeName: 'Deutsch', rtl: false },
      it: { name: 'Italian', nativeName: 'Italiano', rtl: false },
      pt: { name: 'Portuguese', nativeName: 'Português', rtl: false },
      ru: { name: 'Russian', nativeName: 'Русский', rtl: false },
      ja: { name: 'Japanese', nativeName: '日本語', rtl: false },
      ko: { name: 'Korean', nativeName: '한국어', rtl: false },
      zh: { name: 'Chinese', nativeName: '中文', rtl: false },
      ar: { name: 'Arabic', nativeName: 'العربية', rtl: true },
      he: { name: 'Hebrew', nativeName: 'עברית', rtl: true },
      fa: { name: 'Persian', nativeName: 'فارسی', rtl: true }
    }

    return metadata[languageCode] || { name: languageCode, nativeName: languageCode, rtl: false }
  }

  /**
   * Get all language metadata
   */
  getAllLanguageMetadata() {
    return this.supportedLanguages.map((code) => ({
      code,
      ...this.getLanguageMetadata(code)
    }))
  }

  /**
   * Register language change callback
   */
  onLanguageChange(callback) {
    if (typeof callback === 'function') {
      this.eventCallbacks.push(callback)
    }
  }

  /**
   * Notify language change listeners
   */
  notifyLanguageChange(newLanguage, previousLanguage) {
    this.eventCallbacks.forEach((callback) => {
      try {
        callback(newLanguage, previousLanguage)
      } catch (error) {
        console.error('Language change callback error:', error)
      }
    })
  }

  /**
   * Save language preference to localStorage
   */
  saveLanguage(languageCode) {
    try {
      localStorage.setItem('fantasy-forgewright-language', languageCode)
    } catch (error) {
      console.warn('Failed to save language preference:', error)
    }
  }

  /**
   * Get saved language from localStorage
   */
  getSavedLanguage() {
    try {
      return localStorage.getItem('fantasy-forgewright-language')
    } catch (error) {
      console.warn('Failed to get saved language:', error)
      return null
    }
  }

  /**
   * Clear translation cache
   */
  clearCache() {
    this.translationCache.clear()
  }
}
