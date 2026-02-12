/**
 * onUI Landing Page Scripts
 * - Theme toggle with system preference detection
 * - Copy to clipboard functionality
 */

(function () {
  'use strict';

  // ============================================
  // Latest release badge
  // ============================================

  const releaseBadge = document.getElementById('release-badge');

  async function setLatestReleaseBadge() {
    if (!releaseBadge) return;

    const fallback = releaseBadge.getAttribute('data-fallback') || 'Stable — Public Release';

    try {
      const response = await fetch('https://api.github.com/repos/onllm-dev/onUI/releases/latest', {
        headers: {
          Accept: 'application/vnd.github+json',
        },
      });

      if (!response.ok) {
        releaseBadge.textContent = fallback;
        return;
      }

      const data = await response.json();
      const tag = typeof data.tag_name === 'string' ? data.tag_name : '';
      releaseBadge.textContent = tag ? `Stable — ${tag}` : fallback;
    } catch (_error) {
      releaseBadge.textContent = fallback;
    }
  }

  void setLatestReleaseBadge();

  // ============================================
  // Theme Toggle (Light/Dark Mode)
  // ============================================

  const THEME_KEY = 'onui-theme';
  const themeToggle = document.querySelector('.theme-toggle');

  // Get stored theme or system preference
  function getPreferredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) return stored;

    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  // Apply theme to document
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }

  // Initialize theme on page load
  setTheme(getPreferredTheme());

  // Toggle theme on button click
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      setTheme(next);
    });
  }

  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only auto-switch if user hasn't manually set a preference
    if (!localStorage.getItem(THEME_KEY)) {
      setTheme(e.matches ? 'dark' : 'light');
    }
  });

  // ============================================
  // Copy to Clipboard
  // ============================================

  const copyButtons = document.querySelectorAll('.copy-btn');

  copyButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const text = button.getAttribute('data-copy');
      if (!text) return;

      try {
        await navigator.clipboard.writeText(text);
        button.classList.add('copied');

        // Reset after animation
        setTimeout(() => {
          button.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    });
  });

  // ============================================
  // Smooth scroll for anchor links
  // ============================================

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || targetId === '#top') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
})();
