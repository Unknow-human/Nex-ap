module.exports = {
  Platform: { OS: 'android' },
  // Minimal mocks for other RN pieces used in tests
  NativeModules: {},
  DeviceEventEmitter: { addListener: () => ({ remove: () => {} }) },
};
