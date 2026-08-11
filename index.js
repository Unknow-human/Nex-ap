if (typeof __DEV__ !== 'undefined' && !__DEV__) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}

const { registerRootComponent } = require('expo');
const App = require('./App').default;

registerRootComponent(App);
