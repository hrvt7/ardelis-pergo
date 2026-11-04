import { describe, expect, it } from 'vitest'
import { isInAppBrowser, isIos, resolveArPath, unsupportedHint } from '../src/lib/arSupport'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const IPAD_DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'
const INSTAGRAM = `${IPHONE} Instagram 300.0.0`
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

describe('AR-út felismerése', () => {
  it('iPhone + Quick Look → quick-look; nélküle nem ígér AR-t', () => {
    expect(resolveArPath({ userAgent: IPHONE, quickLook: true, webxr: false })).toBe('quick-look')
    expect(resolveArPath({ userAgent: IPHONE, quickLook: false, webxr: false })).toBe('ios-unsupported')
  })
  it('iPadOS asztali user agenttel is iOS (érintőpontok alapján)', () => {
    expect(isIos({ userAgent: IPAD_DESKTOP, platform: 'MacIntel', maxTouchPoints: 5 })).toBe(true)
    expect(isIos({ userAgent: IPAD_DESKTOP, platform: 'MacIntel', maxTouchPoints: 0 })).toBe(false)
    expect(resolveArPath({ userAgent: IPAD_DESKTOP, platform: 'MacIntel', maxTouchPoints: 5, quickLook: true, webxr: false })).toBe('quick-look')
  })
  it('Android: WebXR → webxr; nélküle unsupported', () => {
    expect(resolveArPath({ userAgent: ANDROID, quickLook: false, webxr: true })).toBe('webxr')
    expect(resolveArPath({ userAgent: ANDROID, quickLook: false, webxr: false })).toBe('android-unsupported')
  })
  it('asztali gép → QR', () => {
    expect(resolveArPath({ userAgent: DESKTOP, platform: 'Win32', maxTouchPoints: 0, quickLook: false, webxr: false })).toBe('desktop')
  })
  it('alkalmazáson belüli böngészőnél a saját böngészőt javasolja', () => {
    expect(isInAppBrowser(INSTAGRAM)).toBe(true)
    expect(isInAppBrowser(IPHONE)).toBe(false)
    expect(unsupportedHint('ios-unsupported', INSTAGRAM)).toMatch(/saját böngészőjében/)
    expect(unsupportedHint('android-unsupported', ANDROID)).toMatch(/ARCore/)
  })
})
