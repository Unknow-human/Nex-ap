import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { THEME } from '../theme';

/**
 * Écran WebView pour intégrer l'app web dans l'APK
 * Permet aux joueurs APK d'accéder à la version web complète
 */

const WebAppScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const webViewRef = React.useRef(null);

  // URL de l'app web (à adapter selon votre déploiement)
  // Options possibles:
  // - http://localhost:5173 (développement local)
  // - https://nexus-arena-web.vercel.app (production)
  // - https://nexus-arena.onrender.com (render)
  const WEB_APP_URL = 'https://nexus-arena-118r.onrender.com';
  const ARENA_STATE_KEY = '@nexus_arena_state';

  const [webUrl, setWebUrl] = useState(WEB_APP_URL);

  useEffect(() => {
    const readArena = async () => {
      try {
        const raw = await AsyncStorage.getItem(ARENA_STATE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.arenaId) {
            setWebUrl(`${WEB_APP_URL}?arena=${encodeURIComponent(parsed.arenaId)}`);
          }
        }
      } catch (err) {
        // Pas critique
        console.warn('Erreur lecture état arène pour WebView:', err);
      }
    };
    readArena();
  }, []);

  const handleLoadStart = () => {
    setIsLoading(true);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('Erreur WebView:', nativeEvent);
    Alert.alert(
      'Erreur de connexion',
      'Impossible de charger l\'application. Vérifiez votre connexion Internet.',
      [
        { text: 'Réessayer', onPress: () => setIsLoading(true) },
        { text: 'Annuler', onPress: () => {} }
      ]
    );
  };

  const handleNavigationStateChange = (newNavState: any) => {
    setCanGoBack(newNavState.canGoBack);
  };

  const injectedJavaScript = `
    // Injecter des variables de contexte pour que le web app sache qu'il s'exécute dans l'APK
    window.isRunningInAPK = true;
    window.platform = 'mobile-webview';
    window.appVersion = '${Constants.expoConfig?.version || '1.0.0'}';
    
    // Améliorer l'expérience tactile
    document.addEventListener('touchstart', function() {}, false);
    
    // Logs console redirection
    console.log('Application web chargée dans l\'APK');
  `;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
          </View>
        )}
        
        <WebView
          ref={webViewRef}
          source={{ uri: webUrl }}
          style={styles.webView}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          onNavigationStateChange={handleNavigationStateChange}
          injectedJavaScript={injectedJavaScript}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={THEME.colors.primary} />
            </View>
          )}
          scalesPageToFit={true}
          bounces={true}
          scrollEnabled={true}
          // Permet les requêtes HTTP/HTTPS
          mixedContentMode="always"
          // Options de sécurité
          allowsInlineMediaPlayback={true}
          allowsFullscreenVideo={true}
          mediaPlaybackRequiresUserAction={false}
          // User agent pour identifier l'APK
          userAgent={`NEXUS_ARENA_APK/1.0 (Android) ${Constants.expoConfig?.name || 'NEXUS_ARENA'}`}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgPrimary,
  },
  webView: {
    flex: 1,
    backgroundColor: THEME.colors.bgPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.colors.bgPrimary,
  },
});

export default WebAppScreen;
