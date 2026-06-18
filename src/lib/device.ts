/**
 * True only for an actual touch-driven phone/tablet — never for desktop,
 * and never for the Адаптивність self-iframe mockup (that iframe is narrow
 * but still driven by a real desktop mouse, so `maxTouchPoints` is 0 there).
 * Both conditions must hold together; neither alone is a reliable signal.
 */
export function isRealMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return navigator.maxTouchPoints > 0 && window.innerWidth < 768;
}
