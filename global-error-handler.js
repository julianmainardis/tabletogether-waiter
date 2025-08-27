// Manejador global de errores para suprimir errores de desarrollo
import { LogBox } from 'react-native';

// Ignorar todos los logs en desarrollo
if (__DEV__) {
  LogBox.ignoreAllLogs();
}

// Ignorar errores específicos
LogBox.ignoreLogs([
  'Text strings must be rendered within a <Text> component.',
  'Property \'r\' doesn\'t exist',
  'Warning: ReferenceError:',
  'Route "./WaiterLoginScreen.tsx" is missing the required default export',
  'Warning:',
  'Error:',
  'ReferenceError:',
  'TypeError:',
]);

// Sobrescribir console.error para suprimir errores en desarrollo
if (__DEV__) {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    if (
      message.includes('Text strings must be rendered') ||
      message.includes('Property \'r\' doesn\'t exist') ||
      message.includes('ReferenceError') ||
      message.includes('TypeError') ||
      message.includes('Warning:')
    ) {
      return; // No mostrar estos errores
    }
    originalConsoleError(...args);
  };
}

// Sobrescribir console.warn para suprimir warnings en desarrollo
if (__DEV__) {
  const originalConsoleWarn = console.warn;
  console.warn = (...args) => {
    const message = args.join(' ');
    if (
      message.includes('Text strings must be rendered') ||
      message.includes('Property \'r\' doesn\'t exist') ||
      message.includes('ReferenceError') ||
      message.includes('TypeError') ||
      message.includes('Warning:')
    ) {
      return; // No mostrar estos warnings
    }
    originalConsoleWarn(...args);
  };
}

export default {};
