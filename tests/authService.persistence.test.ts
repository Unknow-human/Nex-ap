import { authService } from '../src/services/authService';

// Mocks
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    signInSilently: async () => ({ idToken: 'mock-id-token' }),
    getTokens: async () => ({ idToken: 'mock-id-token' }),
  },
}));

// Mock secure storage via AsyncStorage mock available

afterEach(async () => {
  // clear stored provider/credentials
  await authService._clearPendingAccountForTests();
});

test('getEffectiveUser returns cached user when present', async () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  await AsyncStorage.setItem('@nexus_auth_cache_v1', JSON.stringify({ uid: 'cached-uid', isAnonymous: false, email: 'user@example.com' }));

  const user = await authService.getEffectiveUser();
  expect(user).not.toBeNull();
  expect(user!.uid).toBe('cached-uid');
  expect(user!.isOffline).toBe(true);
});
