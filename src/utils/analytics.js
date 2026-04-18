export function track(eventName, params = {}) {
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, params);
  }
  if (typeof window.clarity !== 'undefined') {
    window.clarity('event', eventName);
  }
}
