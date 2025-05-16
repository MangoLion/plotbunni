import { tokenCount } from './utils';

const SAFETY_BUFFER = 100; // Tokens reserved for safety, model variations, etc.

/**
 * Generates a context string for AI prompts. It attempts to build a full context (Level 1)
 * and truncates from the beginning if it exceeds token limits.
 *
 * @param {object} options - The options for context generation.
 * @param {'novelOutline' | 'sceneText'} options.strategy - The type of context to generate.
 * @param {object} options.baseData - Core novel data: { actOrder, acts, chapters, scenes, concepts, novelSynopsis?, currentGeneratedContents?: Map }.
 * @param {object} options.targetData - Data specific to the target of generation: { targetChapterId?, targetSceneId?, currentSceneText? }.
 * @param {object} options.aiProfile - The active AI profile: { contextLength, maxOutputTokens, ... }.
 * @param {string} options.systemPromptText - The system prompt string.
 * @param {string} options.userQueryText - The user's specific query string.
 * @returns {Promise<{contextString: string, estimatedTokens: number, level: number, error?: string}>}
 *          An object containing the context string, its estimated tokens, the level (1 for success, -1 for failure),
 *          and an optional error message if generation fails.
 */
export const generateContextWithRetry = async ({
  strategy,
  baseData, // Expect baseData to contain novelDetails: { synopsis, genre, pointOfView, ... }
  targetData,
  aiProfile,
  systemPromptText,
  userQueryText,
}) => {
  const { actOrder, acts, chapters, scenes: originalScenes, concepts, novelDetails, currentGeneratedContents } = baseData; // Changed novelSynopsis to novelDetails
  const { targetChapterId, targetSceneId, currentSceneText } = targetData;

  // Create effective scenes object by merging original scenes with currently generated content
  const scenes = { ...(originalScenes || {}) };
  if (currentGeneratedContents) {
    currentGeneratedContents.forEach((content, sceneId) => {
      if (scenes[sceneId]) {
        scenes[sceneId] = { ...scenes[sceneId], content };
      } else {
        scenes[sceneId] = { id: sceneId, content: content, name: `Scene ${sceneId}` }; // Add minimal info
      }
    });
  }

  if (!aiProfile || !aiProfile.contextLength || !aiProfile.maxOutputTokens) {
    return {
      contextString: "",
      estimatedTokens: 0,
      level: 0, // Using 0 for config error, -1 for processing error
      error: "AI profile not fully configured (missing contextLength or maxOutputTokens)."
    };
  }

  const fixedTokens = tokenCount(systemPromptText) + tokenCount(userQueryText);
  const maxTokensForNovelDataContext = aiProfile.contextLength - aiProfile.maxOutputTokens - fixedTokens - SAFETY_BUFFER;

  if (maxTokensForNovelDataContext <= 0) {
    return {
      contextString: "",
      estimatedTokens: 0,
      level: 0, // Using 0 for config error
      error: `Not enough token space for novel context. Available: ${maxTokensForNovelDataContext}`
    };
  }

  // --- Level 1: Full Context with Truncation ---
  try {
    let contextL1 = "";
    if (strategy === 'novelOutline') {
      // Pass novelDetails instead of novelSynopsis
      contextL1 = buildNovelOutlineContext_L1(actOrder, acts, chapters, scenes, concepts, targetChapterId, targetSceneId, novelDetails);
    } else if (strategy === 'sceneText') {
      // Pass novelDetails instead of novelSynopsis
      contextL1 = buildSceneTextContext_L1(actOrder, acts, chapters, scenes, concepts, novelDetails, targetChapterId, targetSceneId, currentSceneText);
    }
    let tokensL1 = tokenCount(contextL1);

    if (tokensL1 <= maxTokensForNovelDataContext) {
      return { contextString: contextL1, estimatedTokens: tokensL1, level: 1 };
    }

    // If too large, truncate from the beginning
    console.log(`L1 context too large (${tokensL1} > ${maxTokensForNovelDataContext}). Truncating...`);
    while (tokensL1 > maxTokensForNovelDataContext && contextL1.length > 0) {
      const trimAmount = Math.max(100, Math.floor(contextL1.length * 0.1)); // Trim 10% or 100 chars
      contextL1 = contextL1.substring(trimAmount);
      tokensL1 = tokenCount(contextL1);
    }

    if (tokensL1 <= maxTokensForNovelDataContext) {
      console.log(`L1 context after truncation: ${tokensL1} tokens.`);
      return { contextString: contextL1, estimatedTokens: tokensL1, level: 1 };
    }
  } catch (e) {
    console.error("Error in Level 1 context generation:", e);
    return {
      contextString: "",
      estimatedTokens: 0,
      level: -1,
      error: `Error during context generation: ${e.message}`
    };
  }

  return {
    contextString: "Context too large, even after truncation.",
    estimatedTokens: tokenCount("Context too large, even after truncation."),
    level: -1,
    error: "Context generation failed to fit within token limits after truncation."
  };
};

