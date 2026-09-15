const apiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error(
    'EXPO_PUBLIC_API_URL is required. Copy .env.example to .env and set it to your computer\'s LAN IP on port 4000.'
  );
}

module.exports = ({ config }) => ({
  ...config,
  extra: { apiUrl },
});
