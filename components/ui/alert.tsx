import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

interface AlertProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Alert: React.FC<AlertProps> = ({ children, style }) => {
  return <View style={[styles.alert, style]}>{children}</View>;
};

export const AlertDescription: React.FC<AlertProps> = ({ children, style }) => {
  return <Text style={[styles.description, style]}>{children}</Text>;
};

const styles = StyleSheet.create({
  alert: {
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    backgroundColor: '#eff6ff',
    marginVertical: 4,
  },
  description: {
    fontSize: 14,
    color: '#1f2937',
    lineHeight: 20,
  },
});
