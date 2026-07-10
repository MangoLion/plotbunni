import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './android-compat.css'
import { initializeAndroidCompat, preventZoomOnInputFocus } from './utils/androidCompat.js'
import { initializePerformanceOptimizations } from './utils/performanceOptimization.js'

// Initialize Android compatibility features
initializeAndroidCompat()
preventZoomOnInputFocus()
initializePerformanceOptimizations()

// Signal that the app has loaded
document.body.classList.add('loaded')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App novelId="default" />
  </React.StrictMode>,
)