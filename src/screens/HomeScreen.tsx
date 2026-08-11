import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Award, Calendar, Flame, LogOut, RefreshCw, Rocket, Target, Timer, Trophy, Users, Zap } from 'lucide-react-native';
import { AppHeader } from '../components/AppHeader';
import { ModernButton } from '../components/ModernButton';
import { ModernCard } from '../components/ModernCard';
import { authService } from '../services/authService';
import { recordsService } from '../services/supabase';
import { recordsPersistenceService } from '../services/recordsPersistence';
import { statsService } from '../services/statsService';
import { updateService } from '../services/updateService';
import { THEME } from '../theme';
import { PlayerStats, Record } from '../types';

const AGENT_NAME_KEY = '@nexus_arena_agent_name';

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const [agentName, setAgentName] = useState<string>('');
  const [worldRecord, setWorldRecord] = useState<Record | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const isSmallScreen = width < 375;
  const isPhone = width < 600;
  const isTablet = width >= 600;

  const loadAgentName = async () => {
    try {
      const saved = await AsyncStorage.getItem(AGENT_NAME_KEY);
      if (saved) {
        setAgentName(saved);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToWorldRecord = () => {
    const unsubscribe = recordsService.subscribeToRecords((records) => {
      if (records.length > 0) {
        // Déterminer le MEILLEUR record: moins de tentatives, puis moins de temps
        const best = [...records].sort((a, b) => {
          if (a.attempts !== b.attempts) return a.attempts - b.attempts;
          return a.time - b.time;
        })[0];
        setWorldRecord(best);
      }
    });
    return unsubscribe;
  }; 

  const handleEnterArena = () => {
    if (!agentName || !agentName.trim()) {
      Alert.alert('Identité manquante', 'Votre identité n\'est pas définie. Voulez-vous vous déconnecter et créer un compte ?', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se déconnecter', onPress: async () => {
            try {
              const { authService } = await import('../services/authService');
              await authService.logout();
            } catch (e) {
              console.error('Erreur logout', e);
              Alert.alert('Erreur', 'Impossible de se déconnecter pour le moment.');
            }
          } },
      ]);
      return;
    }
    // Nom déjà persistant depuis l'auth (on sauvegarde au besoin)
    AsyncStorage.setItem(AGENT_NAME_KEY, agentName.trim());
    navigation.navigate('Game');
  };

  const padding = isSmallScreen ? 12 : isPhone ? 16 : 24;

  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(THEME.colors.bgPrimary, false);
      StatusBar.setBarStyle('dark-content');
      StatusBar.setTranslucent(false);
    }
  }, []);

  useEffect(() => {
    // Animation d'entrée
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    loadAgentName();
    const unsubscribe = subscribeToWorldRecord();

    // Charger les stats ELO/streaks (Étape 3/4) — non bloquant.
    (async () => {
      try {
        const user = await authService.getEffectiveUser();
        if (user?.uid) {
          const [stats, rank] = await Promise.all([
            statsService.getPlayerStats(user.uid),
            statsService.getMyRank(user.uid),
          ]);
          setPlayerStats(stats);
          setMyRank(rank);
        }
      } catch (err) {
        console.warn('Erreur chargement stats ELO:', err);
      }
    })();

    // Écoute les changements d'auth pour mettre à jour immédiatement le nom d'agent (affichage header)
    let authUnsub: (() => void) | null = null;
    try {
      authUnsub = authService.onAuthStateChanged(async (u: any) => {
        if (u && !u.isAnonymous) {
          const display = (u as any).displayName;
          const email = (u as any).email;
          const name = display ? display : (email ? email.split('@')[0] : null);
          const resolved = name || `Agent_${String(Date.now()).slice(-4)}`;
          setAgentName(resolved);
          try { await AsyncStorage.setItem(AGENT_NAME_KEY, resolved); } catch (e) { /* ignore */ }
        }
      });
    } catch (e) {
      // ignore if auth listener can't be attached
    }

    // Fallback: si aucun record Firestore n'est disponible, utiliser les records locaux (hors-ligne)
    (async () => {
      try {
        const { recordsPersistenceService } = await import('../services/recordsPersistence');
        const local = await recordsPersistenceService.loadLocalRecords();
        if (local && local.length > 0) {
          // Déterminer le meilleur record local (moins de tentatives, puis moins de temps)
          const bestLocal = [...local].sort((a, b) => {
            if (a.attempts !== b.attempts) return a.attempts - b.attempts;
            return a.time - b.time;
          })[0];

          // Ne pas écraser un record obtenu via Firestore si présent
          setWorldRecord((prev) => prev || (bestLocal as any));
        }
      } catch (err) {
        // ignore
      }
    })();

    return () => {
      try { unsubscribe(); } catch (e) { /* ignore */ }
      try { if (authUnsub) authUnsub(); } catch (e) { /* ignore */ }
    };
  }, []);

  const handleSyncAndUpdate = async () => {
    try {
      const { synced, remaining } = await recordsPersistenceService.trySyncPendingRecords();
      await updateService.checkManually();

      Alert.alert(
        '🔄 Synchronisation & Mise à jour',
        `Records synchronisés: ${synced}\nEn attente: ${remaining}\n\nLes mises à jour disponibles seront appliquées automatiquement.`,
      );
    } catch (error) {
      console.warn('Erreur sync/update manuelle:', error);
      Alert.alert(
        '⚠️ Impossible de synchroniser',
        'Erreur lors de la synchronisation des records ou de la vérification des mises à jour. Réessaie plus tard.'
      );
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: THEME.colors.bgPrimary }]}>
      <AppHeader title="Code Master" subtitle="Jeu de décryptage" icon={Target} connectedAs={agentName} />
      <Animated.ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: padding, paddingTop: 12 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        style={[
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
          {/* Section Entrée du nom */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: THEME.colors.textPrimary }]}>Votre Identité</Text>
            <Text style={[styles.agentDisplay, { fontSize: isSmallScreen ? 14 : 15 }]}> {agentName ? agentName : 'Nom non défini'} </Text>
            {!agentName && (
              <ModernButton
                text="Définir mon identité"
                variant="primary"
                size="md"
                style={{ marginTop: 12 }}
                onPress={async () => {
                  Alert.alert('Identité manquante', 'Votre identité n\'est pas définie. Voulez-vous vous déconnecter et créer un compte ?', [
                    { text: 'Annuler', style: 'cancel' },
                    {
                      text: 'Se déconnecter',
                      onPress: async () => {
                        try {
                          const { authService } = await import('../services/authService');
                          await authService.logout();
                        } catch (e) {
                          console.error('Erreur logout', e);
                          Alert.alert('Erreur', 'Impossible de se déconnecter pour le moment.');
                        }
                      },
                    },
                  ]);
                }}
              />
            )}
          </View>

          {/* Stats ELO / Streaks (Étape 3/4) */}
          {playerStats && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: THEME.colors.textPrimary }]}>Mes Stats</Text>
              <ModernCard style={styles.statsGrid}>
                <View style={styles.statsCell}>
                  <Award size={20} color={THEME.colors.primary} />
                  <Text style={styles.statsValue}>{playerStats.eloRating}</Text>
                  <Text style={styles.statsCellLabel}>{myRank ? `Rang #${myRank}` : 'ELO'}</Text>
                </View>
                <View style={styles.statsCell}>
                  <Flame size={20} color={THEME.colors.warning} />
                  <Text style={styles.statsValue}>{playerStats.winStreak}</Text>
                  <Text style={styles.statsCellLabel}>Série victoires</Text>
                </View>
                <View style={styles.statsCell}>
                  <Calendar size={20} color={THEME.colors.success} />
                  <Text style={styles.statsValue}>{playerStats.dailyStreak}</Text>
                  <Text style={styles.statsCellLabel}>Jours de suite</Text>
                </View>
              </ModernCard>
              <TouchableOpacity
                style={styles.friendsLinkRow}
                onPress={() => navigation.navigate('Friends')}
                activeOpacity={0.7}
              >
                <Users size={14} color={THEME.colors.primary} />
                <Text style={styles.friendsLinkText}>Voir mes amis & classements</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* World Record */}
          {worldRecord && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: THEME.colors.textPrimary }]}>Record Mondial</Text>
              <ModernCard style={styles.recordCard}>
                <View style={styles.recordRow}>
                  <View style={styles.recordLabelRow}>
                    <Trophy size={14} color={THEME.colors.textSecondary} />
                    <Text style={styles.recordLabel}>Champion</Text>
                  </View>
                  <Text style={styles.recordValue}>{worldRecord.agentName}</Text>
                </View>
                <View style={styles.recordRow}>
                  <View style={styles.recordLabelRow}>
                    <Zap size={14} color={THEME.colors.textSecondary} />
                    <Text style={styles.recordLabel}>Tentatives</Text>
                  </View>
                  <Text style={[styles.recordValue, styles.recordSuccess]}>
                    {worldRecord.attempts}
                  </Text>
                </View>
                <View style={[styles.recordRow, { borderBottomWidth: 0 }]}>
                  <View style={styles.recordLabelRow}>
                    <Timer size={14} color={THEME.colors.textSecondary} />
                    <Text style={styles.recordLabel}>Temps</Text>
                  </View>
                  <Text style={[styles.recordValue, styles.recordWarning]}>
                    {worldRecord.time}s
                  </Text>
                </View>
              </ModernCard>
            </View>
          )}
      </Animated.ScrollView>

      {/* Bouton Principal - Fixé en bas */}
      <View style={styles.footer}>
        <ModernButton
          text="Commencer le Jeu"
          icon={Rocket}
          variant="primary"
          size="lg"
          style={{ width: '100%' }}
          onPress={handleEnterArena}
        />

        <TouchableOpacity
          style={styles.secondaryButtonRow}
          onPress={handleSyncAndUpdate}
          activeOpacity={0.7}
        >
          <RefreshCw size={12} color={THEME.colors.textMuted} />
          <Text style={styles.secondaryButtonText}>
            Forcer la synchro des records & vérifier les mises à jour
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButtonRow, { marginTop: 10 }]}
          onPress={() => {
            Alert.alert('Se déconnecter', 'Voulez-vous vous déconnecter ?', [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Déconnexion', style: 'destructive', onPress: async () => {
                try {
                  await import('../services/authService').then(m => m.authService.logout());
                  Alert.alert('Déconnecté', 'Vous avez été déconnecté avec succès.');
                } catch (err) {
                  console.error('Erreur déconnexion:', err);
                  Alert.alert('Erreur', 'Impossible de se déconnecter pour le moment.');
                }
              } }
            ]);
          }}
          activeOpacity={0.7}
        >
          <LogOut size={12} color={THEME.colors.error} />
          <Text style={[styles.secondaryButtonText, { color: THEME.colors.error }]}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.bgPrimary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
    alignItems: 'center',
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    maxWidth: 600,
    width: '100%',
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  input: {
    borderWidth: 2,
    borderRadius: 12,
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.bgTertiary,
    color: THEME.colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 6,
    fontWeight: '500',
  },
  inputHint: {
    fontSize: 11,
    marginTop: 4,
    color: THEME.colors.textMuted,
  },
  agentDisplay: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    marginTop: 4,
  },
  recordCard: {
    backgroundColor: THEME.colors.warningLight,
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: THEME.colors.warning,
    ...THEME.shadow.sm,
    shadowColor: THEME.colors.warning,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight,
  },
  recordLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
  },
  recordValue: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: THEME.colors.textPrimary,
  },
  recordSuccess: {
    color: THEME.colors.success,
  },
  recordWarning: {
    color: THEME.colors.warning,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.bgTertiary,
    borderRadius: 16,
    padding: 14,
    ...THEME.shadow.sm,
  },
  statsCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  statsCellLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  friendsLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  friendsLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borderLight,
    backgroundColor: 'transparent',
  },
  secondaryButtonTouchable: {
    marginTop: 8,
    alignItems: 'center',
  },
  secondaryButtonRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryButtonText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
  },
  logo: {
    fontWeight: '700',
  },
  title: {
    fontWeight: '700',
  },
  subtitle: {
    fontWeight: '500',
    marginTop: 4,
  },
  infoSection: {
    gap: 12,
  },
  infoCard: {
    backgroundColor: THEME.colors.bgTertiary,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: THEME.colors.primary,
    ...THEME.shadow.sm,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
  footerText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
});