// --- Helper functions to build context strings for Level 1 strategy ---

function buildNovelMetadataString(novelDetails) {
  if (!novelDetails) return "";

  const fields = [
    { key: 'synopsis', label: 'Synopsis' },
    { key: 'genre', label: 'Genre' },
    { key: 'pointOfView', label: 'Point of View' },
    { key: 'timePeriod', label: 'Time Period' },
    { key: 'targetAudience', label: 'Target Audience' },
    { key: 'themes', label: 'Themes' },
    { key: 'tone', label: 'Tone' },
  ];

  let metadataString = "";
  fields.forEach(field => {
    const value = novelDetails[field.key];
    if (value && String(value).trim() !== "") {
      if (metadataString === "") {
        metadataString = "NOVEL DETAILS:\n";
      }
      metadataString += `${field.label}: ${String(value).trim().replace(/\n/g, '\n  ')}\n`;
    }
  });

  if (metadataString !== "") {
    metadataString += "\n---\n\n";
  }
  return metadataString;
}

// Level 1: Full detail
function buildNovelOutlineContext_L1(actOrder, acts, chapters, scenes, concepts, targetChapterId, targetSceneId, novelDetails) {
  let outline = buildNovelMetadataString(novelDetails);

  outline += "FULL NOVEL OUTLINE AND CONCEPTS:\n";
  // For L1, trimDescription is false.
  const conceptDetails = buildConceptDetails(concepts, false, scenes, targetChapterId, targetSceneId, acts, chapters);
  if (conceptDetails.trim() !== "") {
    outline += conceptDetails + "\n\n";
  } else {
    // Add a newline if no concepts to separate from structural outline if metadata was present
    if (outline.startsWith("NOVEL DETAILS:")) outline += "\n";
  }
  // For L1 novel outline, includeSynopses=true, includeSceneText=false.
  // The other flags (focusPreviousChapterOnly, allPreviousChapterSynopses, currentChapterStructureOnly) are not relevant here.
  outline += buildStructuralOutline(actOrder, acts, chapters, scenes, targetChapterId, targetSceneId, true, false, false, false, false);
  return outline.trim();
}

function buildSceneTextContext_L1(actOrder, acts, chapters, scenes, concepts, novelDetails, targetChapterId, targetSceneId, currentSceneText) {
  let context = "CONTEXT FOR SCENE WRITING:\n";
  context += buildNovelMetadataString(novelDetails);
  
  // For L1, trimDescription is false.
  const conceptDetails = buildConceptDetails(concepts, false, scenes, targetChapterId, targetSceneId, acts, chapters);
  if (conceptDetails.trim() !== "") context += conceptDetails + "\n---\n";
  
  context += "RELEVANT OUTLINE AND PRECEDING SCENES:\n";
  // For L1 scene text, includeSynopses=true, includeSceneText=true.
  // This triggers the detailed L1 logic in buildStructuralOutline.
  context += buildStructuralOutline(actOrder, acts, chapters, scenes, targetChapterId, targetSceneId, true, true, false, false, false);
  
  const currentChapter = chapters[targetChapterId];
  const currentScene = scenes[targetSceneId];
  if (currentScene && currentScene.synopsis) {
     context += `\n\nCURRENT SCENE TO WRITE (${currentScene.name || 'Unnamed Scene'}):\nSynopsis: ${currentScene.synopsis}\n`;
  } else if (!targetSceneId && currentChapter) { // New scene
     context += `\n\nCURRENT SCENE TO WRITE (New scene in chapter: ${currentChapter.name || 'Unnamed Chapter'}):\n`;
  }
  return context.trim();
}

