import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameDifficulty, GameMode, Record } from '../types';
import { recordsService } from './supabase';

const PENDING_RECORDS_KEY = '@nexus_pending_records';
const LOCAL_RECORDS_KEY = '@nexus_local_records';

export type LocalRecordInput = {
  agentName: string;
  attempts: number;
  time: number;
  mode: GameMode;
  difficulty?: GameDifficulty;
  opponentName?: string;
  timestamp: number;
};

/**
 * Service de persistance des records pour support OFFLINE:
 *  - Les nouveaux records sont d'abord stockés localement
 *  - Une synchronisation vers Firestore est tentée dès que possible
 */
export const recordsPersistenceService = {
  /**
   * Charger les records en attente de synchronisation
   */
  async getPendingRecords(): Promise<LocalRecordInput[]> {
    try {
      const raw = await AsyncStorage.getItem(PENDING_RECORDS_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as LocalRecordInput[];
    } catch (error) {
      console.error('Erreur chargement pending records:', error);
      return [];
    }
  },

  async savePendingRecords(records: LocalRecordInput[]): Promise<void> {
    try {
      await AsyncStorage.setItem(PENDING_RECORDS_KEY, JSON.stringify(records));
    } catch (error) {
      console.error('Erreur sauvegarde pending records:', error);
    }
  },

  /**
   * Ajouter un record à la file locale (toujours appelé en premier)
   */
  async queueRecord(record: LocalRecordInput): Promise<void> {
    const pending = await this.getPendingRecords();
    pending.push(record);
    await this.savePendingRecords(pending);
    await this.addLocalRecord(record);
  },

  /**
   * Sauvegarder une copie locale des meilleurs records pour affichage hors-ligne
   */
  async addLocalRecord(record: LocalRecordInput): Promise<void> {
    try {
      const existing = await this.loadLocalRecords();
      const updated = [...existing, record];

      // Garder au plus 100 records locaux, triés par performance
      const sorted = updated
        .sort((a, b) => {
          if (a.mode !== b.mode) {
            // Prioriser SOLO pour l'affichage local
            if (a.mode === 'SOLO') return -1;
            if (b.mode === 'SOLO') return 1;
          }
          if (a.attempts !== b.attempts) return a.attempts - b.attempts;
          return a.time - b.time;
        })
        .slice(0, 100);

      await AsyncStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(sorted));
    } catch (error) {
      console.error('Erreur sauvegarde local records:', error);
    }
  },

  async loadLocalRecords(): Promise<LocalRecordInput[]> {
    try {
      const raw = await AsyncStorage.getItem(LOCAL_RECORDS_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as LocalRecordInput[];
    } catch (error) {
      console.error('Erreur chargement local records:', error);
      return [];
    }
  },

  /**
   * Tenter de synchroniser les records en attente vers Firestore.
   * Si une erreur survient (offline, quota, etc.), on garde le reste pour plus tard.
   */
  async trySyncPendingRecords(): Promise<{
    synced: number;
    remaining: number;
  }> {
    const pending = await this.getPendingRecords();
    if (pending.length === 0) {
      return { synced: 0, remaining: 0 };
    }

    let synced = 0;
    const stillPending: LocalRecordInput[] = [];

    for (const record of pending) {
      try {
        await recordsService.saveRecord(record as Omit<Record, 'id'>);
        synced += 1;
      } catch (error) {
        console.warn('Erreur sync record, conservé en local:', error);
        stillPending.push(record);
      }
    }

    // Ajouter les records non synchronisés à la liste restante
    const remainingRecords = [...stillPending];

    await this.savePendingRecords(remainingRecords);

    return { synced, remaining: remainingRecords.length };
  },
};

