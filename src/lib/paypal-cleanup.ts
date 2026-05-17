/**
 * Selectors for elements to hide when the PayPal button becomes visible.
 * Add or remove selectors here to adjust what gets hidden.
 */
const SELECTORS_TO_HIDE = [
  '.chat-notices',
  '.privacy-notice',
  '.chat-messages',
  '[class*="bg-amber-50"]',
  '[class*="bg-red-50"]',
];

const PAYPAL_CONTAINER_ID = 'paypal-button-container';

let resizeObserver: ResizeObserver | null = null;
let lastObservedHeight = 0;

function hideDistractions(): void {
  SELECTORS_TO_HIDE.forEach((selector) => {
    document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      el.style.display = 'none';
    });
  });
  document.documentElement.classList.add('payment-active');
}

export function restoreDistractions(): void {
  SELECTORS_TO_HIDE.forEach((selector) => {
    document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      el.style.display = '';
    });
  });
  document.documentElement.classList.remove('payment-active');
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  lastObservedHeight = 0;
}

function isPayPalButtonRendered(container: HTMLElement): boolean {
  return container.querySelector('iframe, .paypal-buttons, [class*="paypal-button"]') !== null;
}

function watchContainerResize(container: HTMLElement): void {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  lastObservedHeight = container.getBoundingClientRect().height;

  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const newHeight = entry.contentRect.height;
      if (newHeight > lastObservedHeight + 50) {
        container.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
      lastObservedHeight = newHeight;
    }
  });
  resizeObserver.observe(container);
}

export function observePayPalButton(): void {
  const container = document.getElementById(PAYPAL_CONTAINER_ID);
  if (!container) return;

  if (isPayPalButtonRendered(container)) {
    hideDistractions();
    watchContainerResize(container);
    return;
  }

  const observer = new MutationObserver(() => {
    if (isPayPalButtonRendered(container)) {
      hideDistractions();
      watchContainerResize(container);
      observer.disconnect();
    }
  });

  observer.observe(container, { childList: true, subtree: true });
}
