import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../src/services/authService';

const AUTH_CACHE_KEY = '@nexus_auth_cache_v1';

describe('authService.initializeAuth fallback behaviour', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  test('does not sign in anonymously when a permanent cached user exists', async () => {
    const cached = { uid: 'cached-user-123', isAnonymous: false, email: 'cached@example.com' };
    await AsyncStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cached));

    const result = await authService.initializeAuth();

    // Our change resolves null when we restore from local cache
    expect(result).toBeNull();

    // The cached auth should remain intact (no overwrite to anonymous)
    const cachedNow = await authService.getCachedAuth();
    expect(cachedNow).toEqual(cached);

    // Synchronous getters should expose the cached snapshot (so the app won't force login when offline)
    const current = authService.getCurrentUser();
    expect(current).not.toBeNull();
    expect((current as any).uid).toBe(cached.uid);
    expect(authService.isAuthenticated()).toBe(true);
  }, 20000);
});
