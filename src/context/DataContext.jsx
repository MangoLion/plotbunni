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
    
    // Reordering functions and helpers
    moveAct: useCallback((actId, direction) => {
      setActOrder(currentActOrder => {
        const index = currentActOrder.indexOf(actId);
        if (index === -1) return currentActOrder;
        const newOrder = [...currentActOrder];
        if (direction === 'up' && index > 0) {
          [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
        } else if (direction === 'down' && index < newOrder.length - 1) {
          [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
        }
        return newOrder;
      });
    }, []),

    canMoveActUp: useCallback(actId => {
      const index = actOrder.indexOf(actId);
      return index > 0;
    }, [actOrder]),

    canMoveActDown: useCallback(actId => {
      const index = actOrder.indexOf(actId);
      return index !== -1 && index < actOrder.length - 1;
    }, [actOrder]),

    moveChapter: useCallback((chapterId, parentActId, direction) => {
      setActs(currentActs => {
        const newActs = { ...currentActs };
        const act = newActs[parentActId];
        if (!act || !act.chapterOrder) return currentActs;

        const chapterIndex = act.chapterOrder.indexOf(chapterId);
        if (chapterIndex === -1) return currentActs;

        if (direction === 'up') {
          if (chapterIndex > 0) {
            const newChapterOrder = [...act.chapterOrder];
            [newChapterOrder[chapterIndex - 1], newChapterOrder[chapterIndex]] = [newChapterOrder[chapterIndex], newChapterOrder[chapterIndex - 1]];
            newActs[parentActId] = { ...act, chapterOrder: newChapterOrder, last_modified_date: new Date().toISOString() };
          } else { // First chapter in act, try to move to previous act
            const parentActIndex = actOrder.indexOf(parentActId);
            if (parentActIndex > 0) {
              const prevActId = actOrder[parentActIndex - 1];
              const prevAct = newActs[prevActId];
              if (prevAct && prevAct.chapterOrder) {
                const currentChapterOrder = act.chapterOrder.filter(id => id !== chapterId);
                const prevActChapterOrder = [...prevAct.chapterOrder, chapterId];
                newActs[parentActId] = { ...act, chapterOrder: currentChapterOrder, last_modified_date: new Date().toISOString() };
                newActs[prevActId] = { ...prevAct, chapterOrder: prevActChapterOrder, last_modified_date: new Date().toISOString() };
              }
            }
          }
        } else if (direction === 'down') {
          if (chapterIndex < act.chapterOrder.length - 1) {
            const newChapterOrder = [...act.chapterOrder];
            [newChapterOrder[chapterIndex + 1], newChapterOrder[chapterIndex]] = [newChapterOrder[chapterIndex], newChapterOrder[chapterIndex + 1]];
            newActs[parentActId] = { ...act, chapterOrder: newChapterOrder, last_modified_date: new Date().toISOString() };
          } else { // Last chapter in act, try to move to next act
            const parentActIndex = actOrder.indexOf(parentActId);
            if (parentActIndex < actOrder.length - 1) {
              const nextActId = actOrder[parentActIndex + 1];
              const nextAct = newActs[nextActId];
              if (nextAct && nextAct.chapterOrder) {
                const currentChapterOrder = act.chapterOrder.filter(id => id !== chapterId);
                const nextActChapterOrder = [chapterId, ...nextAct.chapterOrder];
                newActs[parentActId] = { ...act, chapterOrder: currentChapterOrder, last_modified_date: new Date().toISOString() };
                newActs[nextActId] = { ...nextAct, chapterOrder: nextActChapterOrder, last_modified_date: new Date().toISOString() };
              }
            }
          }
        }
        return newActs;
      });
    }, [actOrder]),

    canMoveChapterUp: useCallback((chapterId, parentActId) => {
      const act = acts[parentActId];
      if (!act || !act.chapterOrder) return false;
      const chapterIndex = act.chapterOrder.indexOf(chapterId);
      if (chapterIndex > 0) return true; // Can move up within the same act
      // Check if it's the first chapter and there's a previous act
      const parentActIndex = actOrder.indexOf(parentActId);
      if (parentActIndex > 0) {
        const prevActId = actOrder[parentActIndex - 1];
        return acts[prevActId] && acts[prevActId].chapterOrder !== undefined; // Can move to prev act
      }
      return false;
    }, [acts, actOrder]),

    canMoveChapterDown: useCallback((chapterId, parentActId) => {
      const act = acts[parentActId];
      if (!act || !act.chapterOrder) return false;
      const chapterIndex = act.chapterOrder.indexOf(chapterId);
      if (chapterIndex !== -1 && chapterIndex < act.chapterOrder.length - 1) return true; // Can move down within the same act
      // Check if it's the last chapter and there's a next act
      const parentActIndex = actOrder.indexOf(parentActId);
      if (parentActIndex !== -1 && parentActIndex < actOrder.length - 1) {
        const nextActId = actOrder[parentActIndex + 1];
        return acts[nextActId] && acts[nextActId].chapterOrder !== undefined; // Can move to next act
      }
      return false;
    }, [acts, actOrder]),

    moveScene: useCallback((sceneId, parentChapterId, parentActId, direction) => {
      setChapters(currentChapters => {
        const newChapters = { ...currentChapters };
        const chapter = newChapters[parentChapterId];
        if (!chapter || !chapter.sceneOrder) return currentChapters;

        const sceneIndex = chapter.sceneOrder.indexOf(sceneId);
        if (sceneIndex === -1) return currentChapters;

        if (direction === 'up') {
          if (sceneIndex > 0) { // Move up within the same chapter
            const newSceneOrder = [...chapter.sceneOrder];
            [newSceneOrder[sceneIndex - 1], newSceneOrder[sceneIndex]] = [newSceneOrder[sceneIndex], newSceneOrder[sceneIndex - 1]];
            newChapters[parentChapterId] = { ...chapter, sceneOrder: newSceneOrder, last_modified_date: new Date().toISOString() };
          } else { // First scene in chapter, try to move to previous chapter or act
            const parentAct = acts[parentActId];
            if (!parentAct || !parentAct.chapterOrder) return currentChapters;
            const chapterIndexInAct = parentAct.chapterOrder.indexOf(parentChapterId);

            if (chapterIndexInAct > 0) { // Move to previous chapter in the same act
              const prevChapterId = parentAct.chapterOrder[chapterIndexInAct - 1];
              const prevChapter = newChapters[prevChapterId];
              if (prevChapter && prevChapter.sceneOrder) {
                const currentSceneOrder = chapter.sceneOrder.filter(id => id !== sceneId);
                const prevChapterSceneOrder = [...prevChapter.sceneOrder, sceneId];
                newChapters[parentChapterId] = { ...chapter, sceneOrder: currentSceneOrder, last_modified_date: new Date().toISOString() };
                newChapters[prevChapterId] = { ...prevChapter, sceneOrder: prevChapterSceneOrder, last_modified_date: new Date().toISOString() };
              }
            } else if (chapterIndexInAct === 0) { // First chapter in act, try to move to previous act's last chapter
              const parentActIndexGlobal = actOrder.indexOf(parentActId);
              if (parentActIndexGlobal > 0) {
                const prevActId = actOrder[parentActIndexGlobal - 1];
                const prevAct = acts[prevActId]; // Use acts from outer scope for reading structure
                if (prevAct && prevAct.chapterOrder && prevAct.chapterOrder.length > 0) {
                  const targetChapterId = prevAct.chapterOrder[prevAct.chapterOrder.length - 1];
                  const targetChapter = newChapters[targetChapterId];
                  if (targetChapter && targetChapter.sceneOrder) {
                    const currentSceneOrder = chapter.sceneOrder.filter(id => id !== sceneId);
                    const targetChapterSceneOrder = [...targetChapter.sceneOrder, sceneId];
                    newChapters[parentChapterId] = { ...chapter, sceneOrder: currentSceneOrder, last_modified_date: new Date().toISOString() };
                    newChapters[targetChapterId] = { ...targetChapter, sceneOrder: targetChapterSceneOrder, last_modified_date: new Date().toISOString() };
                  }
                }
              }
            }
          }
        } else if (direction === 'down') {
          if (sceneIndex < chapter.sceneOrder.length - 1) { // Move down within the same chapter
            const newSceneOrder = [...chapter.sceneOrder];
            [newSceneOrder[sceneIndex + 1], newSceneOrder[sceneIndex]] = [newSceneOrder[sceneIndex], newSceneOrder[sceneIndex + 1]];
            newChapters[parentChapterId] = { ...chapter, sceneOrder: newSceneOrder, last_modified_date: new Date().toISOString() };
          } else { // Last scene in chapter, try to move to next chapter or act
            const parentAct = acts[parentActId];
            if (!parentAct || !parentAct.chapterOrder) return currentChapters;
            const chapterIndexInAct = parentAct.chapterOrder.indexOf(parentChapterId);

            if (chapterIndexInAct !== -1 && chapterIndexInAct < parentAct.chapterOrder.length - 1) { // Move to next chapter in the same act
              const nextChapterId = parentAct.chapterOrder[chapterIndexInAct + 1];
              const nextChapter = newChapters[nextChapterId];
              if (nextChapter && nextChapter.sceneOrder) {
                const currentSceneOrder = chapter.sceneOrder.filter(id => id !== sceneId);
                const nextChapterSceneOrder = [sceneId, ...nextChapter.sceneOrder];
                newChapters[parentChapterId] = { ...chapter, sceneOrder: currentSceneOrder, last_modified_date: new Date().toISOString() };
                newChapters[nextChapterId] = { ...nextChapter, sceneOrder: nextChapterSceneOrder, last_modified_date: new Date().toISOString() };
              }
            } else if (chapterIndexInAct === parentAct.chapterOrder.length - 1) { // Last chapter in act, try to move to next act's first chapter
              const parentActIndexGlobal = actOrder.indexOf(parentActId);
              if (parentActIndexGlobal !== -1 && parentActIndexGlobal < actOrder.length - 1) {
                const nextActId = actOrder[parentActIndexGlobal + 1];
                const nextAct = acts[nextActId]; // Use acts from outer scope for reading structure
                if (nextAct && nextAct.chapterOrder && nextAct.chapterOrder.length > 0) {
                  const targetChapterId = nextAct.chapterOrder[0];
                  const targetChapter = newChapters[targetChapterId];
                  if (targetChapter && targetChapter.sceneOrder) {
                    const currentSceneOrder = chapter.sceneOrder.filter(id => id !== sceneId);
                    const targetChapterSceneOrder = [sceneId, ...targetChapter.sceneOrder];
                    newChapters[parentChapterId] = { ...chapter, sceneOrder: currentSceneOrder, last_modified_date: new Date().toISOString() };
                    newChapters[targetChapterId] = { ...targetChapter, sceneOrder: targetChapterSceneOrder, last_modified_date: new Date().toISOString() };
                  }
                }
              }
            }
          }
        }
        return newChapters;
      });
    }, [acts, actOrder]), // Include acts and actOrder as dependencies for reading structure

    canMoveSceneUp: useCallback((sceneId, parentChapterId, parentActId) => {
      const chapter = chapters[parentChapterId];
      if (!chapter || !chapter.sceneOrder) return false;
      const sceneIndex = chapter.sceneOrder.indexOf(sceneId);
      if (sceneIndex > 0) return true; // Can move up within the same chapter

      // Check if it's the first scene, try previous chapter or act
      const parentAct = acts[parentActId];
      if (!parentAct || !parentAct.chapterOrder) return false;
      const chapterIndexInAct = parentAct.chapterOrder.indexOf(parentChapterId);

      if (chapterIndexInAct > 0) { // Previous chapter in same act
        const prevChapterId = parentAct.chapterOrder[chapterIndexInAct - 1];
        return chapters[prevChapterId] && chapters[prevChapterId].sceneOrder !== undefined;
      } else if (chapterIndexInAct === 0) { // First chapter in act, check previous act
        const parentActIndexGlobal = actOrder.indexOf(parentActId);
        if (parentActIndexGlobal > 0) {
          const prevActId = actOrder[parentActIndexGlobal - 1];
          const prevAct = acts[prevActId];
          return prevAct && prevAct.chapterOrder && prevAct.chapterOrder.length > 0 && 
                 chapters[prevAct.chapterOrder[prevAct.chapterOrder.length -1]]?.sceneOrder !== undefined;
        }
      }
      return false;
    }, [chapters, acts, actOrder]),

    canMoveSceneDown: useCallback((sceneId, parentChapterId, parentActId) => {
      const chapter = chapters[parentChapterId];
      if (!chapter || !chapter.sceneOrder) return false;
      const sceneIndex = chapter.sceneOrder.indexOf(sceneId);
      if (sceneIndex !== -1 && sceneIndex < chapter.sceneOrder.length - 1) return true; // Can move down within same chapter

      // Check if it's the last scene, try next chapter or act
      const parentAct = acts[parentActId];
      if (!parentAct || !parentAct.chapterOrder) return false;
      const chapterIndexInAct = parentAct.chapterOrder.indexOf(parentChapterId);
      
      if (chapterIndexInAct !== -1 && chapterIndexInAct < parentAct.chapterOrder.length - 1) { // Next chapter in same act
        const nextChapterId = parentAct.chapterOrder[chapterIndexInAct + 1];
        return chapters[nextChapterId] && chapters[nextChapterId].sceneOrder !== undefined;
      } else if (chapterIndexInAct === parentAct.chapterOrder.length - 1) { // Last chapter in act, check next act
        const parentActIndexGlobal = actOrder.indexOf(parentActId);
        if (parentActIndexGlobal !== -1 && parentActIndexGlobal < actOrder.length - 1) {
          const nextActId = actOrder[parentActIndexGlobal + 1];
          const nextAct = acts[nextActId];
          return nextAct && nextAct.chapterOrder && nextAct.chapterOrder.length > 0 &&
                 chapters[nextAct.chapterOrder[0]]?.sceneOrder !== undefined;
        }
      }
      return false;
    }, [chapters, acts, actOrder]),
  };

  // Render children only when data for the specific novelId is loaded or initialized
  // This prevents child components from trying to access undefined data during async load
  return (
    <DataContext.Provider value={value}>
      {(isDataLoaded && novelId === currentNovelId) || !novelId ? children : null}
    </DataContext.Provider>
  );
};
