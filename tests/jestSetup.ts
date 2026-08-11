// Jest setup: define React Native __DEV__ and ensure Supabase env vars exist
// This file is loaded before tests so code checks relying on __DEV__ won't throw.

// @ts-ignore - global can be extended in tests
(global as any).__DEV__ = true;

// Load .env file (if present) so tests get the same EXPO_PUBLIC_SUPABASE_* variables
// Simple parser avoids adding a dependency on dotenv in CI
const fs = require('fs');
const path = require('path');
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach((line: string) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const k = m[1].trim();
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  });
}

// Ensure minimal Supabase client config exists so client initialization doesn't fail
process.env.EXPO_PUBLIC_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://test-project.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';

console.log('[jestSetup] __DEV__ set, EXPO_PUBLIC_SUPABASE_URL=', process.env.EXPO_PUBLIC_SUPABASE_URL);
