import { describe, it, expect } from "vitest";
import { cameraNeedsGesture } from "./cameraGesture";

const nav = (userAgent: string, maxTouchPoints = 0): Navigator =>
  ({ userAgent, maxTouchPoints }) as Navigator;

// Real-world UA strings (trimmed) for the browsers that matter here.
const UA = {
  iosSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  iosChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Mobile/15E148 Safari/604.1",
  iosFirefox:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/127.0 Mobile/15E148 Safari/604.1",
  iosEdge:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/126.0 Mobile/15E148 Safari/604.1",
  ipadOsSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  ipadOsChrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0 Safari/605.1.15",
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  desktopChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
};

describe("cameraNeedsGesture", () => {
  it("returns true for iOS third-party browsers (they reject gesture-less getUserMedia)", () => {
    expect(cameraNeedsGesture(nav(UA.iosChrome))).toBe(true);
    expect(cameraNeedsGesture(nav(UA.iosFirefox))).toBe(true);
    expect(cameraNeedsGesture(nav(UA.iosEdge))).toBe(true);
    // iPadOS Chrome reports as "Macintosh" but has a touch screen + CriOS token.
    expect(cameraNeedsGesture(nav(UA.ipadOsChrome, 5))).toBe(true);
  });

  it("returns false for iOS Safari (prompts fine on auto-start)", () => {
    expect(cameraNeedsGesture(nav(UA.iosSafari))).toBe(false);
    // iPadOS Safari masquerades as a Mac; touch points reveal it's really an iPad.
    expect(cameraNeedsGesture(nav(UA.ipadOsSafari, 5))).toBe(false);
  });

  it("returns false for non-iOS browsers", () => {
    expect(cameraNeedsGesture(nav(UA.macSafari))).toBe(false);
    expect(cameraNeedsGesture(nav(UA.desktopChrome))).toBe(false);
    expect(cameraNeedsGesture(nav(UA.androidChrome))).toBe(false);
  });
});
