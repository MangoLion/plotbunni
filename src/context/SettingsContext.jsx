import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Need to install uuid
import {
  defaultLightPreset,
  defaultDarkPreset,
  lightThemePresets,
  darkThemePresets
} from '../data/themePresets.js';

const APP_ID = "PLOTBUNNI";
const SETTINGS_STORAGE_KEY = `${APP_ID}_Settings`;

const DEFAULT_ENDPOINT_VALUES = {
  endpointUrl: 'https://mistral.lyonade.net/v1/chat/completions',
  apiToken: '',
  modelName: 'shuyuej/Mistral-Nemo-Instruct-2407-GPTQ',
  contextLength: 3900,
  maxOutputTokens: 1024,
};

const createDefaultProfile = () => ({
  id: uuidv4(),
  name: 'Default',
  useCustomEndpoint: false,
  ...DEFAULT_ENDPOINT_VALUES,
});

const TASK_KEYS = {
  PLANNER_OUTLINE: 'plannerOutlineWriting',
  SYNOPSIS: 'synopsisWriting',
  SCENE_TEXT: 'sceneTextWriting',
  CHAT: 'chatting',
  NOVEL_DESC: 'novelDescriptionWriting',
};

const DEFAULT_TASK_PROMPTS = {
  [TASK_KEYS.NOVEL_DESC]: "Write the synopsis for my novel. Don't include title or any other text or labels!",
  [TASK_KEYS.SYNOPSIS]: "write the synopsis for the next chapter scene.",
  [TASK_KEYS.SCENE_TEXT]: "Based on the provided scene synopsis and context, write the full text for this scene.",
  [TASK_KEYS.CHAT]: "Engage in a helpful conversation about the novel, offering ideas, answering questions, or discussing plot points.",
  [TASK_KEYS.PLANNER_OUTLINE]: 
  `Generate a comprehensive plot outline for a new novel based on the synopsis above. NO markdown, plaintext only!
Use indentation (tabs or spaces) to define acts, chapters, and scenes. Example: Act (no indent), Chapter (1 indent), Scene (2 indents), Synopsis (3 indents). Example format:
Act 1: The Beginning
    Chapter 1: A New Dawn
        Scene 1: Sunrise
            The sun rises over the sleepy town.
            Birds begin to chirp.
        Scene 2: The Mysterious Letter
            A mysterious letter arrives.
    Chapter 2: The Journey Starts
        Scene 1: Packing Up
            Our hero packs their bags.
Act 2: The Middle
    Chapter 3: Challenges
        Scene 1: The First Obstacle
            A difficult challenge is presented.
Act 1: The Beginning
    Chapter 4: A New Dawn
        Scene 1: Sunrise
            The sun rises over the sleepy town.
            Birds begin to chirp.
        Scene 2: The Mysterious Letter
            A mysterious letter arrives.
    Chapter 5: The Journey Starts
        Scene 1: Packing Up
            Our hero packs their bags.
Act 2: The Middle
    Chapter 6: Challenges
        Scene 1: The First Obstacle
            A difficult challenge is presented.`,
};

const createDefaultTaskSettings = (defaultProfileId = null) => ({
  [TASK_KEYS.PLANNER_OUTLINE]: {
    profileId: defaultProfileId,
    prompt: DEFAULT_TASK_PROMPTS[TASK_KEYS.PLANNER_OUTLINE],
  },
  [TASK_KEYS.SYNOPSIS]: {
    profileId: defaultProfileId,
    prompt: DEFAULT_TASK_PROMPTS[TASK_KEYS.SYNOPSIS],
  },
  [TASK_KEYS.SCENE_TEXT]: {
    profileId: defaultProfileId,
    prompt: DEFAULT_TASK_PROMPTS[TASK_KEYS.SCENE_TEXT],
  },
  [TASK_KEYS.CHAT]: {
    profileId: defaultProfileId,
    prompt: DEFAULT_TASK_PROMPTS[TASK_KEYS.CHAT],
  },
  [TASK_KEYS.NOVEL_DESC]: { // New task settings
    profileId: defaultProfileId,
    prompt: DEFAULT_TASK_PROMPTS[TASK_KEYS.NOVEL_DESC],
  },
});


