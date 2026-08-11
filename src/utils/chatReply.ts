// Encodage/décodage de la référence "reply to" dans le champ texte du
// message de chat.
//
// Pourquoi pas une vraie colonne `reply_to` en base : la table
// `chat_messages` existante n'a pas ce champ, et en ajouter un nécessiterait
// une migration SQL manuelle côté Supabase (comme pour l'auth anonyme —
// voir feuille de route). Pour rester autonome (0 action manuelle requise),
// on encode la référence dans le texte du message avec un caractère de
// contrôle (\u0001) qu'aucun clavier ne peut saisir, donc jamais ambigu
// avec un vrai message utilisateur.
//
// Ancien comportement (bug "affichage bizarre") : le texte de la réponse
// était concaténé en clair dans le message
// (`"...\n\n[Reply to X: \"...\"]"`), donc affiché tel quel, sans mise en
// forme, dans la bulle — d'où l'affichage "bizarre" signalé.

export interface ReplyMeta {
  id: string;
  agentName: string;
  message: string;
}

const MARK = '\u0001';

export function encodeReply(body: string, replyTo: ReplyMeta | null | undefined): string {
  if (!replyTo) return body;
  const meta = JSON.stringify({
    id: replyTo.id,
    agentName: replyTo.agentName,
    // Tronqué ici : pas besoin de stocker un roman dans la citation.
    message: replyTo.message.slice(0, 120),
  });
  return `${MARK}${meta}${MARK}${body}`;
}

export function decodeReply(raw: string): { replyTo: ReplyMeta | null; body: string } {
  if (!raw.startsWith(MARK)) {
    return { replyTo: null, body: raw };
  }
  const endIndex = raw.indexOf(MARK, 1);
  if (endIndex === -1) {
    // Marqueur ouvrant sans fermeture : donnée corrompue/tronquée, on
    // n'essaie pas de deviner — on affiche tel quel plutôt que de planter.
    return { replyTo: null, body: raw };
  }
  const metaRaw = raw.slice(1, endIndex);
  const body = raw.slice(endIndex + 1);
  try {
    const parsed = JSON.parse(metaRaw);
    if (parsed && typeof parsed.id === 'string' && typeof parsed.message === 'string') {
      return {
        replyTo: {
          id: parsed.id,
          agentName: parsed.agentName || 'Anonyme',
          message: parsed.message,
        },
        body,
      };
    }
  } catch {
    // JSON invalide : on retombe sur l'affichage brut plutôt que de planter.
  }
  return { replyTo: null, body: raw };
}
