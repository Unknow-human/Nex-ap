import {
  Orbitron_400Regular,
  Orbitron_600SemiBold,
  Orbitron_700Bold,
  Orbitron_800ExtraBold,
} from '@expo-google-fonts/orbitron';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';

// Passé à useFonts() dans App.tsx : { [nomDeFamille]: asset }
export const FONT_ASSETS = {
  Orbitron_400Regular,
  Orbitron_600SemiBold,
  Orbitron_700Bold,
  Orbitron_800ExtraBold,
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
};

// Noms de famille utilisables dans les styles (theme/index.ts notamment).
// Ne pas combiner avec `fontWeight` : le poids est déjà encodé dans le nom
// de la police (ex. Orbitron_700Bold), lui rajouter fontWeight peut faire
// chercher une variante inexistante à RN sur certaines plateformes.
export const FONT_FAMILY = {
  orbitronRegular: 'Orbitron_400Regular',
  orbitronSemiBold: 'Orbitron_600SemiBold',
  orbitronBold: 'Orbitron_700Bold',
  orbitronExtraBold: 'Orbitron_800ExtraBold',
  monoRegular: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;
