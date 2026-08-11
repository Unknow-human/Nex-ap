# Réactivation de l'arène (online) 🔄

L'arène en ligne a été réactivée dans l'application mobile.

## Ce qui a été fait
- Le flag `ONLINE_ENABLED` est maintenant `true` dans `src/screens/GameScreen.tsx`.
- L'option **EN LIGNE / MULTI-ONLINE** a été réintégrée dans l'écran de sélection de mode.

## Comment tester localement
1. Lancez l'app en mode développement (Expo) : `npm start` puis `expo run:android` ou `expo start` + `npx expo run:android`.
2. Ouvrez l'écran principal : vous devriez voir 3 modes : **SOLO**, **DUO LOCAL**, **EN LIGNE**.
3. Sélectionnez **EN LIGNE** : la modal pour créer/rejoindre une arène doit s'ouvrir.
4. Testez la création d'arène et le chat en ouvrant une autre instance (web ou autre appareil) et en rejoignant la même arène.

## Tests automatisés recommandés
- Ajouter un test d'affichage pour vérifier que la liste de modes contient `MULTI-ONLINE` quand le flag est activé.
- Ajouter un test d'intégration (émulateur Firestore) qui crée une arène, rejoint et échange des messages de chat.

---

Si vous voulez, je peux ajouter le test unitaire pour la présence du bouton **EN LIGNE** et ouvrir une PR avec les modifications et tests associés.