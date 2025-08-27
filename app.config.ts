import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'TableTogether Waiter',
  slug: 'tabletogether-waiter',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff'
  },
  assetBundlePatterns: [
    '**/*'
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.tabletogether.waiter'
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFFFFF'
    },
    package: 'com.tabletogether.waiter'
  },
  web: {
    favicon: './assets/favicon.png'
  },
  extra: {
    eas: {
      projectId: 'your-project-id'
    }
  },
  plugins: [
    'expo-router'
  ],
  experiments: {
    typedRoutes: true
  },
  // Configuración para ignorar errores de desarrollo
  developmentClient: {
    silentLaunch: true
  }
});
