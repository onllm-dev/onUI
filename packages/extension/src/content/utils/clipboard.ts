/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // Fallback for older browsers or when clipboard API is not available
    return fallbackCopyToClipboard(text);
  }
}

/**
 * Fallback copy method using execCommand
 */
function fallbackCopyToClipboard(text: string): boolean {
  const textArea = document.createElement('textarea');
  textArea.value = text;

  // Avoid scrolling to bottom
  textArea.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 2em;
    height: 2em;
    padding: 0;
    border: none;
    outline: none;
    boxShadow: none;
    background: transparent;
  `;

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (error) {
    document.body.removeChild(textArea);
    return false;
  }
}
