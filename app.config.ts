import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Mobile Waiter",
  slug: "mobile-waiter",
  version: "1.0.4",
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
    apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://table-together-backend-production.up.railway.app/api",
    frontendUrl: process.env.EXPO_PUBLIC_FRONTEND_URL || "https://table-together-client-production.up.railway.app/",
    eas: {
      projectId: "1edfa3ff-5b7e-410f-be06-b590e00b50fa"
    }
  },
  owner: "julianmainardis",
  plugins: [
    "expo-router"
  ]
} as any);
