module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-reanimated (dépendance directe, v4.1) EXIGE ce plugin
    // babel pour fonctionner correctement — sans lui, il tourne dans un
    // mode dégradé qui peut provoquer des erreurs internes obscures
    // ("Cannot read property 'getUseOfValueInStyleWarning' of undefined"
    // notamment) dès qu'un nouveau composant vient toucher au pipeline de
    // styles. Doit rester le DERNIER plugin de la liste (contrainte
    // officielle de reanimated).
    plugins: ['react-native-reanimated/plugin'],
  };
};
