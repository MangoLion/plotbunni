import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import RootApp from './RootApp.jsx'; // Import the new RootApp
import './index.css'
// DataProvider will be used within RootApp or its children where needed,
// specifically around the NovelEditor component (App.jsx).

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
)