// --- Generic Helper Functions ---
function buildConceptDetails(concepts, trimDescription = false, scenes = null, targetChapterId = null, targetSceneId = null, acts = null, chapters = null) {
  let relevantConceptIds = new Set();
  if (scenes && targetChapterId && chapters && acts) { // Context for scene text, try to be specific
    const currentChapter = chapters[targetChapterId];
    if (currentChapter && currentChapter.sceneOrder) {
      currentChapter.sceneOrder.forEach(sceneIdInChapter => {
        const scene = scenes[sceneIdInChapter];
        let includeConceptsFromThisScene = true;
        if (targetSceneId) { // Only include concepts from scenes up to and including the target scene
            const targetSceneIndexInChapter = currentChapter.sceneOrder.indexOf(targetSceneId);
            const currentSceneIndexInChapter = currentChapter.sceneOrder.indexOf(sceneIdInChapter);
            if (targetSceneIndexInChapter !== -1 && currentSceneIndexInChapter > targetSceneIndexInChapter) {
                includeConceptsFromThisScene = false;
            }
        }
        if (includeConceptsFromThisScene && scene && scene.context) {
          scene.context.forEach(id => relevantConceptIds.add(id));
        }
      });
    }
  } else if (concepts) { // Fallback for novelOutline or if target data is missing, include all concepts
    concepts.forEach(c => relevantConceptIds.add(c.id));
  }

  let details = "";
  if (concepts && concepts.length > 0 && relevantConceptIds.size > 0) {
      details = "CONCEPTS:\n";
  }
  let conceptsIncludedCount = 0;
  if (concepts) {
    relevantConceptIds.forEach(id => {
      const concept = concepts.find(c => c.id === id);
      if (concept) {
        conceptsIncludedCount++;
        details += `  Name: ${concept.name || 'Unnamed Concept'}\n`;
        if (concept.aliases && concept.aliases.length > 0) {
          details += `    Aliases: ${concept.aliases.join(', ')}\n`;
        }
        if (concept.description) {
          // trimDescription is passed but L1 always uses false.
          const desc = trimDescription ? concept.description.substring(0, 100) + (concept.description.length > 100 ? '...' : '') : concept.description;
          details += `    Description: ${desc.replace(/\n/g, '\n      ')}\n`;
        }
        details += "\n";
      }
    });
  }
  
  if (conceptsIncludedCount === 0) return "";
  return details;
}

