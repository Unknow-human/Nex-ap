const store = new Map();

module.exports = {
  setItem: async (key, value) => { store.set(key, String(value)); return null; },
  getItem: async (key) => { return store.has(key) ? store.get(key) : null; },
  removeItem: async (key) => { store.delete(key); return null; },
  clear: async () => { store.clear(); return null; },
};
