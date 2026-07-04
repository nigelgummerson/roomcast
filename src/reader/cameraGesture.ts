// Whether this browser rejects a *gesture-less* camera start and so needs the
// reader to wait for an explicit tap before calling getUserMedia.
//
// The only browsers that do this are the third-party browsers on iOS —
// Chrome (CriOS), Firefox (FxiOS), Edge (EdgiOS), Opera (OPiOS), etc. They all
// run on WKWebView and reject an auto-started getUserMedia *silently* (no
// permission prompt). Safari itself, and every non-iOS browser (desktop, and
// Android Chrome), prompt happily on an auto-started camera — so those keep the
// zero-tap flow and we don't burden them with an extra step.
export function cameraNeedsGesture(nav: Navigator = navigator): boolean {
  const ua = nav.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports as "Macintosh"; disambiguate via touch support.
    (/Macintosh/.test(ua) && (nav.maxTouchPoints ?? 0) > 1);
  if (!isIOS) return false;
  // On iOS, Safari's UA has "Safari" but none of the third-party-browser tokens.
  const isSafari = /Safari/.test(ua) && !/(CriOS|FxiOS|EdgiOS|OPiOS|OPT)/.test(ua);
  return !isSafari;
}
