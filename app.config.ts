import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Mobile Waiter",
  slug: "mobile-waiter",
  version: "1.0.1",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  scheme: "mobile-waiter",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.gastronflow.mobilewaiter",
    buildNumber: "2",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false
    }
  },
  android: {
    package: "com.gastronflow.mobilewaiter",
    versionCode: 2,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    }
  },
  web: {
    favicon: "./assets/favicon.png",
    bundler: "metro"
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://table-together-backend-production.up.railway.app",
    frontendUrl: process.env.EXPO_PUBLIC_FRONTEND_URL || "https://table-together-client-production.up.railway.app",
    eas: {
      projectId: "a06b62df-3e17-435f-8d9e-b3c18a5a15c0"
    }
  },
  owner: "jmainardishannois",
  plugins: [
    "expo-router"
  ]
} as any);
