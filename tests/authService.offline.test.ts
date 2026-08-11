import { authService } from '../src/services/authService';

// Mock fetch to simulate network availability
const realFetch = global.fetch;

beforeEach(async () => {
  // Clear any pending data
  await authService._clearPendingAccountForTests();
  await authService._clearPendingResetsForTests();
});

afterAll(() => {
  global.fetch = realFetch;
});

test('createAccountWithEmail saves pending account when offline', async () => {
  // simulate offline
  global.fetch = jest.fn(() => Promise.reject(new Error('offline')));

  await expect(authService.createAccountWithEmail('offline@example.com', 'password123')).rejects.toMatchObject({ code: 'OFFLINE_PENDING_ACCOUNT_SAVED' });

  const pending = await authService._getPendingAccountForTests();
  expect(pending).toBeTruthy();
  expect(pending.email).toBe('offline@example.com');
  expect(pending.password).toBe('password123');
});

test('requestPasswordReset saves pending reset when offline', async () => {
  global.fetch = jest.fn(() => Promise.reject(new Error('offline')));

  await expect(authService.requestPasswordReset('user@example.com')).rejects.toMatchObject({ code: 'OFFLINE_PENDING_RESET_SAVED' });

  const resets = await authService._getPendingResetsForTests();
  expect(Array.isArray(resets)).toBe(true);
  expect(resets).toContain('user@example.com');
});

// Note: further tests for processing pending queues when online require mocking
// Firebase functions and are better run as integration tests. These unit tests ensure
// the offline queueing behavior works and will not modify server state.
