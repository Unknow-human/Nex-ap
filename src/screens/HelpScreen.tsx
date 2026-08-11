import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, useWindowDimensions, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { THEME } from '../theme';
import { AppHeader } from '../components/AppHeader';
import { ModernCard } from '../components/ModernCard';
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Dices,
  Gamepad2,
  Lightbulb,
  LucideIcon,
  Target,
  Trophy,
  Zap,
} from 'lucide-react-native';

export function HelpScreen() {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 375;
  const isPhone = width < 600;
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    basiques: true,
    scoring: true,
    modes: false,
    niveaux: false,
    astuces: false,
    strategies: false,
    records: false,
  });

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

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
  }, [fadeAnim, slideAnim]);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const Section = ({ title, icon: Icon, sectionKey, children }: { title: string; icon: LucideIcon; sectionKey: string; children: React.ReactNode }) => {
    const isExpanded = expandedSections[sectionKey];
    const ExpandIcon = isExpanded ? ChevronDown : ChevronRight;
    return (
      <ModernCard style={styles.section}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection(sectionKey)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionTitleRow}>
            <Icon size={18} color={THEME.colors.primary} />
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
          <ExpandIcon size={18} color={THEME.colors.textSecondary} />
        </TouchableOpacity>
        {isExpanded && <View style={styles.sectionContent}>{children}</View>}
      </ModernCard>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Guide Complet" subtitle="Maîtrisez le jeu" icon={BookOpen} />
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        style={[
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >

        {/* SECTION: LES BASES */}
        <Section title="Les Bases du Jeu" icon={Gamepad2} sectionKey="basiques">
          <Text style={styles.bodyText}>
            <Text style={styles.boldText}>Code Master</Text> est un jeu de déduction logique basé sur le concept du Mastermind. Votre objectif est simple : découvrir un code secret composé de <Text style={styles.highlightText}>4 chiffres (0-9)</Text>.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>
            À chaque tentative, le jeu vous donne des indices : le nombre de chiffres bien placés (BP) et mal placés (MP). Utilisez ces informations pour affiner votre stratégie et trouver le code!
          </Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>💡 Points importants</Text>
            <Text style={styles.infoBoxText}>• Les chiffres peuvent se répéter (0000, 1111, etc.){'\n'}• L'ordre est crucial (1234 ≠ 4321){'\n'}• Vous pouvez faire un nombre illimité de tentatives</Text>
          </View>
        </Section>

        {/* SECTION: SYSTÈME DE SCORING */}
        <Section title="Système de Scoring" icon={BarChart3} sectionKey="scoring">
          <View style={styles.scoreBox}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreIcon}>🎯</Text>
              <View style={styles.scoreContent}>
                <Text style={styles.scoreLabel}>BP (Bien Placés)</Text>
                <Text style={styles.scoreDesc}>Chiffre correct à la bonne position</Text>
                <Text style={styles.scoreExample}>Exemple: Code=1234, Tentative=1567 → 1BP (le "1")</Text>
              </View>
            </View>
          </View>

          <View style={styles.scoreBox}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreIcon}>🔄</Text>
              <View style={styles.scoreContent}>
                <Text style={styles.scoreLabel}>MP (Mal Placés)</Text>
                <Text style={styles.scoreDesc}>Chiffre correct mais mauvaise position</Text>
                <Text style={styles.scoreExample}>Exemple: Code=1234, Tentative=4321 → 0BP, 4MP (tous mal placés)</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>⚠️ Cas particuliers</Text>
            <Text style={styles.infoBoxText}>• Si vous proposez 0000 et le code contient deux 0 : les deux premiers 0 comptent comme BP/MP{'\n'}• Les doublons sont traités correctement{'\n'}• 4BP = Victoire!</Text>
          </View>
        </Section>

        {/* SECTION: MODES DE JEU */}
        <Section title="Modes de Jeu" icon={Target} sectionKey="modes">
          
          <View style={styles.modeCard}>
            <Text style={styles.modeTitle}>🌱 MODE SOLO</Text>
            <Text style={styles.modeDesc}>Jouez seul contre vous-même</Text>
            <View style={styles.modeFeatures}>
              <Text style={styles.featureItem}>✓ Jouez à votre rythme</Text>
              <Text style={styles.featureItem}>✓ 4 niveaux de difficulté</Text>
              <Text style={styles.featureItem}>✓ Records sauvegardés automatiquement</Text>
              <Text style={styles.featureItem}>✓ Défi personnel sans pression</Text>
            </View>
            <View style={styles.tipsBox}>
              <Text style={styles.tipsTitle}>💡 Astuces SOLO</Text>
              <Text style={styles.tipsText}>• Commencez par des codes variés pour obtenir le maximum d'informations{'\n'}• Testez d'abord 1234, 5678, 9012 pour couvrir tous les chiffres{'\n'}• Notez mentalement les chiffres "impossibles"{'\n'}• Une fois que vous avez les bonnes positions, cherchez les chiffres manquants</Text>
            </View>
          </View>

          <View style={styles.modeCard}>
            <Text style={styles.modeTitle}>👥 MODE DUO LOCAL</Text>
            <Text style={styles.modeDesc}>2 joueurs, 1 appareil, même code</Text>
            <View style={styles.modeFeatures}>
              <Text style={styles.featureItem}>✓ Défi amical</Text>
              <Text style={styles.featureItem}>✓ Compétition directe</Text>
              <Text style={styles.featureItem}>✓ Chacun voit ses tentatives</Text>
              <Text style={styles.featureItem}>✓ Échange l'appareil à tour de rôle</Text>
            </View>
            <View style={styles.tipsBox}>
              <Text style={styles.tipsTitle}>💡 Astuces DUO LOCAL</Text>
              <Text style={styles.tipsText}>• Mémorisez les tentatives de l'adversaire pour adapter votre stratégie{'\n'}• Ne laissez pas voir votre écran à l'adversaire!{'\n'}• Utilisez ses indices : si 5 est mal placé chez vous deux, c'est utile{'\n'}• Rappelez-vous que vous aviez un BP là où l'adversaire en a 0{'\n'}• Gagnez sur le nombre de tentatives, pas sur la vitesse</Text>
            </View>
          </View>

          <View style={styles.modeCard}>
            <Text style={styles.modeTitle}>🌐 MODE EN LIGNE</Text>
            <Text style={styles.modeDesc}>Affrontez des joueurs du monde entier</Text>
            <View style={styles.modeFeatures}>
              <Text style={styles.featureItem}>✓ Créez ou rejoignez une salle</Text>
              <Text style={styles.featureItem}>✓ Chat intégré</Text>
              <Text style={styles.featureItem}>✓ Voir les tentatives de l'adversaire</Text>
              <Text style={styles.featureItem}>✓ Classement mondial</Text>
            </View>
            <View style={styles.tipsBox}>
              <Text style={styles.tipsTitle}>💡 Astuces EN LIGNE</Text>
              <Text style={styles.tipsText}>• Observez votre adversaire : s'il a 3BP rapidement, le code contient sûrement ces chiffres{'\n'}• Copiez partiellement les stratégies gagnantes{'\n'}• Utilisez le chat pour déstabiliser ou encourager{'\n'}• Notez les codes que vous ne comprenez pas pour apprendre{'\n'}• Plus vous jouez, plus vite vous devenez expert</Text>
            </View>
          </View>
        </Section>

        {/* SECTION: NIVEAUX DE DIFFICULTÉ */}
        <Section title="Niveaux de Difficulté" icon={Zap} sectionKey="niveaux">
          
          <View style={styles.difficultyCard}>
            <Text style={styles.difficultyTitle}>🌱 DÉBUTANT (Ultra Facile)</Text>
            <View style={styles.difficultyContent}>
              <Text style={styles.difficultyFeature}>
                <Text style={styles.boldText}>Mécanique spéciale:</Text> Les chiffres corrects à la bonne place se verrouillent automatiquement!
              </Text>
              <Text style={[styles.difficultyFeature, { marginTop: 6 }]}>
                <Text style={styles.boldText}>Comment ça marche:</Text> Après chaque tentative, les positions correctes sont maintenues. Vous ne saisissez que les chiffres manquants.
              </Text>
              <View style={styles.exampleBox}>
                <Text style={styles.exampleTitle}>Exemple progressif DÉBUTANT:</Text>
                <Text style={styles.exampleLine}>1. Vous proposez: 1234 → Résultat: 2BP à positions 0,1{'\n'}   → Les "1" et "2" sont verrouillés</Text>
                <Text style={styles.exampleLine}>2. Vous proposez: __ (2 chiffres pour positions 2,3){'\n'}   → Code construit: 12XY</Text>
                <Text style={styles.exampleLine}>3. Vous gagnez rapidement!</Text>
              </View>
              <View style={styles.tipsBox}>
                <Text style={styles.tipsTitle}>💡 Stratégie DÉBUTANT</Text>
                <Text style={styles.tipsText}>• Commencez large : essayez 1234, 5678, etc.{'\n'}• Laissez le système verrouiller les bonnes positions{'\n'}• Concentrez-vous sur trouver les chiffres manquants{'\n'}• Impossible de perdre, juste une question de temps{'\n'}• Parfait pour comprendre les mécaniques!</Text>
              </View>
            </View>
          </View>

          <View style={styles.difficultyCard}>
            <Text style={styles.difficultyTitle}>⚔️ NORMAL (Équilibré)</Text>
            <View style={styles.difficultyContent}>
              <Text style={styles.difficultyFeature}>
                <Text style={styles.boldText}>Mode classique Mastermind complet</Text>
              </Text>
              <Text style={[styles.difficultyFeature, { marginTop: 6 }]}>Vous recevez les indices BP et MP pour chaque tentative. À vous de déduire le code!
              </Text>
              <View style={styles.tipsBox}>
                <Text style={styles.tipsTitle}>💡 Stratégie NORMAL</Text>
                <Text style={styles.tipsText}>• Testez d'abord 1234, puis diversifiez{'\n'}• Avec 2BP et 1MP: identifiez quels chiffres sont bons{'\n'}• Si vous obtenez 4MP: vous avez les bons chiffres mais dans le désordre{'\n'}• Une fois que vous connaissez les 4 chiffres, testez les 24 permutations{'\n'}• Typiquement gagnable en 5-10 tentatives</Text>
              </View>
            </View>
          </View>

          <View style={styles.difficultyCard}>
            <Text style={styles.difficultyTitle}>🧠 EXPERT (Difficile)</Text>
            <View style={styles.difficultyContent}>
              <Text style={styles.difficultyFeature}>
                Même que NORMAL mais avec un code plus imprévisible. Vous avez vraiment besoin de logique!
              </Text>
              <View style={styles.tipsBox}>
                <Text style={styles.tipsTitle}>💡 Stratégie EXPERT</Text>
                <Text style={styles.tipsText}>• Utilisez la théorie de l'information: choisissez vos codes pour minimiser les possibilités{'\n'}• Documentez chaque tentative sur papier{'\n'}• Cherchez les contradictions entre les indices{'\n'}• Soyez patient, ce n'est pas une course{'\n'}• 10-15 tentatives est normal</Text>
              </View>
            </View>
          </View>

          <View style={styles.difficultyCard}>
            <Text style={styles.difficultyTitle}>💀 IMPOSSIBLE (Ultime Défi)</Text>
            <View style={styles.difficultyContent}>
              <Text style={styles.difficultyFeature}>
                <Text style={styles.boldText}>⚠️ Aucun indice jusqu'à la victoire!</Text>
              </Text>
              <Text style={[styles.difficultyFeature, { marginTop: 6 }]}>Vous devez trouver 4 chiffres sans aucune indication. Vous ne saurez que vous avez gagné quand vous trouvez le bon code.
              </Text>
              <View style={styles.tipsBox}>
                <Text style={styles.tipsTitle}>💡 Stratégie IMPOSSIBLE</Text>
                <Text style={styles.tipsText}>• C'est essentiellement du chance avec de la stratégie{'\n'}• Commencez par couvrir tous les chiffres: 0123, 4567, 8900{'\n'}• Ensuite, testez des combinaisons variées{'\n'}• Notez vos tentatives précédentes{'\n'}• Vous avez statistiquement 1 chance sur 5040 à chaque tentative{'\n'}• Pour les vrais défis seulement!</Text>
              </View>
            </View>
          </View>
        </Section>

        {/* SECTION: STRATÉGIES AVANCÉES */}
        <Section title="Stratégies Avancées" icon={Dices} sectionKey="strategies">
          
          <View style={styles.strategyBox}>
            <Text style={styles.strategyTitle}>📋 Stratégie des 5 Tentatives</Text>
            <Text style={styles.strategyText}>
              1. Tentative 1: <Text style={styles.boldText}>1234</Text> - Découvrir les chiffres présents{'\n'}
              2. Tentative 2: <Text style={styles.boldText}>5678</Text> - Tester d'autres chiffres{'\n'}
              3. Tentative 3: <Text style={styles.boldText}>9000</Text> - Tester le 9{'\n'}
              4-5: Basé sur les résultats précédents
            </Text>
          </View>

          <View style={styles.strategyBox}>
            <Text style={styles.strategyTitle}>🧩 Stratégie de Déduction Logique</Text>
            <Text style={styles.strategyText}>
              Si vous obtenez <Text style={styles.boldText}>2BP + 1MP</Text> avec 1234:{'\n'}
              • 2 chiffres sont bien placés{'\n'}
              • 1 chiffre existe mais mal placé{'\n'}
              • Testez des variantes du code{'\n'}
              • Éliminez les chiffres qui ne donnent pas d'indice
            </Text>
          </View>

          <View style={styles.strategyBox}>
            <Text style={styles.strategyTitle}>🎯 Stratégie 4MP (Cas particulier)</Text>
            <Text style={styles.strategyText}>
              Si vous obtenez <Text style={styles.boldText}>4MP</Text>, vous avez les 4 bons chiffres!{'\n'}
              • Il existe 24 permutations possibles (4!){'\n'}
              • Testez une permutation, puis une autre{'\n'}
              • Vous allez gagner très bientôt{'\n'}
              • C'est le meilleur indice possible sauf la victoire!
            </Text>
          </View>

          <View style={styles.strategyBox}>
            <Text style={styles.strategyTitle}>❌ Stratégie 0BP + 0MP</Text>
            <Text style={styles.strategyText}>
              C'est d'or! Vous savez exactement 4 chiffres qui ne sont <Text style={styles.boldText}>PAS</Text> dans le code.{'\n'}
              • Éliminez complètement ces chiffres{'\n'}
              • Vos prochaines tentatives utilisent les 6 chiffres restants{'\n'}
              • Continuez à éliminer{'\n'}
              • Vous convergerez vers la solution
            </Text>
          </View>
        </Section>

        {/* SECTION: ASTUCES GÉNÉRALES */}
        <Section title="Astuces & Conseils" icon={Lightbulb} sectionKey="astuces">
          
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>🧠 Trucs Mentaux</Text>
            <Text style={styles.tipContent}>
              • Restez calme et logique, pas d'émotions{'\n'}
              • Divisez le problème en parties{'\n'}
              • Cherchez les contradictions{'\n'}
              • Si quelque chose ne s'ajoute pas, vous avez une erreur{'\n'}
              • Prendre une pause aide souvent
            </Text>
          </View>

          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>⚡ Astuce Rapide</Text>
            <Text style={styles.tipContent}>
              • 1ère tentative toujours <Text style={styles.boldText}>1234</Text> ou <Text style={styles.boldText}>0123</Text>{'\n'}
              • Ça donne énormément d'informations{'\n'}
              • Vous savez immédiatement combien de chiffres du code sont dans les 4 premiers
            </Text>
          </View>

          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>📊 Comprendre les Mathématiques</Text>
            <Text style={styles.tipContent}>
              • Il y a 10,000 codes possibles (0000-9999){'\n'}
              • Il y a 210 combinaisons possibles pour BP+MP{'\n'}
              • Chaque tentative vous rapproche exponentiellement{'\n'}
              • Vous ne devriez pas avoir besoin de plus de 10 tentatives
            </Text>
          </View>

          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>🎮 Jouer plus et Progresser</Text>
            <Text style={styles.tipContent}>
              • La pratique rend parfait{'\n'}
              • Chaque jeu vous enseigne quelque chose{'\n'}
              • Essayez les différents niveaux{'\n'}
              • Défiez vos amis en ligne{'\n'}
              • Améliorez votre record personnel
            </Text>
          </View>
        </Section>

        {/* SECTION: RECORDS */}
        <Section title="Système de Records" icon={Trophy} sectionKey="records">
          <Text style={styles.bodyText}>
            Vos records en mode <Text style={styles.boldText}>SOLO</Text> sont sauvegardés automatiquement et consultables dans l'onglet "Records".
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>📈 Ce qui est traqué</Text>
            <Text style={styles.infoBoxText}>
              • <Text style={styles.boldText}>Nombre de tentatives:</Text> Plus c'est bas, mieux c'est!{'\n'}
              • <Text style={styles.boldText}>Temps écoulé:</Text> Votre rapidité{'\n'}
              • <Text style={styles.boldText}>Difficulté:</Text> DÉBUTANT / NORMAL / EXPERT / IMPOSSIBLE{'\n'}
              • <Text style={styles.boldText}>Classement:</Text> Comparé aux autres joueurs
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>🎖️ Défis Personnels</Text>
            <Text style={styles.infoBoxText}>
              • Battre votre record en tentatives{'\n'}
              • Battre votre record en temps{'\n'}
              • Complétez EXPERT en moins de 8 tentatives{'\n'}
              • Trouvez IMPOSSIBLE (bonne chance! 😄){'\n'}
              • Atteignez le classement mondial
            </Text>
          </View>
        </Section>

        <View style={styles.bottomPadding} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.bgPrimary,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexGrow: 1,
  },
  section: {
    backgroundColor: THEME.colors.bgSecondary,
    borderRadius: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: THEME.colors.primary,
    elevation: 2,
    shadowColor: THEME.colors.bgTertiary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: THEME.colors.bgTertiary,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.primary,
    letterSpacing: 0.5,
    flex: 1,
  },
  expandIcon: {
    fontSize: 12,
    color: THEME.colors.primary,
    fontWeight: '700',
  },
  sectionContent: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: THEME.colors.bgSecondary,
  },
  bodyText: {
    fontSize: 13,
    color: THEME.colors.textPrimary,
    lineHeight: 20,
    marginBottom: 8,
  },
  boldText: {
    fontWeight: '800',
    color: THEME.colors.primary,
  },
  highlightText: {
    fontWeight: '700',
    color: THEME.colors.success,
  },
  infoBox: {
    backgroundColor: THEME.colors.bgTertiary,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.primary,
  },
  infoBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginBottom: 6,
  },
  infoBoxText: {
    fontSize: 12,
    color: THEME.colors.textPrimary,
    lineHeight: 18,
  },
  // Bloc scoring (BP / MP) pour une meilleure lisibilité UX
  scoreBox: {
    backgroundColor: THEME.colors.bgTertiary,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.primary,
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  scoreIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  scoreContent: {
    flex: 1,
  },
  scoreLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
    marginBottom: 2,
  },
  scoreDesc: {
    fontSize: 12,
    color: THEME.colors.textMuted,
    marginBottom: 2,
  },
  scoreExample: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    fontStyle: 'italic',
  },
  modeCard: {
    backgroundColor: THEME.colors.bgSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.success,
    borderWidth: 1,
    borderColor: THEME.colors.bgTertiary,
  },
  modeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.success,
    marginBottom: 4,
  },
  modeDesc: {
    fontSize: 12,
    color: THEME.colors.textPrimary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  modeFeatures: {
    marginBottom: 8,
  },
  featureItem: {
    fontSize: 12,
    color: THEME.colors.gray200,
    marginBottom: 4,
    lineHeight: 16,
  },
  tipsBox: {
    backgroundColor: THEME.colors.bgTertiary,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderLeftWidth: 2,
    borderLeftColor: THEME.colors.warning,
  },
  tipsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.warning,
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 11,
    color: THEME.colors.textPrimary,
    lineHeight: 16,
  },
  difficultyCard: {
    backgroundColor: THEME.colors.bgSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.colors.bgTertiary,
  },
  difficultyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginBottom: 8,
  },
  difficultyContent: {
    gap: 8,
  },
  difficultyFeature: {
    fontSize: 12,
    color: THEME.colors.textPrimary,
    lineHeight: 18,
  },
  exampleBox: {
    backgroundColor: THEME.colors.bgTertiary,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderLeftWidth: 2,
    borderLeftColor: THEME.colors.success,
  },
  exampleTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.success,
    marginBottom: 6,
  },
  exampleLine: {
    fontSize: 11,
    color: THEME.colors.textPrimary,
    lineHeight: 16,
    marginBottom: 4,
  },
  strategyBox: {
    backgroundColor: THEME.colors.bgSecondary,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.secondary,
    borderWidth: 1,
    borderColor: THEME.colors.bgTertiary,
  },
  strategyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.secondary,
    marginBottom: 6,
  },
  strategyText: {
    fontSize: 12,
    color: THEME.colors.textPrimary,
    lineHeight: 18,
  },
  tipCard: {
    backgroundColor: THEME.colors.bgSecondary,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: THEME.colors.primary,
    borderWidth: 1,
    borderColor: THEME.colors.bgTertiary,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.primary,
    marginBottom: 6,
  },
  tipContent: {
    fontSize: 12,
    color: THEME.colors.textPrimary,
    lineHeight: 18,
  },
  bottomPadding: {
    height: 20,
  },
});
