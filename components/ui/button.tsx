import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, View, Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'default',
  size = 'md',
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const buttonStyle = [
    styles.base,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
    style,
  ];

  const textStyleCombined = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={textStyleCombined}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: isTablet ? 12 : 6,
  },
  default: {
    backgroundColor: '#FF6B6B', // Color gastro-primary correcto
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  sm: {
    paddingHorizontal: isTablet ? 12 : 8,
    paddingVertical: isTablet ? 8 : 4,
    borderRadius: 6,
  },
  md: {
    paddingHorizontal: isTablet ? 16 : 12,
    paddingVertical: isTablet ? 12 : 6,
    borderRadius: 8,
  },
  lg: {
    paddingHorizontal: isTablet ? 20 : 16,
    paddingVertical: isTablet ? 16 : 8,
    borderRadius: 10,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '500',
    fontSize: isTablet ? 22 : 14,
  },
  defaultText: {
    color: '#ffffff',
  },
  outlineText: {
    color: '#374151',
  },
  ghostText: {
    color: '#FF6B6B', // Color gastro-primary correcto
  },
  smText: {
    fontSize: isTablet ? 16 : 12,
  },
  mdText: {
    fontSize: isTablet ? 22 : 14,
  },
  lgText: {
    fontSize: isTablet ? 26 : 16,
  },
  disabledText: {
    color: '#9ca3af',
  },
  iconContainer: {
    marginRight: 8,
  },
});
