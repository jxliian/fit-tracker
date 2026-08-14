/**
 * FitTracker Apple Fitness & shadcn Design Tokens
 * 
 * Based on Apple iOS Fitness dark mode aesthetics:
 * - Pure OLED Black (#000000)
 * - Rounded squircle widgets (#1C1C1E)
 * - Neon metric accents (Pink, Green, Cyan, Purple, Yellow)
 * - Glassmorphism translucent floating navigation bar
 */
export const colors = {
  // Base Palette (shadcn / Apple Dark Mode)
  background: '#000000',          // Pure OLED Pitch Black
  surface: '#1C1C1E',             // Apple Dark Card Widget Surface
  surfaceLight: '#2C2C2E',        // Elevated Card / Input / Glass Pill
  surfaceBorder: '#2C2C2E',       // Subtle widget border
  border: '#38383A',              // Stronger border

  // Glassmorphism Tokens
  glassBackground: 'rgba(28, 28, 30, 0.75)',
  glassBorder: 'rgba(255, 255, 255, 0.15)',
  glassPillActive: '#3A3A3C',

  // Neon Apple Fitness Accent Colors
  primary: '#30D158',             // Apple Fitness Neon Green (Workout / Active)
  secondary: '#FF2D55',           // Apple Fitness Neon Red/Pink (Move / Intensity)
  cyan: '#64D2FF',                // Apple Fitness Neon Cyan (Volume / Distance)
  purple: '#BF5AF2',              // Apple Fitness Neon Purple (Reps / Stats)
  yellow: '#FFD60A',              // Apple Fitness Neon Yellow (Streaks / Ranks)
  orange: '#FF9F0C',              // Apple Fitness Neon Orange (Fatigue / Warning)

  warning: '#FF9F0C',
  danger: '#FF453A',              // Apple Red (Deload / Delete)

  // Typography
  textPrimary: '#FFFFFF',         // Crisp White
  textSecondary: '#8E8E93',       // iOS System Muted Grey
  textMuted: '#636366',          // Darker Muted Label Grey

  // Strength Rank Badges (Metallic Apple Tiers)
  rankWood: '#A16207',
  rankIron: '#94A3B8',
  rankBronze: '#D97706',
  rankSilver: '#CBD5E1',
  rankGold: '#FFD60A',
  rankPlatinum: '#64D2FF',
  rankDiamond: '#BF5AF2'
};

// Radius Tokens (shadcn / Apple Squircle standards)
export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 26,
  full: 9999
};

// Typography Font Family Tokens (Apple / Athletic Modernism)
export const fonts = {
  headingBold: 'Outfit_800ExtraBold',
  headingSemiBold: 'Outfit_600SemiBold',
  headingMedium: 'Outfit_500Medium',
  bodyBold: 'PlusJakartaSans_700Bold',
  bodySemiBold: 'PlusJakartaSans_600SemiBold',
  bodyRegular: 'PlusJakartaSans_400Regular'
};

