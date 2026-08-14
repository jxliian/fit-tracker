import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { colors, radii } from '@core/theme/colors';

export interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'glass';
}

export const Card: React.FC<CardProps> = ({ children, style, variant = 'default', ...props }) => {
  return (
    <View
      style={[
        styles.card,
        variant === 'elevated' && styles.elevated,
        variant === 'glass' && styles.glass,
        style
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.surfaceBorder
  },
  elevated: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border
  },
  glass: {
    backgroundColor: colors.glassBackground,
    borderColor: colors.glassBorder
  }
});
