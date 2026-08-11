import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart3, Globe, Target, Timer, Trophy, Users, Zap } from 'lucide-react-native';
import { AppHeader } from '../components/AppHeader';
import { ModernCard } from '../components/ModernCard';
import { ModernBadge } from '../components/ModernBadge';
import { recordsService } from '../services/supabase';
import { recordsPersistenceService } from '../services/recordsPersistence';
import { THEME } from '../theme';
import { Record } from '../types';

const AGENT_NAME_KEY = '@nexus_arena_agent_name';

export function RecordsScreen() {
  const { width } = useWindowDimensions();
  const [records, setRecords] = useState<Record[]>([]);
  const [localRecords, setLocalRecords] = useState<
    { agentName: string; attempts: number; time: number; mode: string; difficulty?: string; timestamp: number }[]
  >([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [agentName, setAgentName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'SOLO' | 'ALL'>('SOLO');
  const [filteredRecords, setFilteredRecords] = useState<Record[]>([]);
  const tabAnimValue = useRef(new Animated.Value(0)).current;

  const isSmallScreen = width < 375;
  const isPhone = width < 600;
  const isTablet = width >= 600;

  useEffect(() => {
    loadAgentName();

    // Records Supabase (online, realtime)
    const unsubscribe = recordsService.subscribeToRecords((newRecords) => {
      setRecords(newRecords);
    });

    // Records locaux (offline)
    recordsPersistenceService.loadLocalRecords().then(setLocalRecords).catch(() => {});
    recordsPersistenceService.getPendingRecords().then((pending) => {
      setPendingCount(pending.length);
    }).catch(() => {});

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Animation de transition d'onglet
    Animated.timing(tabAnimValue, {
      toValue: activeTab === 'SOLO' ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();

    // Filtrer et trier les records selon l'onglet actif
    // Fusionner records distants et locaux pour l'affichage,
    // en évitant les doublons évidents (même joueur, même temps, même tentatives)
    const merged = [
      ...records,
      ...localRecords
        .filter((local) =>
          !records.some(
            (r) =>
              r.agentName === local.agentName &&
              r.attempts === local.attempts &&
              r.time === local.time &&
              r.mode === local.mode
          )
        )
        .map((local) => ({
          id: `local-${local.agentName}-${local.timestamp}`,
          ...local,
        } as Record)),
    ];

    const filtered = merged
      .filter((r) => (activeTab === 'ALL' ? true : r.mode === 'SOLO'))
      .sort((a, b) => {
        if (a.attempts !== b.attempts) return a.attempts - b.attempts;
        return a.time - b.time;
      });
    setFilteredRecords(filtered);
  }, [records, activeTab, tabAnimValue]);

  const loadAgentName = async () => {
    try {
      const saved = await AsyncStorage.getItem(AGENT_NAME_KEY);
      if (saved) {
        setAgentName(saved);
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const getDifficultyLabel = (difficulty?: string) => {
    const labels: { [key: string]: string } = {
      'DEBUTANT': 'Débutant',
      'NORMAL': 'Normal',
      'EXPERT': 'Expert',
      'IMPOSSIBLE': 'Impossible',
    };
    return labels[difficulty || 'NORMAL'] || difficulty || '-';
  };

  const getModeLabel = (mode?: string) => {
    const map: { [key: string]: string } = {
      'SOLO': 'SOLO',
      'MULTI-LOCAL': 'LOCAL',
      'MULTI-ONLINE': 'ONLINE',
    };
    return map[mode || 'SOLO'] || mode || '-';
  };

  const getModeIcon = (mode?: string) => {
    const map: { [key: string]: typeof Target } = {
      'SOLO': Target,
      'MULTI-LOCAL': Users,
      'MULTI-ONLINE': Globe,
    };
    return map[mode || 'SOLO'] || Target;
  };

  const renderRecord = ({ item, index }: { item: Record; index: number }) => {
    const isCurrentUser = item.agentName === agentName;
    const isLocalOnly = item.id.startsWith('local-');
    
    const opponentSuffix = item.opponentName ? ` vs ${item.opponentName}` : '';

    if (isSmallScreen) {
      return (
        <View style={[styles.recordCard, isCurrentUser && styles.currentUserCard, { padding: 12, gap: 10 }]}>
          <View style={[styles.rankBadge, { width: 32, height: 32, borderRadius: 16 }]}>
            <Text style={[styles.rankText, { fontSize: 10 }]}>#{index + 1}</Text>
          </View>
          <View style={styles.recordCardContent}>
            <Text style={[styles.recordName, isCurrentUser && styles.highlightText, { fontSize: 11 }]}>
              {item.agentName}{opponentSuffix}{isLocalOnly ? ' (local)' : ''}
            </Text>
            <View style={[styles.statsRow, { gap: 6 }]}>
              <View style={styles.statInline}>
                <Zap size={10} color={THEME.colors.textSecondary} />
                <Text style={[styles.stat, { fontSize: 9 }]}>{item.attempts}</Text>
              </View>
              <View style={styles.statInline}>
                <Timer size={10} color={THEME.colors.textSecondary} />
                <Text style={[styles.stat, { fontSize: 9 }]}>{item.time}s</Text>
              </View>
            </View>
            <Text style={[styles.difficulty, { fontSize: 9 }]}>
              {getDifficultyLabel(item.difficulty)}
            </Text>
            <ModernBadge
              label={getModeLabel(item.mode)}
              icon={getModeIcon(item.mode)}
              variant={isCurrentUser ? 'success' : 'primary'}
              size="sm"
              animated={false}
              style={styles.modeBadgeWrap}
            />
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.recordRow, isCurrentUser && styles.currentUserRow]}>
        <Text style={[styles.rankColumn, isCurrentUser && styles.highlightText]}>
          #{index + 1}
        </Text>
        <Text style={[styles.nameColumn, isCurrentUser && styles.highlightText]}>
          {item.agentName}{opponentSuffix}{isLocalOnly ? ' (local)' : ''}
        </Text>
        <Text style={[styles.attemptsColumn, isCurrentUser && styles.highlightText]}>
          {item.attempts}
        </Text>
        <Text style={[styles.timeColumn, isCurrentUser && styles.highlightText]}>
          {item.time}s
        </Text>
        <View style={styles.modeColumn}>
          <ModernBadge
            label={getModeLabel(item.mode)}
            icon={getModeIcon(item.mode)}
            variant={isCurrentUser ? 'success' : 'primary'}
            size="sm"
            animated={false}
          />
        </View>
        <Text style={[styles.difficultyColumn, isCurrentUser && styles.highlightText]}>
          {getDifficultyLabel(item.difficulty)}
        </Text>
      </View>
    );
  };

  const tabWidth = width / 2;
  const tabUnderlinePos = tabAnimValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, tabWidth],
  });

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Classements" subtitle="Records Mondiaux" icon={Trophy} />

      {/* Onglets */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'SOLO' && styles.activeTab]}
          onPress={() => setActiveTab('SOLO')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'SOLO' && styles.activeTabText]}>
            Solo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'ALL' && styles.activeTab]}
          onPress={() => setActiveTab('ALL')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'ALL' && styles.activeTabText]}>
            Tous
          </Text>
        </TouchableOpacity>

        <Animated.View style={[styles.tabUnderline, { transform: [{ translateX: tabUnderlinePos }] }]} />
      </View>

      <ModernCard style={styles.legendContainer}>
        <View style={styles.legendTitleRow}>
          <BarChart3 size={16} color={THEME.colors.textPrimary} />
          <Text style={styles.legendTitle}>Explication des Colonnes</Text>
        </View>
        <View style={styles.legendTable}>
          <View style={styles.legendHeaderRow}>
            <Text style={styles.legendHeaderCell}>Colonne</Text>
            <Text style={styles.legendHeaderCell}>Signification</Text>
          </View>
          
          <View style={styles.legendBodyRow}>
            <Text style={styles.legendLabelCell}>#</Text>
            <Text style={styles.legendDescCell}>Classement (1er, 2ème, 3ème...)</Text>
          </View>
          
          <View style={styles.legendBodyRow}>
            <Text style={styles.legendLabelCell}>Joueur</Text>
            <Text style={styles.legendDescCell}>Nom de l'agent qui joue</Text>
          </View>
          
          <View style={styles.legendBodyRow}>
            <Text style={styles.legendLabelCell}>Tentatives</Text>
            <Text style={styles.legendDescCell}>Nombre d'essais pour trouver le code</Text>
          </View>
          
          <View style={styles.legendBodyRow}>
            <Text style={styles.legendLabelCell}>Temps (s)</Text>
            <Text style={styles.legendDescCell}>Secondes pour résoudre l'énigme</Text>
          </View>

          <View style={styles.legendBodyRow}>
            <Text style={styles.legendLabelCell}>Mode</Text>
            <Text style={styles.legendDescCell}>SOLO / MULTI-LOCAL / MULTI-ONLINE</Text>
          </View>
          
          <View style={styles.legendBodyRow}>
            <Text style={styles.legendLabelCell}>Niveau</Text>
            <Text style={styles.legendDescCell}>Difficulté: DÉBUTANT, NORMAL, EXPERT</Text>
          </View> 

          {pendingCount > 0 && (
            <View style={styles.legendBodyRow}>
              <Text style={styles.legendLabelCell}>Sync</Text>
              <Text style={styles.legendDescCell}>
                {pendingCount} record(s) en attente de synchronisation (mode hors ligne)
              </Text>
            </View>
          )}
        </View>
      </ModernCard>

      {filteredRecords.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aucun record</Text>
          <Text style={styles.emptySubtext}>
            {activeTab === 'SOLO' ? 'Jouez en solo pour établir des records!' : 'Jouez en ligne pour établir des records!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
          renderItem={renderRecord}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          scrollEnabled={true}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgPrimary,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.bgSecondary,
    borderBottomWidth: 2,
    borderBottomColor: THEME.colors.border,
    position: 'relative',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {},
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  activeTabText: {
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: '50%',
    backgroundColor: THEME.colors.primary,
  },
  listContainer: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexGrow: 1,
  },
  recordCard: {
    backgroundColor: THEME.colors.bgSecondary,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: THEME.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  currentUserCard: {
    borderLeftColor: THEME.colors.primary,
    backgroundColor: THEME.colors.bgTertiary,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.white,
  },
  recordCardContent: {
    flex: 1,
  },
  recordName: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 2,
  },
  statInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  stat: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
  },
  difficulty: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  recordRow: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.bgSecondary,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.border,
    alignItems: 'center',
    elevation: 2,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  currentUserRow: {
    borderLeftColor: THEME.colors.primary,
    backgroundColor: THEME.colors.bgTertiary,
  },
  rankColumn: {
    width: 50,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
    fontSize: 11,
  },
  nameColumn: {
    flex: 1,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
    fontSize: 11,
    marginLeft: 4,
  },
  attemptsColumn: {
    width: 60,
    fontWeight: '600',
    color: THEME.colors.success,
    fontSize: 11,
    textAlign: 'center',
  },
  timeColumn: {
    width: 50,
    fontWeight: '600',
    color: THEME.colors.warning,
    fontSize: 11,
    textAlign: 'center',
  },
  modeColumn: {
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBadgeWrap: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  difficultyColumn: {
    flex: 0.8,
    fontWeight: '600',
    color: THEME.colors.textSecondary,
    fontSize: 10,
    textAlign: 'right',
  },
  highlightText: {
    color: THEME.colors.primary,
    fontWeight: '800',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  legendContainer: {
    backgroundColor: THEME.colors.bgTertiary,
    borderRadius: 12,
    marginHorizontal: 12,
    marginVertical: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: THEME.colors.primary,
  },
  legendTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  legendTable: {
    backgroundColor: THEME.colors.bgSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    overflow: 'hidden',
  },
  legendHeaderRow: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  legendHeaderCell: {
    flex: 0.35,
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.white,
  },
  legendBodyRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight,
  },
  legendLabelCell: {
    flex: 0.35,
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  legendDescCell: {
    flex: 0.65,
    fontSize: 11,
    color: THEME.colors.textMuted,
    lineHeight: 15,
  },
});