function buildStructuralOutline(
  actOrder, acts, chapters, scenes,
  targetChapterId, targetSceneId,
  includeSynopses = true,
  includeSceneText = false, 
  focusPreviousChapterOnly = false, 
  allPreviousChapterSynopses = false, 
  currentChapterStructureOnly = false 
) {
  let outline = "";

  // The L1 sceneText strategy (includeSceneText=true) has specific logic.
  // Other strategies (novelOutline) or simplified calls will use the more generic block below.
  if (includeSceneText && targetSceneId && targetChapterId && chapters && acts && scenes && actOrder) {
    let earlierChaptersSynopsisContent = "";
    let precedingTwoScenesFullTextContent = "";
    
    const allSceneIdsInOrder = [];
    const sceneToChapterMap = {}; // Helper to find chapter for a scene
    actOrder.forEach(actId => {
      const act = acts[actId];
      if (act && act.chapterOrder) {
        act.chapterOrder.forEach(chapId => {
          const chapter = chapters[chapId];
          if (chapter && chapter.sceneOrder) {
            chapter.sceneOrder.forEach(sceneId => {
              allSceneIdsInOrder.push(sceneId);
              sceneToChapterMap[sceneId] = chapId;
            });
          }
        });
      }
    });

    const targetSceneGlobalIndex = allSceneIdsInOrder.indexOf(targetSceneId);
    let firstOfTwoPrecedingScenesId = null;

    // 1. Get full text of up to two immediately preceding scenes
    if (targetSceneGlobalIndex > 0) {
      precedingTwoScenesFullTextContent = "IMMEDIATELY PRECEDING SCENES (FULL TEXT):\n";
      const startIndex = Math.max(0, targetSceneGlobalIndex - 2);
      let actualPrecedingScenesAdded = 0;
      for (let i = startIndex; i < targetSceneGlobalIndex; i++) {
        const prevSceneId = allSceneIdsInOrder[i];
        if (i === startIndex) { // This is the first of the (up to) two preceding scenes
            firstOfTwoPrecedingScenesId = prevSceneId;
        }
        const sceneObj = scenes[prevSceneId];
        if (sceneObj) {
          let sceneChapter, sceneAct;
          const chapIdForScene = sceneToChapterMap[prevSceneId];
          if (chapIdForScene) sceneChapter = chapters[chapIdForScene];
          if (sceneChapter) sceneAct = Object.values(acts).find(act => act.chapterOrder?.includes(chapIdForScene));

          if (sceneAct) precedingTwoScenesFullTextContent += `Act: ${sceneAct.name || 'Unnamed Act'}\n`;
          if (sceneChapter) precedingTwoScenesFullTextContent += `  Chapter: ${sceneChapter.name || 'Unnamed Chapter'}\n`;
          precedingTwoScenesFullTextContent += `    Scene: ${sceneObj.name || 'Unnamed Scene'}\n`;
          if (sceneObj.synopsis) precedingTwoScenesFullTextContent += `      Synopsis: ${sceneObj.synopsis.replace(/\n/g, '\n        ')}\n`;
          if (sceneObj.content?.trim()) precedingTwoScenesFullTextContent += `      --- Start Scene Text ---\n${sceneObj.content.replace(/\n/g, '\n        ')}\n      --- End Scene Text ---\n`;
          else precedingTwoScenesFullTextContent += `      (No content for this scene)\n`;
          precedingTwoScenesFullTextContent += "\n";
          actualPrecedingScenesAdded++;
        }
      }
      if (actualPrecedingScenesAdded > 0) {
        outline += precedingTwoScenesFullTextContent + "---\n\n";
      } else {
        precedingTwoScenesFullTextContent = ""; // No preceding scenes found
      }
    }

    // 2. Get synopses of all chapters before the chapter of firstOfTwoPrecedingScenesId (or before targetChapterId if no preceding scenes)
    let chapterToStopSynopsesAt = targetChapterId; // Default to target chapter
    if (firstOfTwoPrecedingScenesId) {
        chapterToStopSynopsesAt = sceneToChapterMap[firstOfTwoPrecedingScenesId] || targetChapterId;
    }

    let synopsesHeaderAdded = false;
    for (const actId of actOrder) {
        const act = acts[actId];
        if (!act || !act.chapterOrder) continue;
        let currentActHeaderAddedToSynopses = false;

        for (const chapId of act.chapterOrder) {
            if (chapId === chapterToStopSynopsesAt) { // Stop before this chapter
                break; // Break from inner loop (chapters)
            }
            const chapter = chapters[chapId];
            if (chapter) {
                if (!synopsesHeaderAdded) {
                    earlierChaptersSynopsisContent += "SYNOPSES OF EARLIER CHAPTERS:\n";
                    synopsesHeaderAdded = true;
                }
                if (!currentActHeaderAddedToSynopses) {
                    earlierChaptersSynopsisContent += `Act: ${act.name || 'Unnamed Act'}\n`;
                    currentActHeaderAddedToSynopses = true;
                }
                earlierChaptersSynopsisContent += `  Chapter: ${chapter.name || 'Unnamed Chapter'}\n`;
                if (chapter.sceneOrder && includeSynopses) {
                    chapter.sceneOrder.forEach(sceneIdInChapter => {
                        const scene = scenes[sceneIdInChapter];
                        if (scene && scene.synopsis) {
                            earlierChaptersSynopsisContent += `    Scene: ${scene.name || 'Unnamed Scene'} - Synopsis: ${scene.synopsis.replace(/\n/g, '\n      ')}\n`;
                        } else if (scene) {
                            earlierChaptersSynopsisContent += `    Scene: ${scene.name || 'Unnamed Scene'} - (No synopsis)\n`;
                        }
                    });
                }
                earlierChaptersSynopsisContent += "\n";
            }
        }
        if (act.chapterOrder && act.chapterOrder.includes(chapterToStopSynopsesAt)) {
             break; // Break from outer loop (acts) if the stop chapter was in this act
        }
    }
    if (synopsesHeaderAdded) {
        outline = earlierChaptersSynopsisContent + "---\n\n" + outline; // Prepend synopses
    }
    
    // 3. Current chapter's structure up to the target scene (names only)
    const currentChapter = chapters[targetChapterId];
    const actOfCurrentChapter = Object.values(acts).find(a => a.chapterOrder?.includes(targetChapterId));
    outline += `CURRENT CHAPTER STRUCTURE (leading to target scene):\n`;
    if (actOfCurrentChapter) outline += `Act: ${actOfCurrentChapter.name || 'Unnamed Act'}\n`;
    if (currentChapter) outline += `  Chapter: ${currentChapter.name || 'Unnamed Chapter'}\n`;

    if (currentChapter && currentChapter.sceneOrder) {
      for (const sceneIdInOrder of currentChapter.sceneOrder) {
        const scene = scenes[sceneIdInOrder];
        if (!scene) continue;
        
        // We only list scene names in the current chapter up to the target scene
        // The full text of preceding scenes (if among the last two overall) is already added.
        if (currentChapter.sceneOrder.indexOf(sceneIdInOrder) < currentChapter.sceneOrder.indexOf(targetSceneId)) {
            outline += `    Scene: ${scene.name || 'Unnamed Scene'} (Synopsis: ${scene.synopsis || 'N/A'})\n`;
        } else if (sceneIdInOrder === targetSceneId) {
          outline += `    Scene: ${scene.name || 'Unnamed Scene'} (This is the scene to write - its synopsis is part of the main query)\n`;
          break; 
        }
      }
    }
    return outline.trim();
  }

  // Fallback for novelOutline strategy (or if includeSceneText is false, which means it's not L1 sceneText)
  // This builds a general structural outline with synopses if requested.
  let processingCompletedOuter = false;
  for (const actId of actOrder) {
    if (processingCompletedOuter) break;
    const act = acts[actId];
    if (!act) continue;
    outline += `Act: ${act.name || 'Unnamed Act'}\n`;
    if (act.chapterOrder) {
      for (const chapId of act.chapterOrder) {
        if (processingCompletedOuter && chapId !== targetChapterId) continue;
        const chapter = chapters[chapId];
        if (!chapter) continue;
        outline += `  Chapter: ${chapter.name || 'Unnamed Chapter'}\n`;
        if (chapter.sceneOrder) {
          for (const sceneIdInOrder of chapter.sceneOrder) {
            const scene = scenes[sceneIdInOrder];
            if (!scene) continue;
            outline += `    Scene: ${scene.name || 'Unnamed Scene'}\n`;
            if (includeSynopses && scene.synopsis) {
              outline += `      Synopsis: ${scene.synopsis.replace(/\n/g, '\n        ')}\n`;
            }
            // No full scene text in this general outline builder path
            if (targetSceneId && sceneIdInOrder === targetSceneId) {
              processingCompletedOuter = true; 
              break;
            }
          }
        }
        if (processingCompletedOuter && chapId === targetChapterId && targetSceneId) break; 
      }
    }
    if (processingCompletedOuter && acts[actId]?.chapterOrder.includes(targetChapterId) && targetSceneId) break;
  }
  return outline.trim();
}
