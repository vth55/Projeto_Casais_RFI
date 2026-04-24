import { auth } from '../config/firebase';

/**
 * Fetch wrapper that attaches the Firebase Auth ID token as a Bearer header.
 * Falls back to a plain fetch if no user is signed in.
 */
export async function authFetch(url, options = {}) {
    const user = auth.currentUser;
    const headers = { ...(options.headers || {}) };

    if (user) {
        const token = await user.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, { ...options, headers });
}
