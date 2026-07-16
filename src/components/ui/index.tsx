import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../theme';

// ─── Button ──────────────────────────────────────────────────────────────────
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button = ({
  title, onPress, variant = 'primary', size = 'md',
  loading, disabled, style, textStyle, icon
}: ButtonProps) => {
  const bgColors = {
    primary: COLORS.primary,
    secondary: COLORS.secondary,
    danger: COLORS.danger,
    outline: 'transparent',
    ghost: 'transparent',
  };

  const textColors = {
    primary: COLORS.white,
    secondary: COLORS.white,
    danger: COLORS.white,
    outline: COLORS.primary,
    ghost: COLORS.gray600,
  };

  const heights = { sm: 36, md: 44, lg: 52 };
  const fontSizes = { sm: FONTS.sizes.sm, md: FONTS.sizes.md, lg: FONTS.sizes.lg };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: bgColors[variant],
          height: heights[size],
          opacity: disabled || loading ? 0.6 : 1,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: variant === 'outline' ? COLORS.primary : undefined,
        },
        variant === 'primary' && SHADOWS.green,
        style,
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={textColors[variant]} size="small" />
      ) : (
        <>
          {icon && <View style={{ marginRight: SPACING.sm }}>{icon}</View>}
          <Text style={[styles.buttonText, { color: textColors[variant], fontSize: fontSizes[size] }, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

// ─── Input ───────────────────────────────────────────────────────────────────
interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export const Input = ({ label, error, leftIcon, rightIcon, containerStyle, style, ...props }: InputProps) => (
  <View style={[{ marginBottom: SPACING.md }, containerStyle]}>
    {label && <Text style={styles.label}>{label}</Text>}
    <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
      {leftIcon && <View style={styles.inputIcon}>{leftIcon}</View>}
      <TextInput
        style={[styles.input, leftIcon ? { paddingLeft: 0 } : null, style]}
        placeholderTextColor={COLORS.gray400}
        {...props}
      />
      {rightIcon && <View style={styles.inputIcon}>{rightIcon}</View>}
    </View>
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

export const Card = ({ children, style, padding = SPACING.lg }: CardProps) => (
  <View style={[styles.card, { padding }, style]}>
    {children}
  </View>
);

// ─── Badge ────────────────────────────────────────────────────────────────────
interface BadgeProps {
  label: string;
  color?: string;
  bgColor?: string;
  size?: 'sm' | 'md';
}

export const Badge = ({ label, color = COLORS.white, bgColor = COLORS.primary, size = 'md' }: BadgeProps) => (
  <View style={[styles.badge, { backgroundColor: bgColor + '20' }]}>
    <Text style={[styles.badgeText, { color: bgColor, fontSize: size === 'sm' ? 10 : 12 }]}>
      {label}
    </Text>
  </View>
);

// ─── Avatar ──────────────────────────────────────────────────────────────────
interface AvatarProps {
  name: string;
  photoUrl?: string;
  size?: number;
  bgColor?: string;
}

export const Avatar = ({ name, photoUrl, size = 40, bgColor }: AvatarProps) => {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const colors = [COLORS.primary, '#8B5CF6', '#EC4899', '#F59E0B', '#3B82F6'];
  const colorIdx = name.charCodeAt(0) % colors.length;
  const bg = bgColor ?? colors[colorIdx];

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
};

// ─── Section Header ──────────────────────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
}

export const SectionHeader = ({ title, subtitle, rightElement }: SectionHeaderProps) => (
  <View style={styles.sectionHeader}>
    <View style={{ flex: 1 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
    {rightElement}
  </View>
);

// ─── Empty State ─────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({ icon, title, message, actionLabel, onAction }: EmptyStateProps) => (
  <View style={styles.emptyState}>
    {icon && <View style={styles.emptyIcon}>{icon}</View>}
    <Text style={styles.emptyTitle}>{title}</Text>
    {message && <Text style={styles.emptyMessage}>{message}</Text>}
    {actionLabel && onAction && (
      <Button title={actionLabel} onPress={onAction} size="md" style={{ marginTop: SPACING.lg }} />
    )}
  </View>
);

// ─── Divider ─────────────────────────────────────────────────────────────────
export const Divider = ({ style }: { style?: ViewStyle }) => (
  <View style={[styles.divider, style]} />
);

// ─── Chip ─────────────────────────────────────────────────────────────────────
interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
}

export const Chip = ({ label, selected, onPress, color = COLORS.primary }: ChipProps) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      styles.chip,
      { borderColor: color, backgroundColor: selected ? color : 'transparent' },
    ]}
    activeOpacity={0.7}
  >
    <Text style={[styles.chipText, { color: selected ? COLORS.white : color }]}>
      {label}
    </Text>
  </TouchableOpacity>
);

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
  },
  buttonText: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  label: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.gray700,
    marginBottom: SPACING.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.gray900,
  },
  inputIcon: {
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: FONTS.sizes.xs,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    ...SHADOWS.md,
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  sectionSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray500,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.xl,
  },
  emptyIcon: {
    marginBottom: SPACING.lg,
    opacity: 0.4,
  },
  emptyTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.gray700,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.gray500,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray100,
    marginVertical: SPACING.md,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  chipText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
  },
});
