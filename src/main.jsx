import { StrictMode, Suspense } from 'react' // Add Suspense
import { createRoot } from 'react-dom/client'
import './i18n'; // Import the i18n configuration
import RootApp from './RootApp.jsx'; // Import the new RootApp
import './index.css'
// DataProvider will be used within RootApp or its children where needed,
// specifically around the NovelEditor component (App.jsx).

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={<div>Loading...</div>}> {/* Add Suspense */}
      <RootApp />
    </Suspense>
  </StrictMode>,
);

// Add 'loaded' class to body to hide spinner and show app
document.body.classList.add('loaded');
