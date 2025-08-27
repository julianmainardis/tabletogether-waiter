const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configuración para ignorar errores de desarrollo
config.resolver.platforms = ['ios', 'android', 'native', 'web'];
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Ignorar warnings específicos
config.reporter = {
  ...config.reporter,
  update: () => {},
};

module.exports = config;
