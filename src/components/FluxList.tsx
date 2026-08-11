import React, { useRef, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { GameAttempt } from '../types';

interface FluxListProps {
  attempts: GameAttempt[];
  inverted?: boolean;
  title?: string;
}

export function FluxList({ attempts, inverted = false, title = 'HISTORIQUE' }: FluxListProps) {
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll vers la dernière tentative
  useEffect(() => {
    if (attempts.length > 0 && flatListRef.current) {
      // Utiliser setTimeout pour s'assurer que la liste est rendue
      setTimeout(() => {
        // Toujours scroller vers le END pour voir la dernière tentative
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [attempts.length]);
  const renderAttempt = ({ item, index }: { item: GameAttempt; index: number }) => {
    return (
      <View style={styles.attemptContainer}>
        <View style={styles.attemptHeader}>
          <Text style={styles.attemptNumber}>#{index + 1}</Text>
          <Text style={styles.attemptCode}>{item.code}</Text>
        </View>
        <View style={styles.scoreContainer}>
          <View style={[styles.scoreBadge, styles.bpBadge]}>
            <Text style={styles.scoreText}>{item.bp} BP</Text>
          </View>
          <View style={[styles.scoreBadge, styles.mpBadge]}>
            <Text style={styles.scoreText}>{item.mp} MP</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {attempts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aucune tentative</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={attempts}
          renderItem={renderAttempt}
          keyExtractor={(item, index) => `attempt-${index}-${item.timestamp}`}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
          showsVerticalScrollIndicator={false}
          inverted={inverted}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6366f1',
    letterSpacing: 1,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  listContent: {
    paddingBottom: 6,
  },
  attemptContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#c4b5fd',
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 4,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  attemptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  attemptNumber: {
    fontSize: 11,
    color: '#818cf8',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  attemptCode: {
    fontSize: 16,
    fontWeight: '900',
    color: '#6366f1',
    letterSpacing: 3,
    fontFamily: 'monospace',
  },
  scoreContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  bpBadge: {
    backgroundColor: '#f0f4ff',
    borderWidth: 1.5,
    borderColor: '#818cf8',
  },
  mpBadge: {
    backgroundColor: '#f0f4ff',
    borderWidth: 1.5,
    borderColor: '#818cf8',
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6366f1',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#cbd5e1',
    fontWeight: '600',
  },
});
