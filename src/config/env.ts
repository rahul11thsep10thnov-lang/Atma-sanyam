// Public build-time configuration. EXPO_PUBLIC_* values are inlined into the
// app bundle, so they must never contain secrets — only public URLs/flags.
// Set them per build profile in eas.json, or locally in .env (see .env.example).

function clean(url: string | undefined): string | null {
  const v = (url ?? '').trim().replace(/\/+$/, '');
  return v.length > 0 ? v : null;
}

export const env = {
  appEnv: (process.env.EXPO_PUBLIC_APP_ENV ?? 'development') as 'development' | 'preview' | 'production',
  // When unset the app runs fully offline with its bundled/mock content,
  // exactly like before the backend existed (handy in Expo Go).
  apiUrl: clean(process.env.EXPO_PUBLIC_API_URL),
  privacyPolicyUrl: clean(process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL),
  termsUrl: clean(process.env.EXPO_PUBLIC_TERMS_URL),
  supportEmail: (process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? '').trim() || null,
};

export const isBackendConfigured = env.apiUrl !== null;
