# Practical Guide: Implementing a React Theme System with CSS Variables

This guide provides a step-by-step tutorial for building a flexible, persistent theme system in a React application. It uses React Context for state management and CSS variables for dynamic styling, allowing for theme switching (light/dark/system), preset application, and individual color customization.

## Step 1: Create the Theme Context

The foundation of our system is a React Context that will provide theme state and functions to any component in your application.

**`src/context/ThemeContext.jsx`**
```jsx
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

// 1. Define your color presets
const defaultLightColors = {
  'background': '0 0% 100%',
  'foreground': '240 10% 3.9%',
  'primary': '240 5.9% 10%',
  'primary-foreground': '0 0% 98%',
  'card': '0 0% 100%',
  'border': '240 5.9% 90%',
  'input': '240 5.9% 90%',
};

const defaultDarkColors = {
  'background': '240 10% 3.9%',
  'foreground': '0 0% 98%',
  'primary': '0 0% 98%',
  'primary-foreground': '240 5.9% 10%',
  'card': '240 10% 3.9%',
  'border': '240 3.7% 15.9%',
  'input': '240 3.7% 15.9%',
};

// 2. Create the context
const ThemeContext = createContext();

// 3. Create the provider component
export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark', or 'system'
  const [lightColors, setLightColors] = useState(defaultLightColors);
  const [darkColors, setDarkColors] = useState(defaultDarkColors);
  const [osTheme, setOsTheme] = useState('light');

  // Effect to load settings from localStorage on mount
  useEffect(() => {
    const savedThemeMode = localStorage.getItem('theme_mode');
    const savedLightColors = localStorage.getItem('theme_light_colors');
    const savedDarkColors = localStorage.getItem('theme_dark_colors');

    if (savedThemeMode) setThemeMode(JSON.parse(savedThemeMode));
    if (savedLightColors) setLightColors(JSON.parse(savedLightColors));
    if (savedDarkColors) setDarkColors(JSON.parse(savedDarkColors));
  }, []);

  // Effect to save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('theme_mode', JSON.stringify(themeMode));
    localStorage.setItem('theme_light_colors', JSON.stringify(lightColors));
    localStorage.setItem('theme_dark_colors', JSON.stringify(darkColors));
  }, [themeMode, lightColors, darkColors]);

  // Effect to listen for OS theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setOsTheme(mediaQuery.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handleChange);
    handleChange(); // Initial check
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Effect to apply theme to the DOM
  useEffect(() => {
    let effectiveColors;
    let isDark;

    if (themeMode === 'system') {
      isDark = osTheme === 'dark';
      effectiveColors = isDark ? darkColors : lightColors;
    } else {
      isDark = themeMode === 'dark';
      effectiveColors = isDark ? darkColors : lightColors;
    }

    const root = document.documentElement;
    for (const [variable, hslValue] of Object.entries(effectiveColors)) {
      root.style.setProperty(`--${variable}`, hslValue);
    }

    root.classList.toggle('dark', isDark);
  }, [themeMode, lightColors, darkColors, osTheme]);

  // Function to update a single color value
  const updateUserColor = useCallback((mode, variableName, newHslValue) => {
    if (mode === 'light') {
      setLightColors(prev => ({ ...prev, [variableName]: newHslValue }));
    } else if (mode === 'dark') {
      setDarkColors(prev => ({ ...prev, [variableName]: newHslValue }));
    }
  }, []);

  const value = {
    themeMode,
    setThemeMode,
    lightColors,
    darkColors,
    updateUserColor,
    // You can add functions to apply presets here
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// 4. Create a custom hook for easy access
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
```

## Step 2: Integrate the Provider

Wrap your application's root component with the `ThemeProvider` to make the theme context available everywhere.

**`src/main.jsx` (or your app's entry point)**
```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import './index.css'; // Your global stylesheet

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
```

## Step 3: Define Base Styles with CSS Variables

Set up your global stylesheet to use the CSS variables that our context will manage.

**`src/index.css`**
```css
/* Define base styles for light mode (and as a fallback) */
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --card: 0 0% 100%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  /* ... add all other variables */
}

/* Define styles for dark mode */
.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 240 5.9% 10%;
  --card: 240 10% 3.9%;
  --border: 240 3.7% 15.9%;
  --input: 240 3.7% 15.9%;
  /* ... add all other variables */
}

/* Example usage */
body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}

.my-card {
  background-color: hsl(var(--card));
  border: 1px solid hsl(var(--border));
}
```

## Step 4: Build the UI Components

Create components that allow the user to interact with the theme system.

### Theme Switcher Component

This component provides buttons to change the `themeMode`.

**`src/components/ThemeSwitcher.jsx`**
```jsx
import React from 'react';
import { useTheme } from '../context/ThemeContext';

export const ThemeSwitcher = () => {
  const { themeMode, setThemeMode } = useTheme();

  return (
    <div>
      <h3>Theme Mode</h3>
      <button onClick={() => setThemeMode('light')} disabled={themeMode === 'light'}>Light</button>
      <button onClick={() => setThemeMode('dark')} disabled={themeMode === 'dark'}>Dark</button>
      <button onClick={() => setThemeMode('system')} disabled={themeMode === 'system'}>System</button>
    </div>
  );
};
```

### Individual Color Editor Component

This component allows users to change a specific color value for both light and dark themes.

**`src/components/ColorEditor.jsx`**
```jsx
import React from 'react';
import { useTheme } from '../context/ThemeContext';

// A simple mock color picker. In a real app, you'd use a library like 'react-color'.
const ColorInput = ({ label, value, onChange }) => (
  <div>
    <label>{label}: </label>
    <input 
      type="text" 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      style={{ border: '1px solid #ccc', padding: '4px' }}
    />
  </div>
);

export const ColorEditor = () => {
  const { lightColors, darkColors, updateUserColor } = useTheme();

  const handleColorChange = (mode, variable, value) => {
    // Basic validation for HSL format can be added here
    updateUserColor(mode, variable, value);
  };

  return (
    <div>
      <h3>Customize Colors</h3>
      
      <h4>Light Theme</h4>
      {Object.entries(lightColors).map(([variable, value]) => (
        <ColorInput
          key={`light-${variable}`}
          label={`--${variable}`}
          value={value}
          onChange={(newValue) => handleColorChange('light', variable, newValue)}
        />
      ))}

      <h4 style={{ marginTop: '1rem' }}>Dark Theme</h4>
      {Object.entries(darkColors).map(([variable, value]) => (
        <ColorInput
          key={`dark-${variable}`}
          label={`--${variable}`}
          value={value}
          onChange={(newValue) => handleColorChange('dark', variable, newValue)}
        />
      ))}
    </div>
  );
};
```

## Step 5: Use the Components in Your App

Finally, add your new components to your main `App` component.

**`src/App.jsx`**
```jsx
import React from 'react';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { ColorEditor } from './components/ColorEditor';

function App() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Theme Customization Demo</h1>
      <p>Change the theme and see the page update instantly.</p>
      
      <hr />
      <ThemeSwitcher />
      <hr />
      <ColorEditor />
      <hr />

      <h2>Example Component</h2>
      <div className="my-card" style={{ padding: '1rem', borderRadius: '8px' }}>
        This is a card component that uses the theme colors.
      </div>
    </div>
  );
}

export default App;
```

With these pieces in place, you have a fully functional and extensible theme system for your React project.
