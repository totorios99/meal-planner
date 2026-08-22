import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
// Registers toHaveTextContent / toHaveAttribute / toBeDisabled etc. on expect().
import '@testing-library/jest-dom/vitest'

// happy-dom keeps the document between tests in a file, so an unmounted tree would otherwise
// linger and the next getByRole would match two elements.
afterEach(cleanup)

// jsdom and happy-dom both stub these to nothing useful. Defining them here rather than in each
// test keeps the failure honest: a component that needs them gets a working one, and a
// component that does not is unaffected.
if (!window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList
}

// CookMode acquires a Screen Wake Lock while cooking and already guards with
// `'wakeLock' in navigator`, so leaving it undefined exercises the guarded path — which is
// also what every desktop Firefox does.
