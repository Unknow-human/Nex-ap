import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Award, Flame, Globe, Swords, Users } from 'lucide-react-native';
import { AppHeader } from '../components/AppHeader';
import { ModernCard } from '../components/ModernCard';
import { authService } from '../services/authService';
import { friendsService } from '../services/friendsService';
import { statsService } from '../services/statsService';
import { THEME } from '../theme';
import { Challenge, Friend, LeaderboardEntry } from '../types';

type LeaderboardTab = 'global' | 'friends';

export function FriendsScreen() {
  const navigation = useNavigation<any>();
  const [uid, setUid] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string>('');
  const [tab, setTab] = useState<LeaderboardTab>('global');
  const [globalBoard, setGlobalBoard] = useState<LeaderboardEntry[]>([]);
  const [friendsBoard, setFriendsBoard] = useState<LeaderboardEntry[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [challengingUid, setChallengingUid] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const user = await authService.getEffectiveUser();
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }
    setUid(user.uid);

    const savedName = await AsyncStorage.getItem('@nexus_arena_agent_name');
    setAgentName(savedName || 'Agent');

    const [global, friendsLeaderboard, friendsList] = await Promise.all([
      statsService.getGlobalLeaderboard(50),
      statsService.getFriendsLeaderboard(user.uid),
      friendsService.getFriends(user.uid),
    ]);

    setGlobalBoard(global);
    setFriendsBoard(friendsLeaderboard);
    setFriends(friendsList);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Écoute des défis reçus en temps réel + navigation vers l'arène en cas d'acceptation.
  useEffect(() => {
    if (!uid) return;

    const unsubscribe = friendsService.subscribeToIncomingChallenges(uid, (challenge: Challenge) => {
      Alert.alert(
        '⚔️ Défi reçu !',
        `${challenge.fromPlayerName} te défie en duel. Accepter ?`,
        [
          {
            text: 'Refuser',
            style: 'cancel',
            onPress: () => friendsService.respondToChallenge(challenge.id, false),
          },
          {
            text: 'Accepter',
            onPress: async () => {
              const arenaId = await friendsService.respondToChallenge(challenge.id, true);
              if (arenaId) {
                navigation.navigate('Game', { joinArenaId: arenaId });
              } else {
                Alert.alert('⚠️ ERREUR', 'Ce défi a expiré ou a déjà été traité.');
              }
            },
          },
        ]
      );
    });

    return unsubscribe;
  }, [uid, navigation]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleChallenge = async (friend: Friend) => {
    if (!uid || !agentName) return;
    setChallengingUid(friend.uid);
    try {
      const result = await friendsService.challengeFriend(friend.uid, friend.agentName, agentName);
      if (result) {
        Alert.alert(
          '⚔️ Défi envoyé !',
          `En attente que ${friend.agentName} accepte...`,
        );
        navigation.navigate('Game', { joinArenaId: result.arenaId });
      } else {
        Alert.alert('⚠️ ERREUR', 'Impossible d\'envoyer le défi pour le moment.');
      }
    } finally {
      setChallengingUid(null);
    }
  };

  const board = tab === 'global' ? globalBoard : friendsBoard;

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader title="Amis & Classements" subtitle="Étape 3/4" icon={Users} connectedAs={agentName} />

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabButton, tab === 'global' && styles.tabButtonActive]}
          onPress={() => setTab('global')}
        >
          <Globe size={14} color={tab === 'global' ? THEME.colors.white : THEME.colors.textSecondary} />
          <Text style={[styles.tabText, tab === 'global' && styles.tabTextActive]}>Global</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, tab === 'friends' && styles.tabButtonActive]}
          onPress={() => setTab('friends')}
        >
          <Users size={14} color={tab === 'friends' ? THEME.colors.white : THEME.colors.textSecondary} />
          <Text style={[styles.tabText, tab === 'friends' && styles.tabTextActive]}>Amis</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={THEME.colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Classement */}
            <ModernCard style={styles.leaderboardCard}>
              {board.length === 0 ? (
                <Text style={styles.emptyText}>
                  {tab === 'global'
                    ? 'Aucun classement pour le moment.'
                    : 'Joue une partie en ligne pour te faire des amis !'}
                </Text>
              ) : (
                board.map((entry, index) => (
                  <View
                    key={entry.uid}
                    style={[styles.leaderboardRow, entry.uid === uid && styles.leaderboardRowSelf]}
                  >
                    <Text style={styles.leaderboardRank}>#{index + 1}</Text>
                    <View style={styles.leaderboardNameCol}>
                      <Text style={styles.leaderboardName} numberOfLines={1}>{entry.agentName}</Text>
                      <Text style={styles.leaderboardSub}>{entry.wins} victoires · {entry.gamesPlayed} parties</Text>
                    </View>
                    <View style={styles.leaderboardEloCol}>
                      <Award size={13} color={THEME.colors.primary} />
                      <Text style={styles.leaderboardElo}>{entry.eloRating}</Text>
                    </View>
                    {entry.winStreak > 1 && (
                      <View style={styles.leaderboardStreakCol}>
                        <Flame size={12} color={THEME.colors.warning} />
                        <Text style={styles.leaderboardStreakText}>{entry.winStreak}</Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </ModernCard>

            {/* Liste d'amis + défi direct */}
            <Text style={styles.sectionTitle}>Défier un ami</Text>
            {friends.length === 0 ? (
              <Text style={styles.emptyText}>
                Tes amis apparaîtront ici automatiquement après une partie en ligne.
              </Text>
            ) : (
              friends.map((friend) => (
                <ModernCard key={friend.uid} style={styles.friendRow}>
                  <View style={styles.leaderboardNameCol}>
                    <Text style={styles.leaderboardName} numberOfLines={1}>{friend.agentName}</Text>
                    <Text style={styles.leaderboardSub}>ELO {friend.eloRating} · {friend.wins} victoires</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.challengeButton}
                    onPress={() => handleChallenge(friend)}
                    disabled={challengingUid === friend.uid}
                  >
                    {challengingUid === friend.uid ? (
                      <ActivityIndicator size="small" color={THEME.colors.white} />
                    ) : (
                      <>
                        <Swords size={13} color={THEME.colors.white} />
                        <Text style={styles.challengeButtonText}>Défier</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </ModernCard>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.bgPrimary,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: THEME.colors.bgTertiary,
  },
  tabButtonActive: {
    backgroundColor: THEME.colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.textSecondary,
  },
  tabTextActive: {
    color: THEME.colors.white,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  leaderboardCard: {
    backgroundColor: THEME.colors.bgTertiary,
    borderRadius: 16,
    padding: 8,
    marginBottom: 24,
    ...THEME.shadow.sm,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borderLight,
    gap: 8,
  },
  leaderboardRowSelf: {
    backgroundColor: 'rgba(0, 242, 255, 0.08)',
    borderRadius: 8,
  },
  leaderboardRank: {
    width: 32,
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textMuted,
  },
  leaderboardNameCol: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  leaderboardSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  leaderboardEloCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  leaderboardElo: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  leaderboardStreakCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 8,
  },
  leaderboardStreakText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.warning,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 10,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.bgTertiary,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  challengeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.secondary,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  challengeButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.white,
  },
  emptyText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
