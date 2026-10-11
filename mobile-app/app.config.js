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
const apiUrl = (process.env.EXPO_PUBLIC_API_URL || '').trim();

if (!apiUrl) {
  throw new Error(
    'EXPO_PUBLIC_API_URL is required. Set it in mobile-app/.env for local development ' +
      'or in the EAS build environment. Use a reachable HTTPS URL for a device build.',
  );
}

console.log('[app.config] Using configured EXPO_PUBLIC_API_URL');

module.exports = ({ config }) => ({
  ...config,
  plugins: [...(config.plugins || []), '@react-native-community/datetimepicker'],
  extra: {
    ...(config.extra || {}),
    apiUrl,
  },
});
