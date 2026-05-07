import { doc, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';

/**
 * Factory function to create Firestore CRUD actions.
 * Unifies add/update/delete boilerplate across multiple stores.
 *
 * @param {object} db - Firestore database instance
 * @param {string} basePath - Base collection path (e.g., 'artifacts/project-id/public/data/machines')
 * @returns {object} Object with { create, update, delete } methods
 */
export const createCrudActions = (db, basePath) => ({
  /**
   * Create a new document.
   * @param {string|undefined} id - Document ID (if undefined, auto-generates with idPrefix)
   * @param {object} data - Document data
   * @param {object} options - Options { idPrefix, includeTimestamp }
   * @returns {Promise<{success: boolean, id?: string, error?: string}>}
   */
  create: async (id, data, options = {}) => {
    if (!db) return { success: false, error: 'DB não inicializado' };

    try {
      const { idPrefix, includeTimestamp = true } = options;
      const finalId = id || (idPrefix ? `${idPrefix}_${Date.now()}` : undefined);

      const docData = includeTimestamp
        ? { ...data, createdAt: Timestamp.now() }
        : data;

      await setDoc(doc(db, basePath, finalId), docData);
      return { success: true, id: finalId };
    } catch (error) {
      console.error(`[CRUD] Error creating in ${basePath}:`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update an existing document.
   * @param {string} id - Document ID
   * @param {object} data - Partial data to update
   * @param {object} options - Options { includeTimestamp }
   * @returns {Promise<{success: boolean, id?: string, error?: string}>}
   */
  update: async (id, data, options = {}) => {
    if (!db) return { success: false, error: 'DB não inicializado' };

    try {
      const { includeTimestamp = true } = options;

      const docData = includeTimestamp
        ? { ...data, updatedAt: Timestamp.now() }
        : data;

      await updateDoc(doc(db, basePath, id), docData);
      return { success: true, id };
    } catch (error) {
      console.error(`[CRUD] Error updating in ${basePath}:`, error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Delete a document.
   * @param {string} id - Document ID
   * @returns {Promise<{success: boolean, id?: string, error?: string}>}
   */
  delete: async (id) => {
    if (!db) return { success: false, error: 'DB não inicializado' };

    try {
      await deleteDoc(doc(db, basePath, id));
      return { success: true, id };
    } catch (error) {
      console.error(`[CRUD] Error deleting from ${basePath}:`, error);
      return { success: false, error: error.message };
    }
  },
});
