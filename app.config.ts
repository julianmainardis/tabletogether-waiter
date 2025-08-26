import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "mobile-waiter",
  slug: "mobile-waiter",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/icon.png",
      backgroundColor: "#ffffff"
    }
  },
  web: {
    favicon: "./assets/icon.png",
    bundler: "metro"
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api"
  },
  plugins: []
});
