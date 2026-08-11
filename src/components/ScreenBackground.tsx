import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useBackground } from '../hooks/useBackground';
import { THEME } from '../theme';

interface ScreenBackgroundProps {
  children: React.ReactNode;
  /** Opacité du voile sombre posé sur une photo pour garder le texte lisible. */
  overlayOpacity?: number;
}

/**
 * Enveloppe un écran et affiche, selon le choix de l'utilisateur :
 *  - une photo (avec un léger voile sombre pour garder l'UI lisible),
 *  - une couleur unie,
 *  - ou, par défaut, le dégradé cyberpunk habituel de l'app.
 *
 * Important : la racine reste TOUJOURS une simple `View` — seul le calque
 * de fond (en position absolue, derrière `children`) change de nature.
 * Ça évite que React démonte/remonte tout l'écran (et son état, ses
 * animations en cours, etc.) quand l'utilisateur change de type de fond
 * (photo <-> couleur <-> défaut), ce qu'un changement du composant racine
 * (LinearGradient vs ImageBackground vs View) provoquerait sinon.
 */
export function ScreenBackground({ children, overlayOpacity = 0.55 }: ScreenBackgroundProps) {
  const { background } = useBackground();

  return (
    <View style={styles.fill}>
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {background.type === 'photo' ? (
          <>
            <Image source={{ uri: background.uri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            <View
              style={[
                StyleSheet.absoluteFillObject,
                { backgroundColor: `rgba(5, 5, 12, ${overlayOpacity})` },
              ]}
            />
          </>
        ) : background.type === 'color' ? (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: background.value }]} />
        ) : (
          <LinearGradient
            colors={[THEME.colors.bgPrimary, THEME.colors.bgSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
