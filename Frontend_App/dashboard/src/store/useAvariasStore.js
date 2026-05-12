/**
 * Avarias Store - Reporte e gestão de avarias
 * CASAIS Fleet Intelligence
 *
 * Persistência: Firestore (artifacts/{projectId}/public/data/avarias)
 * Fotos: Firebase Storage (avarias/{avariaId}/{filename})
 */

import { create } from 'zustand';
import {
  collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, projectId } from '../config/firebase';
import { createCollectionListener } from '../utils/firestoreListeners';

const basePath = `artifacts/${projectId}/public/data`;

const useAvariasStore = create((set, get) => ({
  avarias: [],
  loading: true,

  // Inicializar listener Firestore (chamado uma vez no App)
  initializeListener: () => {
    if (!db) return () => {};

    const createAvariasListener = createCollectionListener(
      db,
      `${basePath}/avarias`,
      {
        orderByField: 'createdAt',
        orderByDirection: 'desc',
        onError: (msg, error) => {
          console.error('Erro avarias listener:', error);
          set({ loading: false });
        },
      }
    );

    return createAvariasListener((data) => {
      set({ avarias: data, loading: false });
    });
  },

  // Submeter nova avaria com upload de fotos para Storage
  submitAvaria: async (avaria, photoFiles = []) => {
    if (!db) return { success: false, error: 'DB não inicializado' };

    try {
      const avariaData = {
        ...avaria,
        status: 'pendente',
        notas: [],
        photos: [],
        createdAt: Timestamp.now(),
        resolvedAt: null,
        resolvedBy: null,
      };

      // Criar doc no Firestore primeiro (para ter o ID)
      const docRef = await addDoc(collection(db, `${basePath}/avarias`), avariaData);

      // Upload fotos para Storage
      if (photoFiles.length > 0 && storage) {
        const uploadedPhotos = [];
        for (const file of photoFiles) {
          try {
            const timestamp = Date.now();
            const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const storagePath = `avarias/${docRef.id}/${fileName}`;
            const storageRef = ref(storage, storagePath);

            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            uploadedPhotos.push({
              id: `photo_${timestamp}`,
              name: file.name,
              url: downloadURL,
              path: storagePath,
              size: file.size,
              type: file.type,
            });
          } catch (err) {
            console.error('Falha no upload da foto:', err);
          }
        }

        if (uploadedPhotos.length > 0) {
          await updateDoc(docRef, {
            photos: uploadedPhotos,
            hasPhoto: true,
            photoCount: uploadedPhotos.length,
          });
        }
      }

      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Erro ao submeter avaria:', error);
      return { success: false, error: error.message };
    }
  },

  // Adicionar nota interna
  addNota: async (avariaId, texto, autor) => {
    if (!db) return;
    try {
      const { avarias } = get();
      const avaria = avarias.find(a => a.id === avariaId);
      const currentNotas = avaria?.notas || [];

      const nota = {
        id: `nota_${Date.now()}`,
        texto: texto.trim(),
        autor: autor || 'Gestor',
        createdAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, `${basePath}/avarias`, avariaId), {
        notas: [...currentNotas, nota],
      });
    } catch (error) {
      console.error('Erro ao adicionar nota:', error);
    }
  },

  // Marcar avaria como resolvida
  resolverAvaria: async (avariaId) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, `${basePath}/avarias`, avariaId), {
        status: 'resolvida',
        resolvedAt: Timestamp.now(),
        resolvedBy: 'Gestor',
      });
    } catch (error) {
      console.error('Erro ao resolver avaria:', error);
    }
  },

  // Getters
  getAvariasPendentes: () => {
    return get().avarias.filter((a) => a.status === 'pendente');
  },

  getAvariasResolvidas: () => {
    return get().avarias.filter((a) => a.status === 'resolvida');
  },

  getAvariasByMachine: (machineId) => {
    return get().avarias.filter((a) => a.machineId === machineId);
  },
}));

export default useAvariasStore;
