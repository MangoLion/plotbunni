/**
 * Performance optimization for Android and mobile devices
 */

// Reduce animation frame rate on low-end devices
export const optimizeAnimations = () => {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  
  if (mediaQuery.matches) {
    document.documentElement.style.setProperty('--animation-duration', '0.01ms');
  }
};

// Lazy load images
export const lazyLoadImages = () => {
  const images = document.querySelectorAll('img[data-src]');
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        observer.unobserve(img);
      }
    });
  });
  
  images.forEach(img => imageObserver.observe(img));
};

// Monitor connection and adjust quality
export const checkConnection = () => {
  if ('connection' in navigator) {
    const connection = navigator.connection;
    const effectiveType = connection.effectiveType;
    
    // Reduce quality on slow connections
    if (effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g') {
      document.documentElement.classList.add('low-bandwidth');
    }
    
    return effectiveType;
  }
};

// Debounce resize events
export const debounceResize = (callback, wait = 250) => {
  let timeout;
  
  window.addEventListener('resize', () => {
    clearTimeout(timeout);
    timeout = setTimeout(callback, wait);
  });
};

export const initializePerformanceOptimizations = () => {
  optimizeAnimations();
  lazyLoadImages();
  checkConnection();
};