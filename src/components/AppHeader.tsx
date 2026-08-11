import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { THEME } from '../theme';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  /**
   * Emoji (string, legacy) ou composant icône lucide-react-native.
   * Les deux formes restent supportées : aucun appel existant n'est cassé.
   */
  icon?: string | LucideIcon;
  connectedAs?: string;
  /** Icône d'action optionnelle à droite (ex: sélecteur d'arrière-plan). */
  actionIcon?: LucideIcon;
  onPressAction?: () => void;
}

export function AppHeader({ title, subtitle, icon = '🎯', connectedAs, actionIcon, onPressAction }: AppHeaderProps) {
  const IconComponent = typeof icon !== 'string' ? icon : null;
  const ActionIcon = actionIcon;

  return (
    <LinearGradient
      colors={[THEME.colors.bgSecondary, THEME.colors.bgTertiary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <View style={styles.headerContent}>
        {IconComponent ? (
          <IconComponent size={24} color={THEME.colors.primary} strokeWidth={2.25} />
        ) : (
          <Text style={styles.icon}>{icon as string}</Text>
        )}
        <View style={styles.headerText}>
          <Text
            style={[styles.title, { color: THEME.colors.textPrimary }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[styles.subtitle, { color: THEME.colors.textSecondary }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {subtitle}
            </Text>
          )}
        </View>
        {connectedAs ? (
          <View style={styles.connectedBadge}>
            <Text style={styles.connectedText} numberOfLines={1} ellipsizeMode="tail">
              Connecté: {connectedAs}
            </Text>
          </View>
        ) : null}
        {ActionIcon && onPressAction ? (
          <TouchableOpacity style={styles.actionButton} onPress={onPressAction} hitSlop={8}>
            <ActionIcon size={20} color={THEME.colors.primary} strokeWidth={2.25} />
          </TouchableOpacity>
        ) : null}
      </View>
    </LinearGradient>
  );
} 

const styles = StyleSheet.create({
  header: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(6, 182, 212, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  connectedBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.06)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.12)',
    flexShrink: 1,
    maxWidth: 160,
  },
  connectedText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 242, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
