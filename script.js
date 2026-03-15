/* =========================================================
   DUAL CODE HUB — script.js
   ========================================================= */

(function () {
  'use strict';

  /* ---------------------------------------------------------
     1. NAVBAR — scroll behaviour & mobile toggle
     --------------------------------------------------------- */
  const navbar   = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }, { passive: true });

  hamburger.addEventListener('click', () => {
    const isOpen = hamburger.classList.toggle('open');
    navLinks.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });

  // Close mobile menu when a link is clicked
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      navLinks.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---------------------------------------------------------
     2. SCROLL-REVEAL (IntersectionObserver)
     --------------------------------------------------------- */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  /* ---------------------------------------------------------
     3. SMOOTH SCROLL — anchor links
     --------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const navH = navbar.offsetHeight;
      const top  = target.getBoundingClientRect().top + window.scrollY - navH - 12;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ---------------------------------------------------------
     4. GEMINI IMAGE GENERATION
     --------------------------------------------------------- */
  const API_KEY = 'AIzaSyDSZW_w3lruATTvwZkKypIeuvaOG0W6RnI';
  const GEMINI_URL =
    'https://generativelanguage.googleapis.com/v1beta/models/' +
    'gemini-2.0-flash-preview-image-generation:generateContent?key=' + API_KEY;

  /**
   * Request a single image from Gemini and inject it into the DOM element.
   * @param {string} elementId  - ID of the container element
   * @returns {Promise<boolean>} - true on success, false on failure
   */
  async function generateImage(elementId) {
    const container = document.getElementById(elementId);
    if (!container) return false;

    const prompt = container.dataset.prompt;
    if (!prompt) return false;

    try {
      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['IMAGE'] }
        })
      });

      if (!response.ok) {
        throw new Error('HTTP ' + response.status + ': ' + response.statusText);
      }

      const json = await response.json();

      const parts = json?.candidates?.[0]?.content?.parts;
      if (!Array.isArray(parts)) throw new Error('Unexpected response shape');

      const imagePart = parts.find(p => p.inlineData?.data);
      if (!imagePart) throw new Error('No inline image data in response');

      const { mimeType, data: b64 } = imagePart.inlineData;

      // Build the <img> element
      const img = document.createElement('img');
      img.src = 'data:' + mimeType + ';base64,' + b64;
      img.alt = container.getAttribute('aria-label') || 'Imagen generada por IA';
      img.className = 'generated-image';

      // Hide loader once image is ready
      img.addEventListener('load', () => {
        const loader = container.querySelector('.img-loader');
        if (loader) loader.style.display = 'none';
        container.classList.add('has-image');
        // Trigger fade-in on next frame
        requestAnimationFrame(() => img.classList.add('image-visible'));
      });

      img.addEventListener('error', () => {
        hideLoader(container);
      });

      container.appendChild(img);
      return true;

    } catch (err) {
      console.warn('[Dual Code Hub] Image generation failed for #' + elementId + ':', err.message);
      hideLoader(container);
      return false;
    }
  }

  /** Remove the loading spinner from a container, showing the fallback gradient. */
  function hideLoader(container) {
    const loader = container.querySelector('.img-loader');
    if (loader) loader.style.display = 'none';
  }

  /**
   * Generate all images sequentially to stay within API rate limits.
   * Each call is separated by a short pause.
   */
  async function generateAllImages() {
    // IDs in the order they appear on the page
    const ids = [
      'img-hero',
      'img-enfoque-1',
      'img-enfoque-2',
      'img-pilar-1',
      'img-pilar-2',
      'img-pilar-3',
      'img-pilar-4',
      'img-valor-1',
      'img-valor-2'
    ];

    for (const id of ids) {
      await generateImage(id);
      // Brief pause between requests to respect rate limits
      await delay(600);
    }
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /* ---------------------------------------------------------
     5. INIT
     --------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    // Start image generation shortly after page is interactive
    setTimeout(generateAllImages, 800);
  });

}());
