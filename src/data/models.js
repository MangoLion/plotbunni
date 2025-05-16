// Helper function to generate UUID, with fallback for older browsers
function generateUUID() {
  if (crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Basic fallback UUID generator (not cryptographically secure, but sufficient for unique IDs)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * @typedef {object} Concept
 * @property {string} id - Unique identifier (e.g., UUID)
 * @property {string} name - The primary identifier for the Concept.
 * @property {string[]} aliases - Alternative names or terms for the Concept.
 * @property {string[]} tags - Keywords to categorize and filter Concepts.
 * @property {string} description - A detailed explanation of the Concept.
 * @property {string} notes - Private notes for the user.
 * @property {number} priority - Determines order in AI prompts (lower = higher).
 * @property {string|null} image - Base64String for an image, or null.
 * @property {number} creation_date - Timestamp (e.g., Date.now()).
 * @property {number} last_modified_date - Timestamp (e.g., Date.now()).
 */

/**
 * Creates a new Concept object.
 * @param {Partial<Concept>} initialData - Initial data for the concept.
 * @returns {Concept}
 */
export function createConcept(initialData = {}) {
  const now = Date.now();
  return {
    id: initialData.id || generateUUID(), // Generate UUID for new concepts
    name: initialData.name || '',
    aliases: initialData.aliases || [],
    tags: initialData.tags || [],
    description: initialData.description || '',
    notes: initialData.notes || '',
    priority: initialData.priority || 0,
    image: initialData.image || null,
    creation_date: initialData.creation_date || now,
    last_modified_date: initialData.last_modified_date || now,
  };
}

// --- Concept Template Models ---

/**
 * @typedef {object} ConceptTemplateData - The actual template content, a partial Concept.
 * @property {string} [name] - Pre-filled name for the concept (often overridden by user).
 * @property {string[]} [aliases] - Pre-filled aliases.
 * @property {string[]} [tags] - Pre-filled tags.
 * @property {string} [description] - Pre-filled description.
 * @property {string} [notes] - Pre-filled notes.
 * @property {number} [priority] - Pre-filled priority.
 * @property {string|null} [image] - Pre-filled image URL or base64.
 */

/**
 * @typedef {object} ConceptTemplate
 * @property {string} id - Unique identifier for the template (e.g., UUID).
 * @property {string} name - The display name of the template (e.g., "Character", "Location").
 * @property {ConceptTemplateData} templateData - The actual data to pre-fill a new concept.
 * @property {boolean} isDefault - Indicates if this is a system-provided default template.
 * @property {number} creation_date - Timestamp (e.g., Date.now()).
 * @property {number} last_modified_date - Timestamp (e.g., Date.now()).
 */

/**
 * Creates a new ConceptTemplate object.
 * @param {Partial<ConceptTemplate>} initialData - Initial data for the template.
 * @returns {ConceptTemplate}
 */
export function createConceptTemplate(initialData = {}) {
  const now = Date.now();
  return {
    id: initialData.id || generateUUID(),
    name: initialData.name || 'Untitled Template',
    templateData: initialData.templateData || {},
    isDefault: initialData.isDefault || false,
    creation_date: initialData.creation_date || now,
    last_modified_date: initialData.last_modified_date || now,
  };
}

// --- Plan Interface Models ---

/**
 * @typedef {object} Scene
 * @property {string} id - Unique identifier (e.g., UUID)
 * @property {string} name - Name of the scene.
 * @property {string[]} tags - Tags for categorization.
 * @property {string} synopsis - Summary of the scene.
 * @property {string[]} context - List of Concept IDs relevant to this scene.
 * @property {boolean} autoUpdateContext - Whether to automatically update context based on synopsis/tags.
 * @property {string} content - The actual manuscript content of the scene.
 * @property {number} creation_date - Timestamp.
 * @property {number} last_modified_date - Timestamp.
 */

/**
 * Creates a new Scene object.
 * @param {Partial<Scene>} initialData
 * @returns {Scene}
 */
export function createScene(initialData = {}) {
  const now = Date.now();
  return {
    id: initialData.id || generateUUID(),
    name: initialData.name || 'Untitled Scene',
    tags: initialData.tags || [],
    synopsis: initialData.synopsis || '',
    context: initialData.context || [],
    autoUpdateContext: initialData.autoUpdateContext === undefined ? true : initialData.autoUpdateContext, // Default to true
    content: initialData.content || '', // Added content field
    creation_date: initialData.creation_date || now,
    last_modified_date: initialData.last_modified_date || now,
  };
}

/**
 * @typedef {object} Chapter
 * @property {string} id - Unique identifier (e.g., UUID)
 * @property {string} name - Name of the chapter.
 * @property {string[]} sceneOrder - Ordered list of Scene IDs within this chapter.
 * @property {number} creation_date - Timestamp.
 * @property {number} last_modified_date - Timestamp.
 */

/**
 * Creates a new Chapter object.
 * @param {Partial<Chapter>} initialData
 * @returns {Chapter}
 */
export function createChapter(initialData = {}) {
  const now = Date.now();
  return {
    id: initialData.id || generateUUID(),
    name: initialData.name || 'Untitled Chapter',
    sceneOrder: initialData.sceneOrder || [],
    creation_date: initialData.creation_date || now,
    last_modified_date: initialData.last_modified_date || now,
  };
}

/**
 * @typedef {object} Act
 * @property {string} id - Unique identifier (e.g., UUID)
 * @property {string} name - Name of the act.
 * @property {string[]} chapterOrder - Ordered list of Chapter IDs within this act.
 * @property {number} creation_date - Timestamp.
 * @property {number} last_modified_date - Timestamp.
 */

/**
 * Creates a new Act object.
 * @param {Partial<Act>} initialData
 * @returns {Act}
 */
export function createAct(initialData = {}) {
  const now = Date.now();
  return {
    id: initialData.id || generateUUID(),
    name: initialData.name || 'Untitled Act',
    chapterOrder: initialData.chapterOrder || [],
    creation_date: initialData.creation_date || now,
    last_modified_date: initialData.last_modified_date || now,
  };
}

/**
 * @typedef {object} ProjectData
 * @property {string} projectId
 * @property {string} projectName
 * @property {Object<string, Concept>} concepts - Concepts keyed by ID
 * @property {Object<string, Act>} acts
 * @property {Object<string, Chapter>} chapters
 * @property {Object<string, Scene>} scenes
 * @property {object} settings - Application settings
 * @property {number} last_saved_date
 */

// --- Novel Data Model (Replaces ProjectData for multi-novel support) ---

/**
 * @typedef {object} NovelMetadata
 * @property {string} id - Unique identifier for the novel (e.g., UUID).
 * @property {string} name - The name of the novel.
 * @property {string} lastModified - ISO string timestamp of the last modification.
 */

/**
 * @typedef {object} NovelData
 * @property {string} [id] - Novel ID, typically managed by NovelMetadata, but useful for context.
 * @property {string} authorName - The name of the novel's author.
 * @property {string} synopsis - A brief summary of the novel.
 * @property {string|null} coverImage - Base64 encoded string of the novel's cover image, or null.
 * @property {string} [pointOfView] - e.g., First Person, Third Person Limited.
 * @property {string} [genre] - e.g., Fantasy - Urban Fantasy.
 * @property {string} [timePeriod] - e.g., contemporary, historical, futuristic.
 * @property {string} [targetAudience] - e.g., Young Adult, Adult.
 * @property {string} [themes] - e.g., love, betrayal, redemption.
 * @property {string} [tone] - e.g., dark, humorous, suspenseful.
 * @property {Concept[]} concepts - Array of Concept objects.
 * @property {Object<string, Act>} acts - Acts keyed by ID.
 * @property {Object<string, Chapter>} chapters - Chapters keyed by ID.
 * @property {Object<string, Scene>} scenes - Scenes keyed by ID.
 * @property {string[]} actOrder - Ordered list of Act IDs.
 * @property {ConceptTemplate[]} conceptTemplates - Array of ConceptTemplate objects for this novel.
 * @property {number} [creation_date] - Timestamp of novel data creation.
 * @property {number} [last_modified_date] - Timestamp of novel data last modification.
 */

/**
 * Creates a new NovelData object with default values.
 * @param {Partial<NovelData>} initialData - Initial data for the novel.
 * @returns {NovelData}
 */
import { DEFAULT_CONCEPT_TEMPLATES } from './conceptTemplates'; // Will be created/updated later

/**
 * Generates a fresh set of default concept templates with unique IDs.
 * @returns {ConceptTemplate[]}
 */
export function getDefaultConceptTemplates() {
  return DEFAULT_CONCEPT_TEMPLATES.map(template => 
    createConceptTemplate({
      name: template.name,
      templateData: template.templateData,
      isDefault: true, // Mark them as default
    })
  );
}

export function createNovelData(initialData = {}) {
  const now = Date.now();
  return {
    id: initialData.id, // Should correspond to a NovelMetadata id
    authorName: initialData.authorName || '',
    synopsis: initialData.synopsis || '',
    coverImage: initialData.coverImage || null,
    pointOfView: initialData.pointOfView || '',
    genre: initialData.genre || '',
    timePeriod: initialData.timePeriod || '',
    targetAudience: initialData.targetAudience || '',
    themes: initialData.themes || '',
    tone: initialData.tone || '',
    concepts: initialData.concepts || [],
    acts: initialData.acts || {},
    chapters: initialData.chapters || {},
    scenes: initialData.scenes || {},
    actOrder: initialData.actOrder || [],
    conceptTemplates: initialData.conceptTemplates || getDefaultConceptTemplates(),
    creation_date: initialData.creation_date || now,
    last_modified_date: initialData.last_modified_date || now,
  };
}
