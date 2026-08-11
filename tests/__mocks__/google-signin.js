module.exports = {
  GoogleSignin: {
    configure: () => {},
    signIn: async () => ({ idToken: 'fake-id-token' }),
    getTokens: async () => ({ idToken: 'fake-id-token' }),
    signInSilently: async () => ({ idToken: 'fake-id-token' }),
    hasPlayServices: async () => true,
    signOut: async () => {},
    isSignedIn: async () => false,
  },
};
