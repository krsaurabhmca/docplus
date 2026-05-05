export const CONFIG = {
    BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost/docplus',
    API_BASE: (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost/docplus') + '/api/index.php',
    API_TOKEN_KEY: process.env.EXPO_PUBLIC_API_TOKEN_KEY || 'docplus_auth_token',
};
