const SHADOW_HOST_ID = 'onui-shadow-host';

/**
 * Creates and manages a Shadow DOM host for isolating extension UI
 * from the host page's styles
 */
export class ShadowHost {
  private host: HTMLDivElement | null = null;
  private shadow: ShadowRoot | null = null;

  /**
   * Initialize the shadow host if not already present
   */
  init(): ShadowRoot {
    if (this.shadow) {
      return this.shadow;
    }

    // Check if host already exists (page navigation)
    let existingHost = document.getElementById(SHADOW_HOST_ID) as HTMLDivElement | null;

    if (existingHost) {
      this.host = existingHost;
      this.shadow = existingHost.shadowRoot;
      if (this.shadow) {
        return this.shadow;
      }
    }

    // Create new host element
    this.host = document.createElement('div');
    this.host.id = SHADOW_HOST_ID;

    // Style to ensure host doesn't affect page layout
    this.host.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 0;
      height: 0;
      overflow: visible;
      z-index: 2147483647;
      pointer-events: none;
    `;

    // Create closed shadow root for style isolation
    this.shadow = this.host.attachShadow({ mode: 'closed' });

    // Append to body
    document.body.appendChild(this.host);

    return this.shadow;
  }

  /**
   * Get the shadow root
   */
  getShadowRoot(): ShadowRoot | null {
    return this.shadow;
  }

  /**
   * Destroy the shadow host
   */
  destroy(): void {
    if (this.host && this.host.parentNode) {
      this.host.parentNode.removeChild(this.host);
    }
    this.host = null;
    this.shadow = null;
  }
}

// Singleton instance
export const shadowHost = new ShadowHost();
