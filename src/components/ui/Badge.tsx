import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, radii, fonts } from '@core/theme/colors';

export interface BadgeProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'cyan' | 'purple' | 'outline' | 'streak';
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  icon,
  style,
  textStyle
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return { bg: colors.secondary + '20', border: colors.secondary, text: colors.secondary };
      case 'cyan':
        return { bg: colors.cyan + '20', border: colors.cyan, text: colors.cyan };
      case 'purple':
        return { bg: colors.purple + '20', border: colors.purple, text: colors.purple };
      case 'streak':
        return { bg: colors.primary + '20', border: colors.primary, text: colors.primary };
      case 'outline':
        return { bg: 'transparent', border: colors.border, text: colors.textSecondary };
      case 'primary':
      default:
        return { bg: colors.primary + '20', border: colors.primary, text: colors.primary };
    }
  };

  const vStyle = getVariantStyles();

  return (
    <View style={[styles.badge, { backgroundColor: vStyle.bg, borderColor: vStyle.border }, style]}>
      {icon && <View style={styles.iconMargin}>{icon}</View>}
      <Text style={[styles.text, { color: vStyle.text }, textStyle]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
    flexShrink: 0
  },
  iconMargin: {
    marginRight: 4
  },
  text: {
    fontSize: 12,
    fontFamily: fonts.bodyBold,
    includeFontPadding: false
  }
});
