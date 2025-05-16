const DB_NAME = 'PlothareDB';
const STORE_NAME = 'ProjectDataStore'; // This store will hold novel data and metadata
const DB_VERSION = 3; // Incremented DB_VERSION for potential schema changes if any (though structure is mostly key-value)

const NOVELS_METADATA_KEY = 'novelsMetadata'; // Key for the array of novel metadata objects

let dbPromise;

function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      // If upgrading from a version where NOVELS_METADATA_KEY might not exist,
      // we could initialize it here, but it's better handled by getAllNovelMetadata if it returns undefined.
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
      reject(event.target.error);
    };
  });
  return dbPromise;
}

// Internal generic get/set/del functions
async function _idbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => {
      console.error(`Error getting item with key ${key}:`, event.target.error);
      reject(event.target.error);
    };
  });
}

async function _idbSet(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(value, key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => {
      console.error(`Error setting item with key ${key}:`, event.target.error);
      reject(event.target.error);
    };
  });
}

async function _idbDel(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = (event) => {
      console.error(`Error deleting item with key ${key}:`, event.target.error);
      reject(event.target.error);
    };
  });
}

// --- Public API for Novel Management ---

/**
 * Generates a key for storing a specific novel's data.
 * @param {string} novelId - The ID of the novel.
 * @returns {string} The IndexedDB key for the novel's data.
 */
function getNovelDataKey(novelId) {
  return `novel_data_${novelId}`;
}

/**
 * Fetches the metadata for all novels.
 * @returns {Promise<Array<{id: string, name: string, lastModified: string}>>} A promise that resolves to an array of novel metadata objects.
 */
export async function getAllNovelMetadata() {
  const metadata = await _idbGet(NOVELS_METADATA_KEY);
  return metadata || []; // Return empty array if no metadata found
}

/**
 * Fetches the complete data for a specific novel.
 * @param {string} novelId - The ID of the novel.
 * @returns {Promise<Object|undefined>} A promise that resolves to the novel's data object, or undefined if not found.
 */
export async function getNovelData(novelId) {
  if (!novelId) {
    console.error("getNovelData: novelId is required.");
    return undefined;
  }
  const novelKey = getNovelDataKey(novelId);
  return await _idbGet(novelKey);
}

/**
 * Saves the complete data for a specific novel. Also updates the lastModified timestamp in metadata.
 * @param {string} novelId - The ID of the novel.
 * @param {Object} novelData - The novel's data object to save.
 * @returns {Promise<void>}
 */
export async function saveNovelData(novelId, novelData) {
  if (!novelId) {
    console.error("saveNovelData: novelId is required.");
    return;
  }
  const novelKey = getNovelDataKey(novelId);
  await _idbSet(novelKey, novelData);

  // Update lastModified in metadata
  const metadataList = await getAllNovelMetadata();
  const novelMetadataIndex = metadataList.findIndex(meta => meta.id === novelId);
  if (novelMetadataIndex !== -1) {
    metadataList[novelMetadataIndex].lastModified = new Date().toISOString();
    await _idbSet(NOVELS_METADATA_KEY, metadataList);
  } else {
    console.warn(`saveNovelData: Metadata not found for novelId ${novelId} while trying to update lastModified.`);
  }
}

/**
 * Creates a new novel with a given name.
 * Initializes its metadata and empty data structure.
 * @param {string} novelName - The name for the new novel.
 * @returns {Promise<{id: string, name: string, lastModified: string}>} A promise that resolves to the new novel's metadata.
 */
export async function createNovel(novelName) {
  if (!novelName || novelName.trim() === "") {
    throw new Error("Novel name cannot be empty.");
  }

  const novelId = crypto.randomUUID();
  const now = new Date().toISOString();

  const newNovelMetadata = {
    id: novelId,
    name: novelName.trim(),
    lastModified: now,
  };

  // Add to metadata list
  const metadataList = await getAllNovelMetadata();
  metadataList.push(newNovelMetadata);
  await _idbSet(NOVELS_METADATA_KEY, metadataList);

  // Create initial empty data for the novel using the factory from models.js
  // This ensures all default fields, including new ones like authorName, synopsis, coverImage, are set.
  const { createNovelData } = await import('../data/models.js'); // Dynamically import to use it
  const initialNovelData = createNovelData({ id: novelId }); // Pass ID for consistency if needed by createNovelData
  
  // Remove the creation/last_modified dates from the initialNovelData if they are meant to be purely managed by DataContext
  // or ensure createNovelData doesn't set them if they are not part of the DB schema for novel data itself.
  // For now, assuming createNovelData provides the correct structure for storage.
  await _idbSet(getNovelDataKey(novelId), initialNovelData);

  return newNovelMetadata;
}

/**
 * Updates the metadata for a specific novel (e.g., renaming).
 * @param {string} novelId - The ID of the novel to update.
 * @param {Partial<{name: string}>} metadataUpdates - An object containing the metadata fields to update.
 * @returns {Promise<void>}
 */
export async function updateNovelMetadata(novelId, metadataUpdates) {
  if (!novelId) {
    console.error("updateNovelMetadata: novelId is required.");
    return;
  }
  const metadataList = await getAllNovelMetadata();
  const novelMetadataIndex = metadataList.findIndex(meta => meta.id === novelId);

  if (novelMetadataIndex !== -1) {
    metadataList[novelMetadataIndex] = {
      ...metadataList[novelMetadataIndex],
      ...metadataUpdates,
      lastModified: new Date().toISOString(), // Always update lastModified
    };
    await _idbSet(NOVELS_METADATA_KEY, metadataList);
  } else {
    console.warn(`updateNovelMetadata: Metadata not found for novelId ${novelId}.`);
  }
}

/**
 * Deletes a novel, including its data and metadata entry.
 * @param {string} novelId - The ID of the novel to delete.
 * @returns {Promise<void>}
 */
export async function deleteNovel(novelId) {
  if (!novelId) {
    console.error("deleteNovel: novelId is required.");
    return;
  }
  // Delete novel data
  await _idbDel(getNovelDataKey(novelId));

  // Remove from metadata list
  let metadataList = await getAllNovelMetadata();
  metadataList = metadataList.filter(meta => meta.id !== novelId);
  await _idbSet(NOVELS_METADATA_KEY, metadataList);
}

// The old PROJECT_DATA_KEY is no longer used for individual novel data.
// export const PROJECT_DATA_KEY = 'currentProject'; // This line is now removed/commented.
