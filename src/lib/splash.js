const SPLASH_KEY = 'splashShown'

/** מסך הפתיחה מוצג פעם אחת בכל session, ולא מוצג כלל למי שביקש פחות אנימציות */
export function shouldShowSplash() {
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
    return !sessionStorage.getItem(SPLASH_KEY)
  } catch {
    return true
  }
}

export function markSplashShown() {
  try { sessionStorage.setItem(SPLASH_KEY, '1') } catch { /* פרטי / חסום */ }
}
