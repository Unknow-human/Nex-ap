import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Mail, Target } from 'lucide-react-native';
import { ModernButton } from '../components/ModernButton';
import { authService } from '../services/authService';
import { playerService } from '../services/playerService';
import { THEME } from '../theme';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

type AuthMode = 'initial' | 'login' | 'signup';

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('initial');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [remember, setRemember] = useState(true);
  const [googleAvailable, setGoogleAvailable] = useState<boolean>(false);

  // Normalisation simple du nom d'agent (préserve la casse mais retire espaces superflus)
  const normalizeAgentName = (n: string) => n.trim().replace(/\s+/g, ' ').slice(0, 30);

  useEffect(() => {
    try {
      setGoogleAvailable(authService.canUseGoogleSignIn());
    } catch (e) {
      setGoogleAvailable(false);
    }

    // Marquer que l'écran d'authentification a été vu pour ne plus l'afficher systématiquement
    (async () => {
      try {
        await authService.markLoginSeen();
      } catch (e) {
        // ignore errors
      }
    })();
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError('');

      if (!authService.canUseGoogleSignIn()) {
        setError('Connexion Gmail indisponible sur cet appareil. Utilisez la connexion par email.');
        setIsLoading(false);
        return;
      }

      const user = await authService.signInWithGoogle();
      
      if (user) {
        // Normaliser et persister localement le nom d'agent pour l'UX
        const finalName = user.displayName ? normalizeAgentName(user.displayName) : 'Joueur';
        await AsyncStorage.setItem('@nexus_arena_agent_name', finalName);

        // Créer / mettre à jour le profil joueur (inclure agentName pour cohérence)
        try {
          await playerService.createOrUpdatePlayerProfile(user.uid, {
            email: user.email || '',
            displayName: user.displayName || 'Joueur',
            agentName: finalName,
          });
        } catch (profileErr: any) {
          // Le profil peut échouer hors-ligne, mais on peut continuer
          console.warn('[AuthScreen] Création du profil Google échouée (non bloquant):', profileErr.message);
        }
        
        onAuthSuccess();
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      // Messages d'erreurs plus explicites pour l'utilisateur
      if (err.message && err.message.toLowerCase().includes('play services')) {
        setError('Erreur Google Play Services : vérifiez que Google Play Services est à jour.');
      } else if (err.message && err.message.toLowerCase().includes('non disponible')) {
        setError('Connexion Gmail non disponible sur cet appareil. Utilisez la connexion par email.');
      } else if (err.message && err.message.toLowerCase().includes('cancel')) {
        setError('Connexion Google annulée.');
      } else {
        setError(err.message || 'Erreur lors de la connexion Google');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async () => {
    try {
      if (!email.trim() || !password.trim() || !playerName.trim()) {
        setError('Veuillez remplir tous les champs');
        return;
      }

      if (password.length < 6) {
        setError('Le mot de passe doit contenir au moins 6 caractères');
        return;
      }

      setIsLoading(true);
      setError('');

      const user = await authService.createAccountWithEmail(email, password);
      
      if (user) {
        // Normaliser le nom choisi et persister localement comme identité
        const finalName = normalizeAgentName(playerName);
        await AsyncStorage.setItem('@nexus_arena_agent_name', finalName);

        // Créer le profil joueur (inclure agentName)
        try {
          await playerService.createOrUpdatePlayerProfile(user.uid, {
            email: user.email || '',
            displayName: finalName,
            agentName: finalName,
          });
        } catch (profileErr: any) {
          // Le profil peut échouer hors-ligne, mais on peut continuer
          console.warn('[AuthScreen] Création du profil échouée (non bloquant):', profileErr.message);
        }
        
        onAuthSuccess();
      }
    } catch (err: any) {
      console.error('Sign-Up Error:', err);
      if (err && err.code === 'OFFLINE_PENDING_ACCOUNT_SAVED') {
        setError('Compte sauvegardé localement. Il sera créé automatiquement dès que vous serez en ligne. Vous pouvez continuer à utiliser l\'application.');
      } else {
        setError(err.message || 'Erreur lors de la création du compte');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async () => {
    try {
      if (!email.trim() || !password.trim()) {
        setError('Veuillez remplir tous les champs');
        return;
      }

      setIsLoading(true);
      setError('');

      const user = await authService.signInWithEmail(email, password, remember);
      
      if (user) {
        // Récupérer le profil et persister le nom d'agent localement
        try {
          const profile = await playerService.getPlayerProfile(user.uid);
          const finalName = profile?.agentName || profile?.displayName || 'Joueur';
          await AsyncStorage.setItem('@nexus_arena_agent_name', normalizeAgentName(finalName));
        } catch (err) {
          // ne pas casser la connexion si la récupération du profil échoue
          console.warn('[AuthScreen] impossible de récupérer le profil joueur après connexion', err);
        }

        onAuthSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Email ou mot de passe incorrect');
      console.error('Sign-In Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setPlayerName('');
    setError('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[THEME.colors.bgPrimary, THEME.colors.bgSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Initial Screen */}
        {authMode === 'initial' && (
          <View style={styles.content}>
            <View style={styles.header}>
              <Target size={56} color={THEME.colors.primary} style={{ marginBottom: 12 }} />
              <Text style={styles.title}>NEXUS ARENA</Text>
              <Text style={styles.subtitle}>Bienvenue joueur</Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.googleButton, (isLoading || !googleAvailable) && styles.disabledButton]}
                onPress={handleGoogleSignIn}
                disabled={isLoading || !googleAvailable}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Mail size={20} color={THEME.colors.black} />
                    <Text style={styles.buttonText}>{googleAvailable ? 'Connexion avec Gmail' : 'Gmail non disponible'}</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Afficher une aide si Google Sign-In est indisponible */}
              {!googleAvailable && (
                <Text style={styles.googleUnavailableText}>Connexion Gmail non disponible sur cet appareil. Utilisez la connexion par email.</Text>
              )}

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OU</Text>
                <View style={styles.dividerLine} />
              </View>

              <ModernButton
                text="Créer un compte"
                variant="primary"
                size="lg"
                disabled={isLoading}
                style={{ width: '100%' }}
                onPress={() => {
                  resetForm();
                  setAuthMode('signup');
                }}
              />

              <TouchableOpacity
                style={[styles.secondaryButton, isLoading && styles.disabledButton]}
                onPress={() => {
                  resetForm();
                  setAuthMode('login');
                }}
                disabled={isLoading}
              >
                <Text style={styles.secondaryButtonText}>Se connecter</Text>
              </TouchableOpacity>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          </View>
        )}

        {/* Sign Up Screen */}
        {authMode === 'signup' && (
          <View style={styles.content}>
            <TouchableOpacity
              onPress={() => {
                setAuthMode('initial');
                resetForm();
              }}
              style={[styles.backButton, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
            >
              <ArrowLeft size={16} color={THEME.colors.primary} />
              <Text style={styles.backButtonText}>Retour</Text>
            </TouchableOpacity>

            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Créer un compte</Text>
            </View>

            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Nom du joueur"
                placeholderTextColor={THEME.colors.gray400}
                value={playerName}
                onChangeText={setPlayerName}
                editable={!isLoading}
              />

              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={THEME.colors.gray400}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />

              <TextInput
                style={styles.input}
                placeholder="Mot de passe (min. 6 caractères)"
                placeholderTextColor={THEME.colors.gray400}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isLoading}
              />

              {error && <Text style={styles.errorText}>{error}</Text>}

              <ModernButton
                text="Créer le compte"
                variant="primary"
                size="lg"
                disabled={isLoading}
                style={{ ...styles.submitButton, width: '100%' }}
                onPress={handleEmailSignUp}
              />
              {isLoading && <ActivityIndicator color={THEME.colors.primary} style={{ marginTop: 8 }} />}
            </View>
          </View>
        )}

        {/* Sign In Screen */}
        {authMode === 'login' && (
          <View style={styles.content}>
            <TouchableOpacity
              onPress={() => {
                setAuthMode('initial');
                resetForm();
              }}
              style={[styles.backButton, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
            >
              <ArrowLeft size={16} color={THEME.colors.primary} />
              <Text style={styles.backButtonText}>Retour</Text>
            </TouchableOpacity>

            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Se connecter</Text>
            </View>

            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={THEME.colors.gray400}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />

              <TextInput
                style={styles.input}
                placeholder="Mot de passe"
                placeholderTextColor={THEME.colors.gray400}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isLoading}
              />

              {error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}
                onPress={() => setRemember(!remember)}
              >
                <View style={[styles.checkbox, remember && styles.checkboxChecked]}>
                  {remember && <Check size={14} color="#fff" strokeWidth={3} />}
                </View>
                <Text style={{ color: THEME.colors.primary }}>Se souvenir de moi</Text>
              </TouchableOpacity>

              <ModernButton
                text="Se connecter"
                variant="primary"
                size="lg"
                disabled={isLoading}
                style={{ ...styles.submitButton, width: '100%' }}
                onPress={handleEmailSignIn}
              />
              {isLoading && <ActivityIndicator color={THEME.colors.primary} style={{ marginTop: 8 }} />}

              <TouchableOpacity
                style={{ marginTop: 12, alignItems: 'center' }}
                onPress={async () => {
                  // Mot de passe oublié
                  if (!email || !email.trim()) {
                    Alert.alert('Mot de passe oublié', 'Veuillez entrer votre email pour recevoir le lien de réinitialisation.');
                    return;
                  }
                  try {
                    setIsLoading(true);
                    setError('');
                    await authService.requestPasswordReset(email.trim());
                    Alert.alert('✔️ Email envoyé', 'Si ce compte existe, un email de réinitialisation a été envoyé (ou la demande a été sauvegardée hors‑ligne).');
                  } catch (err: any) {
                    console.error('Reset password error:', err);
                    if (err && err.code === 'OFFLINE_PENDING_RESET_SAVED') {
                      Alert.alert('📥 Sauvegardé', 'Votre demande de réinitialisation a été sauvegardée et sera envoyée lorsque vous serez en ligne.');
                    } else {
                      Alert.alert('Erreur', err.message || 'Impossible d\'envoyer le mail maintenant.');
                    }
                  } finally {
                    setIsLoading(false);
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.secondaryButtonText, { fontSize: 14 }]}>Mot de passe oublié ?</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgPrimary,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  emoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginBottom: 4,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    color: THEME.colors.primary,
    fontWeight: '600',
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    color: THEME.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  formHeader: {
    marginBottom: 30,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: THEME.colors.primary,
  },
  buttonContainer: {
    gap: 12,
  },
  form: {
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.gray800,
  },
  checkboxChecked: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  checkboxMark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  input: {
    backgroundColor: THEME.colors.gray800,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: THEME.colors.white,
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: THEME.colors.white,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  googleIcon: {
    fontSize: 20,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: THEME.colors.black,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: THEME.colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    color: THEME.colors.gray400,
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    color: '#ff2e63',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  googleUnavailableText: {
    color: THEME.colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
    fontSize: 12,
  },
});
