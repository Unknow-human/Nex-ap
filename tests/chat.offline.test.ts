import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../src/services/authService';
import { chatService } from '../src/services/supabase';

beforeEach(async () => {
  await authService._clearPendingChatMessagesForTests();
  await authService._clearPendingAccountForTests();
});

afterEach(async () => {
  await authService._clearPendingChatMessagesForTests();
});

test('sendMessage offline saves to pending queue when user is cached but offline', async () => {
  // simulate cached permanent user
  await AsyncStorage.setItem('@nexus_auth_cache_v1', JSON.stringify({ uid: 'cached-uid', isAnonymous: false, email: 'user@example.com' }));

  // Ensure no real auth.logged user (auth.currentUser) - environment test harness already has null

  // Send message while offline (no firebase auth current user)
  await chatService.sendMessage('Agent', 'Message offline test');

  const pending = await authService._getPendingChatMessagesForTests();
  expect(Array.isArray(pending)).toBe(true);
  expect(pending.length).toBeGreaterThan(0);
  const last = pending[pending.length - 1];
  expect(last.message).toBe('Message offline test');
  expect(last.creatorId).toBe('cached-uid');
});
