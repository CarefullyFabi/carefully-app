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

function hideDistractions(): void {
  SELECTORS_TO_HIDE.forEach((selector) => {
    document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      el.style.display = 'none';
    });
  });
}

function isPayPalButtonRendered(container: HTMLElement): boolean {
  return container.querySelector('iframe, .paypal-buttons, [class*="paypal-button"]') !== null;
}

export function observePayPalButton(): void {
  const container = document.getElementById(PAYPAL_CONTAINER_ID);
  if (!container) return;

  if (isPayPalButtonRendered(container)) {
    hideDistractions();
    return;
  }

  const observer = new MutationObserver(() => {
    if (isPayPalButtonRendered(container)) {
      hideDistractions();
      observer.disconnect();
    }
  });

  observer.observe(container, { childList: true, subtree: true });
}