// --- Helper Functions ---

// --- HSL Color Utility Functions (Module Scope) ---

// Helper to parse various HSL string formats to an HSL object {h, s, l}
// Handles "H S% L%", "H.D S.D% L.D%", and "hsl(H, S%, L%)"
// Returns null on failure to parse.
const robustParseHslString = (hslString) => {
  if (!hslString || typeof hslString !== 'string') return null;
  let match = hslString.match(/hsl\(\s*(\d+(\.\d+)?)\s*,\s*(\d+(\.\d+)?)%\s*,\s*(\d+(\.\d+)?)%\s*\)/i);
  if (match) {
    return {
      h: parseFloat(match[1]),
      s: parseFloat(match[3]),
      l: parseFloat(match[5]),
    };
  }
  // Matches "210 40% 50%" or "210.5 40.5% 50.5%"
  match = hslString.match(/(\d+(\.\d+)?)\s+(\d+(\.\d+)?)%\s+(\d+(\.\d+)?)%/i);
  if (match) {
    return {
      h: parseFloat(match[1]),
      s: parseFloat(match[3]),
      l: parseFloat(match[5]),
    };
  }
  // console.warn("Could not parse HSL string:", hslString);
  return null;
};

// Helper to format HSL object {h, s, l} to canonical "H.D S.D% L.D%" string
const formatHslObjectToCanonicalString = (hslObject) => {
  if (!hslObject || typeof hslObject.h === 'undefined' || typeof hslObject.s === 'undefined' || typeof hslObject.l === 'undefined') {
    // console.warn("Invalid HSL object for formatting:", hslObject);
    return "0.0 0.0% 0.0%"; // Fallback
  }
  const h = ((Number(hslObject.h) % 360) + 360) % 360;
  const s = Math.max(0, Math.min(100, Number(hslObject.s)));
  const l = Math.max(0, Math.min(100, Number(hslObject.l)));
  return `${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%`;
};

// Helper to compare two HSL objects with tolerance
const compareHslObjects = (hsl1, hsl2, hTol = 1, slTol = 1) => {
  if (!hsl1 || !hsl2) return false;
  const h1Norm = ((Number(hsl1.h) % 360) + 360) % 360;
  const h2Norm = ((Number(hsl2.h) % 360) + 360) % 360;
  const hueDiff = Math.abs(h1Norm - h2Norm);
  const hMatch = Math.min(hueDiff, 360 - hueDiff) <= hTol;
  const sMatch = Math.abs(Number(hsl1.s) - Number(hsl2.s)) <= slTol;
  const lMatch = Math.abs(Number(hsl1.l) - Number(hsl2.l)) <= slTol;
  return hMatch && sMatch && lMatch;
};

// Helper to compare two sets of HSL color objects
const areColorsObjectsEqual = (objSet1, objSet2) => {
  if (!objSet1 || !objSet2) return objSet1 === objSet2; // Both null/undefined or not
  const keys1 = Object.keys(objSet1);
  const keys2 = Object.keys(objSet2);
  if (keys1.length === 0 && keys2.length === 0) return true;
  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!objSet2.hasOwnProperty(key)) return false;
    if (!compareHslObjects(objSet1[key], objSet2[key])) {
      return false;
    }
  }
  return true;
};


