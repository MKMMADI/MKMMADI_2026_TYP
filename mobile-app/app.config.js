const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  // Dev fallback so Expo still boots if .env is missing
  'http://10.0.2.2:4000';

if (!process.env.EXPO_PUBLIC_API_URL) {
  console.warn(
    '[app.config] EXPO_PUBLIC_API_URL is not set. Using fallback',
    apiUrl,
    '- copy mobile-app/.env.example to .env and set your LAN IP:4000 for a real device.',
  );
}

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...(config.extra || {}),
    apiUrl,
  },
});
