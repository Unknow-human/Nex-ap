/**
 * Calcule le score d'une tentative contre le code secret
 * @param tentative Code tenté par le joueur (ex: "1234")
 * @param secret Code secret à deviner (ex: "5678")
 * @returns {bp: number, mp: number} BP = Bien Placés, MP = Mal Placés
 */
export function calculerScore(tentative: string, secret: string): { bp: number; mp: number } {
  if (tentative.length !== secret.length) {
    return { bp: 0, mp: 0 };
  }

  const tentativeArray = tentative.split('');
  const secretArray = secret.split('');
  
  let bp = 0;
  let mp = 0;
  
  // Tableaux pour marquer les positions déjà comptées
  const tentativeUsed = new Array(tentative.length).fill(false);
  const secretUsed = new Array(secret.length).fill(false);
  
  // Étape 1: Compter les Bien Placés (BP)
  for (let i = 0; i < tentative.length; i++) {
    if (tentativeArray[i] === secretArray[i]) {
      bp++;
      tentativeUsed[i] = true;
      secretUsed[i] = true;
    }
  }
  
  // Étape 2: Compter les Mal Placés (MP)
  for (let i = 0; i < tentative.length; i++) {
    if (tentativeUsed[i]) continue; // Déjà compté comme BP
    
    for (let j = 0; j < secret.length; j++) {
      if (secretUsed[j]) continue; // Déjà compté comme BP
      if (i === j) continue; // Même position = déjà compté comme BP
      
      if (tentativeArray[i] === secretArray[j]) {
        mp++;
        tentativeUsed[i] = true;
        secretUsed[j] = true;
        break;
      }
    }
  }
  
  return { bp, mp };
}

/**
 * Calcule le score avec assistance basée sur la difficulté
 * DEBUTANT: Révèle les chiffres bien placés
 * NORMAL: Score normal avec tous les indices
 * EXPERT: Score normal sans indices progressifs
 * IMPOSSIBLE: Score masqué (seulement si victoire)
 */
export function calculerScoreDifficulte(
  tentative: string,
  secret: string,
  difficulty: 'DEBUTANT' | 'NORMAL' | 'EXPERT' | 'IMPOSSIBLE',
  previousAttempts: Array<{ code: string; bp: number; mp: number }>
): { bp: number; mp: number; revealedPositions?: number[] } {
  const score = calculerScore(tentative, secret);

  if (difficulty === 'DEBUTANT') {
    // DÉBUTANT: Révèle les positions correctes et maintient les chiffres corrects
    const revealedPositions: number[] = [];
    const tentativeArray = tentative.split('');
    const secretArray = secret.split('');
    
    for (let i = 0; i < 4; i++) {
      if (tentativeArray[i] === secretArray[i]) {
        revealedPositions.push(i);
      }
    }
    
    return { bp: score.bp, mp: score.mp, revealedPositions };
  } else if (difficulty === 'NORMAL') {
    // NORMAL: Score normal complet
    return { bp: score.bp, mp: score.mp };
  } else if (difficulty === 'EXPERT') {
    // EXPERT: Score normal mais avec peu d'indices
    return { bp: score.bp, mp: score.mp };
  } else if (difficulty === 'IMPOSSIBLE') {
    // IMPOSSIBLE: Aucun indice jusqu'à la victoire
    if (score.bp === 4) {
      return { bp: 4, mp: 0 }; // Victoire!
    }
    return { bp: 0, mp: 0 }; // Aucun indice
  }

  return { bp: score.bp, mp: score.mp };
}

/**
 * Génère un code secret de 4 chiffres unique
 */
export function genererCodeSecret(): string {
  const chiffres = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const code: number[] = [];
  
  // Premier chiffre peut être 1-9 (pas 0 pour éviter les codes commençant par 0)
  const premierChiffre = Math.floor(Math.random() * 9) + 1;
  code.push(premierChiffre);
  
  // Retirer le premier chiffre de la liste
  const index = chiffres.indexOf(premierChiffre);
  chiffres.splice(index, 1);
  
  // Ajouter 0 à la liste pour les positions suivantes
  chiffres.push(0);
  
  // Générer les 3 chiffres restants
  for (let i = 0; i < 3; i++) {
    const randomIndex = Math.floor(Math.random() * chiffres.length);
    code.push(chiffres[randomIndex]);
    chiffres.splice(randomIndex, 1);
  }
  
  return code.join('');
}

/**
 * Valide qu'un code est valide (4 chiffres uniques)
 */
export function validerCode(code: string): boolean {
  if (code.length !== 4) return false;
  if (!/^\d{4}$/.test(code)) return false;
  
  // Les chiffres peuvent être répétés dans Mastermind
  return true;
}
