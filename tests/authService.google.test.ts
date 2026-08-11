import { authService } from '../src/services/authService';

describe('authService Google Sign-In availability', () => {
  test('canUseGoogleSignIn returns boolean (mocked module should make it true)', () => {
    const available = authService.canUseGoogleSignIn();
    expect(typeof available).toBe('boolean');
    // In our test mocks the GoogleSignin mock exists, so prefer to assert truthiness
    expect(available).toBe(true);
  });
});