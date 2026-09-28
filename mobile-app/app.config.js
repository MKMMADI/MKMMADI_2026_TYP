/**
 * Expo loads mobile-app/.env automatically for EXPO_PUBLIC_* vars.
 * This config also copies EXPO_PUBLIC_API_URL into extra.apiUrl so
 * Constants.expoConfig.extra.apiUrl is available at runtime.
 *
 * Set in mobile-app/.env:
 *   EXPO_PUBLIC_API_URL=http://172.30.128.1:4000
 *
 * After changing .env, restart Expo with a clear cache:
 *   npx expo start -c
 */
const apiUrl = (process.env.EXPO_PUBLIC_API_URL || '').trim() || 'http://10.0.2.2:4000';

if (!process.env.EXPO_PUBLIC_API_URL) {
  console.warn(
    '[app.config] EXPO_PUBLIC_API_URL is not set. Using fallback',
    apiUrl,
    '- create mobile-app/.env with EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:4000 and run: npx expo start -c',
  );
} else {
  console.log('[app.config] Using EXPO_PUBLIC_API_URL =', apiUrl);
}

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra || {}),
    apiUrl,
  },
});
