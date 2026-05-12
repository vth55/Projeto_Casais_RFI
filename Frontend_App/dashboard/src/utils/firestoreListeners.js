import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';

/**
 * Factory function to create Firestore collection listeners.
 * Unifies onSnapshot boilerplate across multiple stores.
 *
 * @param {object} db - Firestore database instance
 * @param {string} collectionPath - Full path to collection (e.g., 'base/sessions')
 * @param {object} options - Configuration options
 * @param {string} options.orderByField - Field to order by (optional)
 * @param {string} options.orderByDirection - 'asc' or 'desc' (default: 'desc')
 * @param {function} options.onError - Error handler callback (default: console.error)
 * @returns {function} Function that accepts a callback and returns unsubscribe function
 */
export const createCollectionListener = (db, collectionPath, options = {}) => {
  const {
    orderByField = null,
    orderByDirection = 'desc',
    onError = console.error,
  } = options;

  return (callback) => {
    const collectionRef = collection(db, collectionPath);
    const q = orderByField
      ? query(collectionRef, orderBy(orderByField, orderByDirection))
      : collectionRef;

    return onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        callback(data);
      },
      (error) => onError(`[Firestore Listener] Error on ${collectionPath}:`, error)
    );
  };
};

/**
 * Factory function to create Firestore document listeners.
 * Used for single documents (e.g., settings).
 *
 * @param {object} db - Firestore database instance
 * @param {string} docPath - Full path to document (e.g., 'base/settings/system')
 * @param {object} options - Configuration options
 * @param {function} options.onError - Error handler callback (default: console.debug)
 * @returns {function} Function that accepts a callback and returns unsubscribe function
 */
export const createDocumentListener = (db, docPath, options = {}) => {
  const {
    onError = console.debug,
  } = options;

  return (callback) => {
    const docRef = doc(db, docPath);

    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          callback({
            id: snapshot.id,
            ...snapshot.data(),
          });
        } else {
          callback(null);
        }
      },
      (error) => onError(`[Firestore Listener] Error on ${docPath}:`, error?.code || error?.message)
    );
  };
};
