import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  TouchableOpacityProps,
  TextStyle,
  ViewStyle,
  View
} from 'react-native';
import { colors, radii, fonts } from '@core/theme/colors';

export type ButtonVariant = 'default' | 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  label?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  size = 'md',
  label,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  children,
  ...props
}) => {
  const getVariantStyles = (): { bg: ViewStyle; text: TextStyle; border?: ViewStyle } => {
    switch (variant) {
      case 'primary':
      case 'default':
        return {
          bg: { backgroundColor: colors.primary },
          text: { color: colors.background, fontFamily: fonts.bodyBold }
        };
      case 'secondary':
        return {
          bg: { backgroundColor: colors.surfaceLight },
          text: { color: colors.textPrimary, fontFamily: fonts.bodySemiBold },
          border: { borderWidth: 1, borderColor: colors.border }
        };
      case 'outline':
        return {
          bg: { backgroundColor: colors.primary + '15' },
          text: { color: colors.primary, fontFamily: fonts.bodyBold },
          border: { borderWidth: 1, borderColor: colors.primary }
        };
      case 'ghost':
        return {
          bg: { backgroundColor: 'transparent' },
          text: { color: colors.textSecondary, fontFamily: fonts.bodySemiBold }
        };
    }
  };

  const getSizeStyles = (): { btn: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'sm':
        return {
          btn: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: radii.full },
          text: { fontSize: 12 }
        };
      case 'lg':
        return {
          btn: { paddingVertical: 14, paddingHorizontal: 22, borderRadius: radii.lg },
          text: { fontSize: 16 }
        };
      case 'icon':
        return {
          btn: { width: 34, height: 34, borderRadius: radii.full, padding: 0, justifyContent: 'center', alignItems: 'center' },
          text: { fontSize: 12 }
        };
      case 'md':
      default:
        return {
          btn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radii.md },
          text: { fontSize: 13 }
        };
    }
  };

  const vStyle = getVariantStyles();
  const sStyle = getSizeStyles();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[
        styles.baseButton,
        vStyle.bg,
        vStyle.border,
        sStyle.btn,
        style
      ]}
      {...props}
    >
      {icon && iconPosition === 'left' && (
        <View style={label ? styles.iconLeftMargin : undefined}>{icon}</View>
      )}

      {label ? (
        <Text style={[styles.baseText, vStyle.text, sStyle.text, textStyle]}>
          {label}
        </Text>
      ) : (
        children
      )}

      {icon && iconPosition === 'right' && (
        <View style={label ? styles.iconRightMargin : undefined}>{icon}</View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  baseText: {
    includeFontPadding: false,
    textAlign: 'center'
  },
  iconLeftMargin: {
    marginRight: 6
  },
  iconRightMargin: {
    marginLeft: 6
  }
});
