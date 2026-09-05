const fs = require('fs');
const path = '/Users/mehersairamtangudu/Desktop/workspace1/vindu/src/lib/supabase.ts';
let code = fs.readFileSync(path, 'utf8');

const oldStorage = `const isServer = Platform.OS === 'web' && typeof window === 'undefined';
const customStorage = isServer ? {
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  removeItem: () => Promise.resolve(),
} : ExpoSecureStoreAdapter;`;

const newStorage = `const customStorage = {
  getItem: (key: string) => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return Promise.resolve(null);
      try { return Promise.resolve(window.localStorage.getItem(key)); } catch (e) { return Promise.resolve(null); }
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        try { window.localStorage.setItem(key, value); } catch (e) {}
      }
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        try { window.localStorage.removeItem(key); } catch (e) {}
      }
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};`;

code = code.replace(oldStorage, newStorage);

// Remove the ExpoSecureStoreAdapter completely
const oldAdapter = `const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    SecureStore.deleteItemAsync(key);
  },
};`;

code = code.replace(oldAdapter, '');

fs.writeFileSync(path, code);