const loadSettings = () => {
  try {
    const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (storedSettings) {
      const parsed = JSON.parse(storedSettings);
      // Basic validation/migration
      const validProfiles = (parsed.endpointProfiles && Array.isArray(parsed.endpointProfiles) && parsed.endpointProfiles.length > 0)
        ? parsed.endpointProfiles
        : [createDefaultProfile()];
      
      const defaultProfileIdForTasks = validProfiles[0].id;

      let taskSettings = parsed.taskSettings || createDefaultTaskSettings(defaultProfileIdForTasks);

      // Ensure all task keys exist and have valid profile IDs
      Object.values(TASK_KEYS).forEach(taskKey => {
        if (!taskSettings[taskKey]) {
          taskSettings[taskKey] = {
            profileId: defaultProfileIdForTasks,
            prompt: DEFAULT_TASK_PROMPTS[taskKey] || "",
          };
        } else {
          if (!taskSettings[taskKey].profileId || !validProfiles.find(p => p.id === taskSettings[taskKey].profileId)) {
            taskSettings[taskKey].profileId = defaultProfileIdForTasks;
          }
          if (typeof taskSettings[taskKey].prompt !== 'string') {
             taskSettings[taskKey].prompt = DEFAULT_TASK_PROMPTS[taskKey] || "";
          }
        }
      });
      
      return {
        endpointProfiles: validProfiles,
        themeMode: parsed.themeMode || 'system',
        userLightColors: parsed.userLightColors || { ...defaultLightPreset.colors },
        userDarkColors: parsed.userDarkColors || { ...defaultDarkPreset.colors },
        taskSettings: taskSettings,
        systemPrompt: parsed.systemPrompt || "You are an experienced creative writing assistant", // Updated default
      };
    }
  } catch (error) {
    console.error("Error loading settings from localStorage:", error);
  }
  // Return default structure if loading fails or no settings found
  const defaultProfiles = [createDefaultProfile()];
  const defaultProfileId = defaultProfiles[0].id;
  return {
    endpointProfiles: defaultProfiles,
    themeMode: 'system',
    userLightColors: { ...defaultLightPreset.colors },
    userDarkColors: { ...defaultDarkPreset.colors },
    taskSettings: createDefaultTaskSettings(defaultProfileId),
    systemPrompt: "You are an experienced creative writing assistant", // Updated default
  };
};

const saveSettings = (settings) => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving settings to localStorage:", error);
  }
};

// --- Context Definition ---

const SettingsContext = createContext();

