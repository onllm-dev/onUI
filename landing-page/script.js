(function () {
  const copyButtons = document.querySelectorAll('.copy-btn');

  copyButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const text = button.getAttribute('data-copy');
      if (!text) return;

      const original = button.textContent;

      try {
        await navigator.clipboard.writeText(text);
        button.textContent = 'Copied';
      } catch (error) {
        button.textContent = 'Copy failed';
      }

      window.setTimeout(() => {
        button.textContent = original;
      }, 1600);
    });
  });
})();
