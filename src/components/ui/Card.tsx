import React from 'react';
import { View, Text, StyleSheet, ViewProps, TextProps } from 'react-native';
import { colors, radii, fonts } from '@core/theme/colors';

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

export const CardHeader: React.FC<ViewProps> = ({ children, style, ...props }) => (
  <View style={[styles.cardHeader, style]} {...props}>
    {children}
  </View>
);

export const CardTitle: React.FC<TextProps> = ({ children, style, ...props }) => (
  <Text style={[styles.cardTitle, style]} {...props}>
    {children}
  </Text>
);

export const CardDescription: React.FC<TextProps> = ({ children, style, ...props }) => (
  <Text style={[styles.cardDescription, style]} {...props}>
    {children}
  </Text>
);

export const CardContent: React.FC<ViewProps> = ({ children, style, ...props }) => (
  <View style={[styles.cardContent, style]} {...props}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 14
  },
  elevated: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border
  },
  glass: {
    backgroundColor: colors.glassBackground,
    borderColor: colors.glassBorder
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  cardTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.headingBold,
    fontSize: 17,
    includeFontPadding: false
  },
  cardDescription: {
    color: colors.textSecondary,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 20,
    includeFontPadding: false
  },
  cardContent: {
    marginTop: 4
  }
});
