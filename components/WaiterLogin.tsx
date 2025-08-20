import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';

interface WaiterLoginProps {
  onLogin: (username: string, password: string) => void;
  loading?: boolean;
  error?: string;
}

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

export const WaiterLogin: React.FC<WaiterLoginProps> = ({
  onLogin,
  loading = false,
  error,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }
    onLogin(username.trim(), password);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
      
      <View style={styles.content}>
        <Card style={styles.loginCard}>
          <CardContent style={styles.cardContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Ionicons name="restaurant" size={isTablet ? 78 : 40} color="#3b82f6" />
              </View>
              <Text style={styles.title}>TableTogether</Text>
              <Text style={styles.subtitle}>Acceso de Camareros</Text>
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Login Form */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons name="person" size={isTablet ? 31 : 20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Usuario"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed" size={isTablet ? 31 : 20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Contraseña"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  <Ionicons 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={isTablet ? 31 : 20} 
                    color="#6b7280" 
                  />
                </TouchableOpacity>
              </View>

              <Button
                title={loading ? "Iniciando sesión..." : "Iniciar Sesión"}
                onPress={handleLogin}
                disabled={loading}
                style={styles.loginButton}
                icon={loading ? <Ionicons name="refresh" size={16} color="#ffffff" /> : undefined}
              />
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Sistema de gestión de mesas y pedidos
              </Text>
              <Text style={styles.versionText}>v1.0.0</Text>
            </View>
          </CardContent>
        </Card>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: isTablet ? 40 : 20,
  },
  loginCard: {
    width: isTablet ? 650 : '100%',
    maxWidth: isTablet ? 650 : 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardContent: {
    padding: isTablet ? 52 : 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: isTablet ? 42 : 24,
  },
  logoContainer: {
    width: isTablet ? 130 : 64,
    height: isTablet ? 130 : 64,
    borderRadius: isTablet ? 65 : 32,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: isTablet ? 47 : 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: isTablet ? 26 : 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#dc2626',
    fontSize: isTablet ? 14 : 12,
    marginLeft: 8,
    flex: 1,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: isTablet ? 21 : 12,
  },
  inputIcon: {
    marginRight: 12,
    fontSize: isTablet ? 31 : 20,
  },
  textInput: {
    flex: 1,
    fontSize: isTablet ? 23 : 14,
    color: '#111827',
    paddingVertical: isTablet ? 26 : 12,
  },
  eyeButton: {
    padding: 8,
  },
  loginButton: {
    marginTop: 8,
  },
  footer: {
    marginTop: isTablet ? 42 : 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: isTablet ? 21 : 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  versionText: {
    fontSize: isTablet ? 18 : 10,
    color: '#9ca3af',
  },
});
