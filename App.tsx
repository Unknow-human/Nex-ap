import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, NavigationIndependentTree } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { BarChart3, Gamepad2, Globe, Home as HomeIcon, HelpCircle, MessageCircle, Target, Users } from 'lucide-react-native';

// Imports Services & Screens
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { AuthScreen } from './src/screens/AuthScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { FriendsScreen } from './src/screens/FriendsScreen';
import { GameScreen } from './src/screens/GameScreen';
import { HelpScreen } from './src/screens/HelpScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { RecordsScreen } from './src/screens/RecordsScreen';
import WebAppScreen from './src/screens/WebAppScreen';
import { authService } from './src/services/authService';
import { BackgroundProvider } from './src/hooks/useBackground';
import { THEME } from './src/theme';
import { FONT_ASSETS, FONT_FAMILY } from './src/theme/fonts';

const Tab = createBottomTabNavigator();

export default function App() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasSeenLogin, setHasSeenLogin] = useState<boolean | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);

  useEffect(() => {
    if (fontError) {
      // On ne bloque jamais l'app si les polices échouent à charger (ex.
      // pas de réseau au tout premier lancement, cache non prêt) — RN
      // retombe silencieusement sur la police système, dégradation
      // gracieuse plutôt qu'un écran bloqué indéfiniment.
      console.warn('⚠️ Erreur chargement polices custom, repli sur police système:', fontError);
    }
  }, [fontError]);

  useEffect(() => {
    const initApp = async () => {
      try {
        // 1. Initialise Firebase et récupère l'utilisateur (online ou offline cache)
        const user = await authService.initializeAuth();
        
        // 2. Vérifie si le Login a déjà été complété par le passé
        const seen = await authService.hasSeenLogin();
        setHasSeenLogin(seen);

        // 3. On est "connecté" si on a un user réel OU un cache permanent valide
        const cached = await authService.getCachedAuth();
        const loggedIn = Boolean((user && !user.isAnonymous) || (seen && cached && !cached.isAnonymous));
        
        setIsAuthenticated(loggedIn);
      } catch (e) {
        console.error('Erreur init app:', e);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    initApp();
  }, []);

  // Écoute les changements de session Supabase pour réagir à une
  // déconnexion déclenchée depuis n'importe quel écran (HomeScreen, etc.).
  // Avant ce correctif, authService.logout() vidait bien la session et le
  // cache local, mais rien ne prévenait App.tsx : isAuthenticated restait
  // `true` et l'utilisateur restait coincé dans l'app au lieu d'être
  // renvoyé automatiquement vers AuthScreen.
  //
  // On ignore volontairement les évènements reçus avant la fin de la
  // vérification initiale (isCheckingAuth) : Supabase émet un premier
  // évènement dès l'abonnement avec la session courante (souvent l'auth
  // anonyme de démarrage), ce qui écraserait à tort un utilisateur déjà
  // reconnu via le cache local si on réagissait trop tôt.
  const isCheckingAuthRef = useRef(isCheckingAuth);
  isCheckingAuthRef.current = isCheckingAuth;

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      if (isCheckingAuthRef.current) return;
      if (!user || user.isAnonymous) {
        setIsAuthenticated(false);
        setHasSeenLogin(false);
      }
    });
    return unsubscribe;
  }, []);

  // Animation de sortie du Splash
  useEffect(() => {
    const fontsReady = fontsLoaded || Boolean(fontError);
    if (!isCheckingAuth && fontsReady) {
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }).start(() => setShowSplash(false));
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isCheckingAuth, fontsLoaded, fontError]);

  if (showSplash || isCheckingAuth || (!fontsLoaded && !fontError)) {
    return (
      <SafeAreaProvider>
        <View style={styles.splashContainer}>
          <Animated.View style={{ opacity: fadeAnim }}>
             <View style={styles.splashIconWrap}>
               <Target color={THEME.colors.primary} size={72} strokeWidth={1.75} />
             </View>
             <Text style={styles.splashTitle}>NEXUS ARENA</Text>
          </Animated.View>
        </View>
      </SafeAreaProvider>
    );
  }

  // LOGIQUE DE ROUTAGE
  // Si non connecté ET que l'utilisateur n'a jamais validé le login
  if (!isAuthenticated && !hasSeenLogin) {
    return (
      <SafeAreaProvider>
        <ErrorBoundary>
          <AuthScreen onAuthSuccess={async () => {
            // Actions vitales après succès du login
            await authService.markLoginSeen();
            setHasSeenLogin(true);
            setIsAuthenticated(true);
          }} />
        </ErrorBoundary>
      </SafeAreaProvider>
    );
  }

  // SINON : Affichage de l'application normale
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <BackgroundProvider>
        <NavigationIndependentTree>
        <NavigationContainer>
          <StatusBar style="light" />
          <Tab.Navigator
            screenOptions={{
              headerShown: false,
              tabBarStyle: styles.tabBar,
              tabBarActiveTintColor: THEME.colors.primary,
            }}
          >
            <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Accueil', tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} /> }} />
            <Tab.Screen name="Game" component={GameScreen} options={{ tabBarLabel: 'Jeu', tabBarIcon: ({ color, size }) => <Gamepad2 color={color} size={size} /> }} />
            <Tab.Screen name="Chat" component={ChatScreen} options={{ tabBarLabel: 'Chat', tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} /> }} />
            <Tab.Screen name="Records" component={RecordsScreen} options={{ tabBarLabel: 'Records', tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} /> }} />
            <Tab.Screen name="Friends" component={FriendsScreen} options={{ tabBarLabel: 'Amis', tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }} />
            <Tab.Screen name="Help" component={HelpScreen} options={{ tabBarLabel: 'Aide', tabBarIcon: ({ color, size }) => <HelpCircle color={color} size={size} /> }} />
            <Tab.Screen name="WebApp" component={WebAppScreen} options={{ tabBarLabel: 'Web', tabBarIcon: ({ color, size }) => <Globe color={color} size={size} /> }} />
          </Tab.Navigator>
        </NavigationContainer>
        </NavigationIndependentTree>
        </BackgroundProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: { flex: 1, backgroundColor: '#0f0f1e', justifyContent: 'center', alignItems: 'center' },
  splashIconWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  splashTitle: { color: 'white', fontSize: 24, fontFamily: FONT_FAMILY.orbitronBold, marginTop: 20 },
  tabBar: { backgroundColor: '#0f0f1e', borderTopColor: '#2d3748', height: 60 }
});