export const AVAILABLE_FONTS = [
  { id: 'Inter', name: 'Inter', stack: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' },
  { id: 'Roboto', name: 'Roboto', stack: '"Roboto", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' },
  { id: 'OpenSans', name: 'Open Sans', stack: '"Open Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' },
  { id: 'Lato', name: 'Lato', stack: '"Lato", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' },
  { id: 'Montserrat', name: 'Montserrat', stack: '"Montserrat", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' },
  { id: 'SourceSans3', name: 'Source Sans 3', stack: '"Source Sans 3", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' },
  { id: 'Poppins', name: 'Poppins', stack: '"Poppins", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"' },
];
const DEFAULT_FONT_FAMILY = AVAILABLE_FONTS[0].id; // Inter
const DEFAULT_FONT_SIZE = 16; // in pixels

export const SettingsProvider = ({ children }) => {
  const [endpointProfiles, setEndpointProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Theme state
  const [themeMode, setThemeModeState] = useState('system'); // 'light', 'dark', 'system'
  const [userLightColors, setUserLightColorsState] = useState({ ...defaultLightPreset.colors });
  const [userDarkColors, setUserDarkColorsState] = useState({ ...defaultDarkPreset.colors });
  const [activeOsTheme, setActiveOsTheme] = useState('light');

  // Font and Size state
  const [fontFamily, setFontFamilyState] = useState(DEFAULT_FONT_FAMILY);
  const [fontSize, setFontSizeState] = useState(DEFAULT_FONT_SIZE);

  // Task settings state
  const [taskSettings, setTaskSettings] = useState(createDefaultTaskSettings());

  // System Prompt state
  const [systemPrompt, setSystemPrompt] = useState("You are an experienced creative writing assistant"); // Updated default initial state


  // Load settings on initial mount
  useEffect(() => {
    const loaded = loadSettings();
    
    setEndpointProfiles(loaded.endpointProfiles);
    // Ensure activeProfileId is valid or set to the first profile
    const firstProfileId = loaded.endpointProfiles.length > 0 ? loaded.endpointProfiles[0].id : null;
    setActiveProfileId(loaded.endpointProfiles.find(p => p.id === activeProfileId) ? activeProfileId : firstProfileId);

    setThemeModeState(loaded.themeMode);
    setUserLightColorsState(loaded.userLightColors);
    setUserDarkColorsState(loaded.userDarkColors);
    setFontFamilyState(loaded.fontFamily || DEFAULT_FONT_FAMILY);
    setFontSizeState(loaded.fontSize || DEFAULT_FONT_SIZE);
    setSystemPrompt(loaded.systemPrompt); // Load systemPrompt
    
    // Ensure task settings have valid profile IDs after profiles are loaded
    const updatedTaskSettings = { ...loaded.taskSettings };
    let settingsUpdated = false;
    Object.values(TASK_KEYS).forEach(taskKey => {
      if (!updatedTaskSettings[taskKey] || !updatedTaskSettings[taskKey].profileId || !loaded.endpointProfiles.find(p => p.id === updatedTaskSettings[taskKey].profileId)) {
        updatedTaskSettings[taskKey] = {
          ...updatedTaskSettings[taskKey], // keep existing prompt if any
          prompt: updatedTaskSettings[taskKey]?.prompt || DEFAULT_TASK_PROMPTS[taskKey],
          profileId: firstProfileId,
        };
        settingsUpdated = true;
      }
    });
    setTaskSettings(updatedTaskSettings);

    setIsLoaded(true);
  }, []); // Empty dependency array means this runs once on mount

  // Save settings whenever profiles, theme, or task settings change
  useEffect(() => {
    if (isLoaded) {
      saveSettings({
        endpointProfiles,
        themeMode,
        userLightColors,
        userDarkColors,
        fontFamily,
        fontSize,
        taskSettings, // Add taskSettings to save
        systemPrompt, // Add systemPrompt to save
      });
    }
  }, [endpointProfiles, themeMode, userLightColors, userDarkColors, fontFamily, fontSize, taskSettings, systemPrompt, isLoaded]); // Add systemPrompt dependency

  // OS theme listener
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setActiveOsTheme(mediaQuery.matches ? 'dark' : 'light');
    
    mediaQuery.addEventListener('change', handleChange);
    handleChange(); // Initial check

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (!isLoaded) return;

    let effectiveColors;
    let isDark;

    if (themeMode === 'light') {
      effectiveColors = userLightColors;
      isDark = false;
    } else if (themeMode === 'dark') {
      effectiveColors = userDarkColors;
      isDark = true;
    } else { // system
      effectiveColors = activeOsTheme === 'dark' ? userDarkColors : userLightColors;
      isDark = activeOsTheme === 'dark';
    }

    // Apply the raw HSL values directly to the CSS variables
    for (const [variable, hslValue] of Object.entries(effectiveColors)) {
      document.documentElement.style.setProperty(`--${variable}`, hslValue); // Corrected: Apply raw HSL string
    }

    // Apply font family and font size
    const selectedFont = AVAILABLE_FONTS.find(f => f.id === fontFamily) || AVAILABLE_FONTS[0];
    document.documentElement.style.setProperty('--font-sans', selectedFont.stack);
    document.documentElement.style.setProperty('--font-size-base', `${fontSize}px`);

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [themeMode, userLightColors, userDarkColors, activeOsTheme, fontFamily, fontSize, isLoaded]);

  // Effect to guess theme based on current CSS and align state
  useEffect(() => {
    if (!isLoaded) return;

    const getComputedCssThemeObjects = () => {
      const colors = {};
      // Assuming defaultLightPreset.colors has all the standard CSS variable keys
      const colorKeys = Object.keys(defaultLightPreset.colors);
      if (colorKeys.length === 0) return null; // No keys to check

      for (const key of colorKeys) {
        const rawValue = getComputedStyle(document.documentElement).getPropertyValue(`--${key}`).trim();
        if (rawValue) {
          const parsedHsl = robustParseHslString(rawValue);
          if (parsedHsl) {
            colors[key] = parsedHsl;
          } else {
            // console.warn(`Failed to parse CSS variable --${key}: '${rawValue}' during guessing.`);
            return null; // Bail out if any color is unparsable
          }
        } else {
    // console.warn(`CSS variable --${key} not found during guessing.`);
          return null; // CSS variable not set, cannot reliably guess
        }
      }
      return Object.keys(colors).length === colorKeys.length ? colors : null;
    };

    const currentCssColorObjects = getComputedCssThemeObjects();

    if (!currentCssColorObjects) {
      // console.log("Theme guessing: Could not reliably read current CSS theme colors or they are not fully set/parsable.");
      return;
    }

    // Helper to compare live CSS HSL objects with preset HSL strings
    // This function is now defined inside useEffect, but it uses module-scope robustParseHslString and compareHslObjects
    const compareCssObjectsWithPresetStrings = (cssObjects, presetStrings) => {
      const cssKeys = Object.keys(cssObjects);
      const presetKeys = Object.keys(presetStrings);
      if (cssKeys.length === 0 || cssKeys.length !== presetKeys.length) return false;

      for (const key of cssKeys) {
        if (!presetStrings.hasOwnProperty(key)) return false;
        const presetHslObject = robustParseHslString(presetStrings[key]); // Uses module-scope robustParseHslString
        if (!presetHslObject || !compareHslObjects(cssObjects[key], presetHslObject)) { // Uses module-scope compareHslObjects
          return false;
        }
      }
      return true;
    };
    
    let newThemeMode = themeMode;
    let newLightColors = userLightColors; // These are string objects
    let newDarkColors = userDarkColors;   // These are string objects
    let stateChanged = false;

    if (themeMode === 'system') {
      const targetPresets = activeOsTheme === 'dark' ? darkThemePresets : lightThemePresets;
      const targetDefaultPresetColors = activeOsTheme === 'dark' ? defaultDarkPreset.colors : defaultLightPreset.colors;
      const currentUserColorsForOS = activeOsTheme === 'dark' ? userDarkColors : userLightColors;

      let matchedPreset = targetPresets.find(p => compareCssObjectsWithPresetStrings(currentCssColorObjects, p.colors));

      if (matchedPreset) {
        const effectiveMode = activeOsTheme === 'dark' ? 'dark' : 'light';
        if (themeMode !== effectiveMode) {
          newThemeMode = effectiveMode;
          stateChanged = true;
        }
        if (activeOsTheme === 'dark') {
          if (!compareCssObjectsWithPresetStrings(currentCssColorObjects, userDarkColors)) { // Check if update is needed
             newDarkColors = { ...matchedPreset.colors }; // preset colors are strings
             stateChanged = true;
          }
        } else { // light
          if (!compareCssObjectsWithPresetStrings(currentCssColorObjects, userLightColors)) {
            newLightColors = { ...matchedPreset.colors };
            stateChanged = true;
          }
        }
      } else if (compareCssObjectsWithPresetStrings(currentCssColorObjects, targetDefaultPresetColors)) {
        const effectiveMode = activeOsTheme === 'dark' ? 'dark' : 'light';
         if (themeMode !== effectiveMode) {
          newThemeMode = effectiveMode;
          stateChanged = true;
        }
        if (activeOsTheme === 'dark') {
          if (!compareCssObjectsWithPresetStrings(currentCssColorObjects, userDarkColors)) {
            newDarkColors = { ...targetDefaultPresetColors };
            stateChanged = true;
          }
        } else { // light
          if (!compareCssObjectsWithPresetStrings(currentCssColorObjects, userLightColors)) {
            newLightColors = { ...targetDefaultPresetColors };
            stateChanged = true;
          }
        }
      } else {
        // CSS doesn't match any known preset for the current OS theme.
        // Check if it matches the current user colors for this OS theme.
        const currentUserColorsForOSObjects = {};
        for (const key in currentUserColorsForOS) {
            currentUserColorsForOSObjects[key] = robustParseHslString(currentUserColorsForOS[key]);
        }
        if (!areColorsObjectsEqual(currentCssColorObjects, currentUserColorsForOSObjects)) {
            // Live CSS is some custom theme not reflected in state for this OS theme. Adopt it.
            const liveCssAsStrings = {};
            for (const key in currentCssColorObjects) {
                liveCssAsStrings[key] = formatHslObjectToCanonicalString(currentCssColorObjects[key]);
            }
            if (activeOsTheme === 'dark') {
                newDarkColors = liveCssAsStrings;
            } else {
                newLightColors = liveCssAsStrings;
            }
            stateChanged = true;
            // console.log(`System mode (${activeOsTheme}): Adopted live custom CSS into user colors.`);
        }
      }
    } else { // themeMode is 'light' or 'dark'
      const currentPresets = themeMode === 'dark' ? darkThemePresets : lightThemePresets;
      const currentUserColors = themeMode === 'dark' ? userDarkColors : userLightColors;
      
      let matchedPreset = currentPresets.find(p => compareCssObjectsWithPresetStrings(currentCssColorObjects, p.colors));

      if (matchedPreset) {
        // CSS matches a known preset for the current explicit mode.
        // Check if current userColors state already reflects this preset.
        const currentPresetColorsObjects = {};
         for(const key in matchedPreset.colors) currentPresetColorsObjects[key] = robustParseHslString(matchedPreset.colors[key]);
        
        const currentUserColorsObjects = {};
        for(const key in currentUserColors) currentUserColorsObjects[key] = robustParseHslString(currentUserColors[key]);

        if(!areColorsObjectsEqual(currentUserColorsObjects, currentPresetColorsObjects)){
            if (themeMode === 'dark') {
                newDarkColors = { ...matchedPreset.colors };
            } else { // light
                newLightColors = { ...matchedPreset.colors };
            }
            stateChanged = true;
            // console.log(`${themeMode} mode: CSS matches preset ${matchedPreset.name}, updated user colors.`);
        }
      } else {
        // CSS does not match any known preset for the current explicit mode.
        // This means CSS is some custom theme. Check if state reflects this custom theme.
        const currentUserColorsObjects = {};
        for(const key in currentUserColors) currentUserColorsObjects[key] = robustParseHslString(currentUserColors[key]);

        if (!areColorsObjectsEqual(currentCssColorObjects, currentUserColorsObjects)) {
          // Live CSS is custom and different from state. Update state to reflect live CSS.
          const liveCssAsStrings = {};
          for (const key in currentCssColorObjects) {
            liveCssAsStrings[key] = formatHslObjectToCanonicalString(currentCssColorObjects[key]);
          }
          if (themeMode === 'dark') {
            newDarkColors = liveCssAsStrings;
          } else { // light
            newLightColors = liveCssAsStrings;
          }
          stateChanged = true;
          // console.log(`${themeMode} mode: Adopted live custom CSS into user colors.`);
        }
      }
    }

    if (stateChanged) {
      // console.log("Theme guessing: Applying detected changes to state:", { newThemeMode, newLightColors, newDarkColors });
      if (newThemeMode !== themeMode) setThemeModeState(newThemeMode);
      
      // For color objects, compare properly before setting to avoid unnecessary re-renders/saves
      const currentLightColorsObjects = {};
      for(const key in userLightColors) currentLightColorsObjects[key] = robustParseHslString(userLightColors[key]);
      const newLightColorsObjects = {};
      for(const key in newLightColors) newLightColorsObjects[key] = robustParseHslString(newLightColors[key]);

      if (!areColorsObjectsEqual(currentLightColorsObjects, newLightColorsObjects)) {
        setUserLightColorsState(newLightColors);
      }

      const currentDarkColorsObjects = {};
      for(const key in userDarkColors) currentDarkColorsObjects[key] = robustParseHslString(userDarkColors[key]);
      const newDarkColorsObjects = {};
      for(const key in newDarkColors) newDarkColorsObjects[key] = robustParseHslString(newDarkColors[key]);

      if (!areColorsObjectsEqual(currentDarkColorsObjects, newDarkColorsObjects)) {
        setUserDarkColorsState(newDarkColors);
      }
    }
  }, [
    isLoaded, activeOsTheme, themeMode, userLightColors, userDarkColors, 
    setThemeModeState, setUserLightColorsState, setUserDarkColorsState
    // Removed HSL helper functions from dependencies as they are now module-scoped
    // defaultLightPreset, defaultDarkPreset, lightThemePresets, darkThemePresets
  ]);


  // --- Theme Management Functions ---

  const setThemeMode = useCallback((newMode) => {
    if (['light', 'dark', 'system'].includes(newMode)) {
      setThemeModeState(newMode);
    }
  }, []);

  // --- Font and Size Management Functions ---
  const setFontFamily = useCallback((newFontFamilyId) => {
    if (AVAILABLE_FONTS.some(f => f.id === newFontFamilyId)) {
      setFontFamilyState(newFontFamilyId);
    }
  }, []);

  const setFontSize = useCallback((newFontSize) => {
    const size = parseInt(newFontSize, 10);
    if (!isNaN(size) && size >= 8 && size <= 72) { // Basic validation for font size range
      setFontSizeState(size);
    }
  }, []);


  const updateUserColor = useCallback((mode, variableName, newHslValue) => {
    if (mode === 'light') {
      setUserLightColorsState(prev => ({ ...prev, [variableName]: newHslValue }));
    } else if (mode === 'dark') {
      setUserDarkColorsState(prev => ({ ...prev, [variableName]: newHslValue }));
    }
  }, []);

  const applyPreset = useCallback((mode, presetId) => {
    const presets = mode === 'light' ? lightThemePresets : darkThemePresets;
    const selectedPreset = presets.find(p => p.id === presetId);
    if (selectedPreset) {
      if (mode === 'light') {
        setUserLightColorsState({ ...selectedPreset.colors });
      } else {
        setUserDarkColorsState({ ...selectedPreset.colors });
      }
    }
  }, []);

  const resetThemeToDefault = useCallback((mode) => {
    if (mode === 'light') {
      setUserLightColorsState({ ...defaultLightPreset.colors });
    } else if (mode === 'dark') {
      setUserDarkColorsState({ ...defaultDarkPreset.colors });
    }
  }, []);
  
  const getAvailablePresets = useCallback((mode) => {
    return mode === 'light' ? lightThemePresets : darkThemePresets;
  }, []);

  const getCurrentColors = useCallback((mode) => {
    return mode === 'light' ? userLightColors : userDarkColors;
  }, [userLightColors, userDarkColors]);

  const getActivePresetId = useCallback((mode) => {
    const currentColors = mode === 'light' ? userLightColors : userDarkColors;
    const availablePresets = mode === 'light' ? lightThemePresets : darkThemePresets;

    const areColorObjectsStringsEqual = (colors1, colors2) => {
      if (!colors1 || !colors2) return false;
      const keys1 = Object.keys(colors1);
      const keys2 = Object.keys(colors2);
      if (keys1.length !== keys2.length) return false;
      if (keys1.length === 0) return true; // Both empty means equal for this purpose

      for (const key of keys1) {
        if (!keys2.includes(key) || colors1[key] !== colors2[key]) {
          return false;
        }
      }
      return true;
    };

    const matchedPreset = availablePresets.find(preset => areColorObjectsStringsEqual(currentColors, preset.colors));
    return matchedPreset ? matchedPreset.id : undefined;
  }, [userLightColors, userDarkColors]);


  // --- Profile Management Functions ---

  const addProfile = useCallback(() => {
    const newProfile = {
      id: uuidv4(),
      name: `New Profile ${endpointProfiles.length + 1}`,
      useCustomEndpoint: false,
      ...DEFAULT_ENDPOINT_VALUES,
    };
    setEndpointProfiles(prev => [...prev, newProfile]);
    setActiveProfileId(newProfile.id); // Select the new profile
  }, [endpointProfiles.length]);

  const removeProfile = useCallback((profileIdToRemove) => {
    setEndpointProfiles(prevProfiles => {
      const remainingProfiles = prevProfiles.filter(p => p.id !== profileIdToRemove);
      let newActiveProfileId = activeProfileId;

      if (activeProfileId === profileIdToRemove) {
        newActiveProfileId = remainingProfiles.length > 0 ? remainingProfiles[0].id : null;
      }

      let finalProfiles = remainingProfiles;
      if (remainingProfiles.length === 0) {
        const defaultProfile = createDefaultProfile();
        finalProfiles = [defaultProfile];
        newActiveProfileId = defaultProfile.id;
      }
      
      setActiveProfileId(newActiveProfileId);

      // Update taskSettings if the removed profile was used
      setTaskSettings(currentTaskSettings => {
        const updatedTaskSettings = { ...currentTaskSettings };
        let changed = false;
        Object.values(TASK_KEYS).forEach(taskKey => {
          if (updatedTaskSettings[taskKey]?.profileId === profileIdToRemove) {
            updatedTaskSettings[taskKey].profileId = newActiveProfileId; // Fallback to new active/default
            changed = true;
          }
        });
        return changed ? updatedTaskSettings : currentTaskSettings;
      });

      return finalProfiles;
    });
  }, [activeProfileId]);

  const updateProfile = useCallback((profileId, updates) => {
    setEndpointProfiles(prev =>
      prev.map(p => (p.id === profileId ? { ...p, ...updates } : p))
    );
  }, []);

  const resetProfileToDefaults = useCallback((profileId) => {
    setEndpointProfiles(prev =>
      prev.map(p =>
        p.id === profileId
          ? { ...p, ...DEFAULT_ENDPOINT_VALUES, useCustomEndpoint: false } // Keep id and name, reset others
          : p
      )
    );
  }, []);

  const selectProfile = useCallback((profileId) => {
    setActiveProfileId(profileId);
  }, []);

  const getActiveProfile = useCallback(() => {
    return endpointProfiles.find(p => p.id === activeProfileId);
  }, [endpointProfiles, activeProfileId]);

  // --- Task Settings Management Functions ---
  const updateTaskSetting = useCallback((taskKey, settingName, value) => {
    setTaskSettings(prev => {
      if (!prev[taskKey]) {
        console.warn(`Task key "${taskKey}" not found in taskSettings.`);
        return prev;
      }
      return {
        ...prev,
        [taskKey]: {
          ...prev[taskKey],
          [settingName]: value,
        },
      };
    });
  }, []);

  const resetAllTaskPrompts = useCallback(() => {
    setTaskSettings(prev => {
      const newSettings = { ...prev };
      Object.values(TASK_KEYS).forEach(taskKey => {
        if (newSettings[taskKey]) {
          newSettings[taskKey].prompt = DEFAULT_TASK_PROMPTS[taskKey];
        } else {
          // This case should ideally not be hit if initialization is correct
          newSettings[taskKey] = {
            profileId: prev[taskKey]?.profileId || (endpointProfiles.length > 0 ? endpointProfiles[0].id : null), // Keep existing profile or fallback
            prompt: DEFAULT_TASK_PROMPTS[taskKey],
          };
        }
      });
      return newSettings;
    });
    // Also reset the global system prompt
    setSystemPrompt("You are an experienced creative writing assistant");
  }, [endpointProfiles]);


  const value = {
    // Existing profile values
    endpointProfiles,
    activeProfileId,
    isLoaded,
    addProfile,
    removeProfile,
    updateProfile,
    resetProfileToDefaults,
    selectProfile,
    getActiveProfile,
    DEFAULT_ENDPOINT_VALUES,

    // Theme values
    themeMode,
    userLightColors,
    userDarkColors,
    activeOsTheme, // Potentially useful for UI indicators
    setThemeMode,
    updateUserColor,
    applyPreset,
    resetThemeToDefault,
    getAvailablePresets,
    getCurrentColors,
    getActivePresetId, // Export new function

    // Font and Size values
    fontFamily,
    fontSize,
    setFontFamily,
    setFontSize,
    AVAILABLE_FONTS, // Export for UI dropdown

    // Task settings values
    TASK_KEYS, // Exporting for use in UI components
    taskSettings,
    updateTaskSetting,
    DEFAULT_TASK_PROMPTS, // Exporting for resetting prompts if needed
    resetAllTaskPrompts, // New function

    // System Prompt values
    systemPrompt,
    setSystemPrompt,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
