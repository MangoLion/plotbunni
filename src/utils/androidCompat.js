/**
 * Android and mobile browser compatibility utilities
 */

// Detect Android device
export const isAndroid = () => {
  return /android/i.test(navigator.userAgent);
};

// Detect iOS device
export const isIOS = () => {
  return /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
};

// Detect mobile browser
export const isMobileDevice = () => {
  return /mobile|android|iphone|ipad|phone/i.test(navigator.userAgent.toLowerCase());
};

// Detect specific Android browser
export const getAndroidBrowser = () => {
  const ua = navigator.userAgent.toLowerCase();
  
  if (ua.includes('chrome')) return 'Chrome';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('safari')) return 'Safari';
  if (ua.includes('samsung')) return 'Samsung Internet';
  if (ua.includes('edge')) return 'Edge';
  
  return 'Unknown';
};

// Prevent viewport zoom issues
export const setupViewportOptimization = () => {
  const viewport = document.querySelector('meta[name="viewport"]');
  
  if (viewport) {
    // Allow user to zoom but prevent auto-zoom on input focus
    viewport.setAttribute(
      'content',
      'width=device-width, initial-scale=1.0, maximum-scale=5, user-scalable=yes, viewport-fit=cover'
    );
  }
};

// Handle safe area insets (notched devices)
export const applySafeAreaInsets = () => {
  const root = document.querySelector('#root');
  if (root) {
    const top = 'env(safe-area-inset-top)';
    const right = 'env(safe-area-inset-right)';
    const bottom = 'env(safe-area-inset-bottom)';
    const left = 'env(safe-area-inset-left)';
    
    root.style.paddingTop = `max(0px, ${top})`;
    root.style.paddingRight = `max(0px, ${right})`;
    root.style.paddingBottom = `max(0px, ${bottom})`;
    root.style.paddingLeft = `max(0px, ${left})`;
  }
};

// Prevent rubber band scrolling effect
export const disableRubberBandEffect = () => {
  let lastY = 0;
  
  document.addEventListener('touchstart', (e) => {
    lastY = e.touches[0].clientY;
  }, { passive: true });
  
  document.addEventListener('touchmove', (e) => {
    const currentY = e.touches[0].clientY;
    const scrollableElement = e.target.closest('[class*="overflow"]');
    
    if (scrollableElement) {
      const isAtTop = scrollableElement.scrollTop === 0;
      const isAtBottom = 
        scrollableElement.scrollHeight === 
        scrollableElement.scrollTop + scrollableElement.clientHeight;
      
      if ((isAtTop && currentY > lastY) || (isAtBottom && currentY < lastY)) {
        e.preventDefault();
      }
    }
  }, { passive: false });
};

// Ensure minimum touch target size
export const ensureTouchTargetSize = () => {
  const buttons = document.querySelectorAll('button, [role="button"], a');
  
  buttons.forEach(button => {
    const rect = button.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    
    if (size < 44) {
      button.style.minWidth = '44px';
      button.style.minHeight = '44px';
      button.style.display = 'inline-flex';
      button.style.alignItems = 'center';
      button.style.justifyContent = 'center';
    }
  });
};

// Handle orientation change
export const handleOrientationChange = (callback) => {
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      if (callback) callback(window.orientation);
    }, 100);
  });
};

// Initialize all Android/mobile optimizations
export const initializeAndroidCompat = () => {
  if (isMobileDevice()) {
    setupViewportOptimization();
    applySafeAreaInsets();
    disableRubberBandEffect();
    ensureTouchTargetSize();
    
    // Re-check touch targets on orientation change
    handleOrientationChange(() => {
      ensureTouchTargetSize();
    });
    
    console.log(`Plot Bunni initialized for ${getAndroidBrowser()} on ${isAndroid() ? 'Android' : 'iOS'}`);
  }
};

// Prevent zoom on input focus
export const preventZoomOnInputFocus = () => {
  const inputs = document.querySelectorAll('input, textarea, select');
  
  inputs.forEach(input => {
    input.addEventListener('focus', () => {
      document.querySelector('meta[name="viewport"]')?.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
      );
    });
    
    input.addEventListener('blur', () => {
      document.querySelector('meta[name="viewport"]')?.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=5, user-scalable=yes'
      );
    });
  });
};