import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Sur le web (game-web.html mis à part — ceci concerne l'app Expo elle-même
// via `expo start --web`) et sur certains simulateurs, il n'y a pas de
// moteur haptique : on avale l'erreur plutôt que de la remonter, pour ne
// jamais faire planter une interaction utilisateur à cause d'un simple
// retour tactile manquant.
function safeHaptic(fn: () => Promise<void>) {
  if (Platform.OS === 'web') return;
  fn().catch(() => {
    // Pas de moteur haptique disponible sur cet appareil — ignoré.
  });
}

export const haptics = {
  /** Retour léger : tap sur un bouton secondaire, sélection d'une option. */
  light: () => safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),

  /** Retour moyen : action principale (valider, envoyer, confirmer). */
  medium: () => safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),

  /** Retour fort : action destructive ou décisive (quitter une arène, abandon). */
  heavy: () => safeHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),

  /** Confirmation positive : victoire, tentative correcte, action réussie. */
  success: () => safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),

  /** Confirmation négative : erreur, tentative incorrecte, action refusée. */
  error: () => safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),

  /** Avertissement : action à risque, confirmation requise. */
  warning: () => safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),

  /** Sélection légère et rapide : changement d'onglet, défilement d'une liste d'options. */
  selection: () => safeHaptic(() => Haptics.selectionAsync()),
};
