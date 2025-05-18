import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { createConcept, createAct, createChapter, createScene, createConceptTemplate, getDefaultConceptTemplates } from '@/data/models';
import { getNovelData, saveNovelData } from '@/lib/indexedDb';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

// Default initial data for a new novel or when specific fields are missing
const initialDefaultConcepts = [ // Renamed to avoid conflict with 'concepts' state
  createConcept({ id: 'default-char-1', name: 'Main Character', tags: ['character', 'protagonist'] }),
  createConcept({ id: 'default-loc-1', name: 'Starting Village', tags: ['location'] }),
];

export const DataProvider = ({ children, novelId }) => { // Accept novelId as a prop
  // --- State ---
  const [concepts, setConcepts] = useState([]);
  const [acts, setActs] = useState({});
  const [chapters, setChapters] = useState({});
  const [scenes, setScenes] = useState({});
  const [actOrder, setActOrder] = useState([]);
  const [conceptTemplates, setConceptTemplates] = useState([]); // New state for concept templates

  // New state for novel overview details
  const [authorName, setAuthorName] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [coverImage, setCoverImage] = useState(null); // base64 string or null
  const [pointOfView, setPointOfView] = useState('');
  const [genre, setGenre] = useState('');
  const [timePeriod, setTimePeriod] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [themes, setThemes] = useState('');
  const [tone, setTone] = useState('');
  
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [currentNovelId, setCurrentNovelId] = useState(null); // Track the novelId for which data is loaded

  // --- CRUD Operations (largely unchanged, operate on current state) ---

  // Novel Overview Details
  const updateNovelDetails = (details) => {
    if (details.authorName !== undefined) setAuthorName(details.authorName);
    if (details.synopsis !== undefined) setSynopsis(details.synopsis);
    if (details.coverImage !== undefined) setCoverImage(details.coverImage);
    if (details.pointOfView !== undefined) setPointOfView(details.pointOfView);
    if (details.genre !== undefined) setGenre(details.genre);
    if (details.timePeriod !== undefined) setTimePeriod(details.timePeriod);
    if (details.targetAudience !== undefined) setTargetAudience(details.targetAudience);
    if (details.themes !== undefined) setThemes(details.themes);
    if (details.tone !== undefined) setTone(details.tone);
    // Consider adding last_modified_date update here if these are major changes
  };

  // Concept Templates
  const addConceptTemplate = (templateData) => {
    const newTemplate = createConceptTemplate(templateData);
    setConceptTemplates(prev => [...prev, newTemplate]);
    return newTemplate;
  };

  const updateConceptTemplate = (updatedTemplate) => {
    setConceptTemplates(prev =>
      prev.map(template =>
        template.id === updatedTemplate.id ? { ...template, ...updatedTemplate, last_modified_date: Date.now() } : template
      )
    );
  };

  const deleteConceptTemplate = (templateId) => {
    setConceptTemplates(prev => prev.filter(template => template.id !== templateId));
  };

  // Concepts
  const addConcept = (conceptData) => {
    const newConcept = createConcept(conceptData);
    setConcepts(prevConcepts => [...prevConcepts, newConcept]);
    return newConcept;
  };

  const updateConcept = (updatedConcept) => {
    setConcepts(prevConcepts =>
      prevConcepts.map(concept =>
        concept.id === updatedConcept.id ? { ...concept, ...updatedConcept, last_modified_date: new Date().toISOString() } : concept
      )
    );
  };

  const deleteConcept = (conceptId) => {
    setConcepts(prevConcepts => prevConcepts.filter(concept => concept.id !== conceptId));
  };

  // Acts
  const addAct = (actData) => {
    const newAct = createAct(actData);
    setActs(prev => ({ ...prev, [newAct.id]: newAct }));
    setActOrder(prev => [...prev, newAct.id]);
    return newAct;
  };

  const updateAct = (actId, updatedActData) => {
    setActs(prev => ({
      ...prev,
      [actId]: { ...prev[actId], ...updatedActData, last_modified_date: new Date().toISOString() }
    }));
  };

  const deleteAct = (actId) => {
    const actToDelete = acts[actId];
    if (actToDelete) {
      actToDelete.chapterOrder.forEach(chapterId => {
        deleteChapter(chapterId, actId, false); 
      });
    }
    setActs(prev => {
      const newState = { ...prev };
      delete newState[actId];
      return newState;
    });
    setActOrder(prev => prev.filter(id => id !== actId));
  };
  
  const updateActOrder = (newOrder) => {
    setActOrder(newOrder);
  };

  // Chapters
  const addChapterToAct = (actId, chapterData, options = {}) => {
    const newChapter = createChapter(chapterData);
    let initialSceneOrder = [];

    if (!options.skipDefaultScene) {
      // Create a default scene for the new chapter only if not skipping
      const defaultScene = createScene({ name: "Scene 1" });
      // Add the default scene to the scenes state
      setScenes(prev => ({ ...prev, [defaultScene.id]: defaultScene }));
      initialSceneOrder = [defaultScene.id];
    }

    // Add the new chapter to the chapters state and update its sceneOrder
    setChapters(prev => ({
      ...prev,
      [newChapter.id]: {
        ...newChapter, // Include all properties from the new chapter
        sceneOrder: initialSceneOrder, // Initialize with the default scene's ID or empty
      }
    }));

    // Update the parent act's chapterOrder
    setActs(prevActs => ({
      ...prevActs,
      [actId]: {
        ...prevActs[actId],
        chapterOrder: [...prevActs[actId].chapterOrder, newChapter.id],
        last_modified_date: new Date().toISOString()
      }
    }));
    return newChapter;
  };

  const updateChapter = (chapterId, updatedChapterData) => {
    setChapters(prev => ({
      ...prev,
      [chapterId]: { ...prev[chapterId], ...updatedChapterData, last_modified_date: new Date().toISOString() }
    }));
  };

  const deleteChapter = (chapterId, parentActId, updateParentActOrder = true) => {
    const chapterToDelete = chapters[chapterId];
    if (chapterToDelete) {
      chapterToDelete.sceneOrder.forEach(sceneId => {
        deleteScene(sceneId, chapterId, false);
      });
    }
    setChapters(prev => {
      const newState = { ...prev };
      delete newState[chapterId];
      return newState;
    });
    if (updateParentActOrder && parentActId && acts[parentActId]) {
      setActs(prevActs => ({
        ...prevActs,
        [parentActId]: {
          ...prevActs[parentActId],
          chapterOrder: prevActs[parentActId].chapterOrder.filter(id => id !== chapterId),
          last_modified_date: new Date().toISOString()
        }
      }));
    }
  };

  const updateChapterOrderInAct = (actId, newChapterOrder) => {
    setActs(prevActs => ({
      ...prevActs,
      [actId]: {
        ...prevActs[actId],
        chapterOrder: newChapterOrder,
        last_modified_date: new Date().toISOString()
      }
    }));
  };

  // Helper function for auto-context update
  const calculateAutoContext = (sceneData, allConcepts) => {
    if (!sceneData.autoUpdateContext) {
      return sceneData.context || []; // Return existing context if auto-update is off
    }

    const searchString = `${sceneData.name || ''} ${sceneData.synopsis || ''} ${(sceneData.tags || []).join(' ')}`.toLowerCase();
    const matchedConceptIds = new Set(sceneData.context || []); // Start with manually selected ones

    if (searchString.trim()) {
      allConcepts.forEach(concept => {
        const conceptNameLower = concept.name.toLowerCase();
        const aliasesLower = (concept.aliases || []).map(a => a.toLowerCase());

        if (searchString.includes(conceptNameLower)) {
          matchedConceptIds.add(concept.id);
        } else {
          for (const alias of aliasesLower) {
            if (searchString.includes(alias)) {
              matchedConceptIds.add(concept.id);
              break; // Found a match for this concept via alias
            }
          }
        }
      });
    }

    return Array.from(matchedConceptIds);
  };


  const updateScene = (updatedSceneData) => { // Now expects the full scene object
    const sceneId = updatedSceneData.id;
    if (!sceneId) {
      console.error("updateScene requires a scene object with an id.");
      return;
    }

    // Calculate context *before* updating state
    const finalContext = calculateAutoContext(updatedSceneData, concepts);

    setScenes(prev => ({
      ...prev,
      [sceneId]: { 
        ...prev[sceneId], // Keep existing fields not being updated
        ...updatedSceneData, // Apply updates from the form
        context: finalContext, // Overwrite context with calculated one
        last_modified_date: new Date().toISOString() 
      }
    }));
  };
  
  // Modify addSceneToChapter to use the auto-update logic
  const addSceneToChapter = (chapterId, sceneData) => {
    let newScene = createScene(sceneData); // Create scene first

    // Calculate initial context if auto-update is enabled
    const initialContext = calculateAutoContext(newScene, concepts);
    newScene = { ...newScene, context: initialContext }; // Update the new scene object

    setScenes(prev => ({ ...prev, [newScene.id]: newScene }));
    setChapters(prevChapters => ({
      ...prevChapters,
      [chapterId]: {
        ...prevChapters[chapterId],
        sceneOrder: [...prevChapters[chapterId].sceneOrder, newScene.id],
        last_modified_date: new Date().toISOString()
      }
    }));
    return newScene;
  };


  const deleteScene = (sceneId, parentChapterId, updateParentChapterOrder = true) => {
    setScenes(prev => {
      const newState = { ...prev };
      delete newState[sceneId];
      return newState;
    });
    if (updateParentChapterOrder && parentChapterId && chapters[parentChapterId]) {
      setChapters(prevChapters => ({
        ...prevChapters,
        [parentChapterId]: {
          ...prevChapters[parentChapterId],
          sceneOrder: prevChapters[parentChapterId].sceneOrder.filter(id => id !== sceneId),
          last_modified_date: new Date().toISOString()
        }
      }));
    }
  };
  
  const updateSceneOrderInChapter = (chapterId, newSceneOrder) => {
     setChapters(prevChapters => ({
      ...prevChapters,
      [chapterId]: {
        ...prevChapters[chapterId],
        sceneOrder: newSceneOrder,
        last_modified_date: new Date().toISOString()
      }
    }));
  };

  // --- Data Persistence ---

  const initializeDefaultNovelDataStructure = useCallback(() => {
    // Sets up a minimal default plan structure for a new novel.
    // Concepts are handled separately by initialDefaultConcepts.
    let tempActs = {};
    let tempChapters = {};
    let tempScenes = {};
    let tempActOrder = [];

    const firstAct = createAct({ name: "Act I" });
    tempActs[firstAct.id] = firstAct;
    tempActOrder.push(firstAct.id);

    const firstChapter = createChapter({ name: "Chapter 1" });
    tempChapters[firstChapter.id] = firstChapter;
    if (tempActs[firstAct.id]) { // Ensure act exists
        tempActs[firstAct.id].chapterOrder.push(firstChapter.id);
    }
    
    const firstScene = createScene({ name: "Opening Scene", synopsis: "The story begins..." });
    tempScenes[firstScene.id] = firstScene;
    if (tempChapters[firstChapter.id]) { // Ensure chapter exists
        tempChapters[firstChapter.id].sceneOrder.push(firstScene.id);
    }

    setActs(tempActs);
    setChapters(tempChapters);
    setScenes(tempScenes);
    setActOrder(tempActOrder);
  }, []);

  // Load data from IndexedDB when novelId changes
  useEffect(() => {
    const loadDataForNovel = async () => {
      if (!novelId) {
        setConcepts([]);
        setActs({});
        setChapters({});
        setScenes({});
        setActOrder([]);
        setIsDataLoaded(false);
        setCurrentNovelId(null);
        return;
      }

      setIsDataLoaded(false);
      try {
        const loadedNovelData = await getNovelData(novelId);
        if (loadedNovelData) {
          setAuthorName(loadedNovelData.authorName || '');
          setSynopsis(loadedNovelData.synopsis || '');
          setCoverImage(loadedNovelData.coverImage || null);
          setPointOfView(loadedNovelData.pointOfView || '');
          setGenre(loadedNovelData.genre || '');
          setTimePeriod(loadedNovelData.timePeriod || '');
          setTargetAudience(loadedNovelData.targetAudience || '');
          setThemes(loadedNovelData.themes || '');
          setTone(loadedNovelData.tone || '');
          setConcepts(loadedNovelData.concepts !== undefined ? loadedNovelData.concepts : initialDefaultConcepts);
          setActs(loadedNovelData.acts || {});
          setChapters(loadedNovelData.chapters || {});
          setScenes(loadedNovelData.scenes || {});
          setActOrder(loadedNovelData.actOrder || []);
          setConceptTemplates(loadedNovelData.conceptTemplates || getDefaultConceptTemplates()); // Load or init templates
        } else {
          // New novel or no data, initialize with defaults
          setAuthorName('');
          setSynopsis('');
          setCoverImage(null);
          setPointOfView('');
          setGenre('');
          setTimePeriod('');
          setTargetAudience('');
          setThemes('');
          setTone('');
          setConcepts(initialDefaultConcepts);
          setConceptTemplates(getDefaultConceptTemplates()); // Init templates for new novel
          initializeDefaultNovelDataStructure();
        }
      } catch (error) {
        console.error(`DataContext: Failed to load data for novel ${novelId}:`, error);
        setAuthorName('');
        setSynopsis('');
        setCoverImage(null);
        setPointOfView('');
        setGenre('');
        setTimePeriod('');
        setTargetAudience('');
        setThemes('');
        setTone('');
        setConcepts(initialDefaultConcepts); // Fallback
        setConceptTemplates(getDefaultConceptTemplates()); // Fallback templates
        initializeDefaultNovelDataStructure(); // Fallback
      } finally {
        setIsDataLoaded(true);
        setCurrentNovelId(novelId);
      }
    };

    if (novelId !== currentNovelId || !isDataLoaded) { // Load if novelId changed or not initially loaded
        loadDataForNovel();
    }
  }, [novelId, currentNovelId, isDataLoaded, initializeDefaultNovelDataStructure]);

  // Save data to IndexedDB on changes
  useEffect(() => {
    if (!isDataLoaded || !novelId || novelId !== currentNovelId) {
      return; // Don't save if not loaded, no novelId, or novelId mismatch (still loading new one)
    }

    const novelDataToSave = {
      authorName,
      synopsis,
      coverImage,
      pointOfView,
      genre,
      timePeriod,
      targetAudience,
      themes,
      tone,
      concepts,
      acts,
      chapters,
      scenes,
      actOrder,
      conceptTemplates, // Include conceptTemplates in saved data
      // last_saved_date: new Date().toISOString(), // This is handled by saveNovelData in indexedDb.js
    };
    saveNovelData(novelId, novelDataToSave)
      .catch(error => console.error(`DataContext: Failed to save data for novel ${novelId}:`, error));
      
  }, [authorName, synopsis, coverImage, pointOfView, genre, timePeriod, targetAudience, themes, tone, concepts, acts, chapters, scenes, actOrder, conceptTemplates, isDataLoaded, novelId, currentNovelId]);


  const value = {
    authorName,
    synopsis,
    coverImage,
    pointOfView,
    genre,
    timePeriod,
    targetAudience,
    themes,
    tone,
    updateNovelDetails,
    concepts,
    addConcept,
    updateConcept,
    deleteConcept,
    conceptTemplates, // Expose conceptTemplates
    addConceptTemplate, // Expose CRUD for templates
    updateConceptTemplate,
    deleteConceptTemplate,
    acts,
    chapters,
    scenes,
    actOrder,
    addAct,
    updateAct,
    deleteAct,
    updateActOrder,
    addChapterToAct,
    updateChapter,
    deleteChapter,
    updateChapterOrderInAct,
    addSceneToChapter,
    updateScene,
    deleteScene,
    updateSceneOrderInChapter,
    isDataLoaded, // Expose isDataLoaded for UI to show loading states if needed
    currentNovelId, // Expose currentNovelId for debugging or advanced conditional rendering
  };

  // Render children only when data for the specific novelId is loaded or initialized
  // This prevents child components from trying to access undefined data during async load
  return (
    <DataContext.Provider value={value}>
      {(isDataLoaded && novelId === currentNovelId) || !novelId ? children : null}
    </DataContext.Provider>
  );
};
