import variablesCSS from './variables.css?inline';
import toolbarCSS from './toolbar.css?inline';
import popupCSS from './popup.css?inline';
import onuiCSS from './onui.css?inline';

/**
 * Inject all styles into a shadow root
 */
export function injectStyles(shadowRoot: ShadowRoot): void {
  const style = document.createElement('style');
  style.textContent = `
    ${variablesCSS}
    ${toolbarCSS}
    ${popupCSS}
    ${onuiCSS}
  `;
  shadowRoot.appendChild(style);
}

/**
 * Get combined styles as a string
 */
export function getStyles(): string {
  return `${variablesCSS}\n${toolbarCSS}\n${popupCSS}\n${onuiCSS}`;
}
