# FitTracker Design System Specification (Apple Fitness & shadcn/ui)

## Overview & Architecture

FitTracker follows an **OLED Dark Glass** design system inspired by the native **Apple iOS Fitness App** and standardized using **shadcn/ui** component token methodology.

Key principles:
1. **True OLED Dark Mode**: Pure pitch black `#000000` base for maximum contrast and battery efficiency.
2. **Squircle Widgets**: Rounded containers (`borderRadius: 20-26px`) with subtle neutral borders (`#2C2C2E`) and structured grid layouts.
3. **Neon Metric Accents**: High-contrast, vibrant neon accents for metrics (Pink/Red for volume, Green for active/completion, Cyan for intensity/RPE, Purple for reps/stats).
4. **Glassmorphism Floating Navigation**: Translucent bottom floating navigation bar (`BlurView` with dark tint and frosted glass pill selection state).

---

## Design Tokens (`src/core/theme/colors.ts`)

### Base & Backgrounds (shadcn HSL equivalent)
| Token | Hex Value | Purpose |
| :--- | :--- | :--- |
| `background` | `#000000` | Pure OLED pitch black background |
| `surface` | `#1C1C1E` | Squircle widget container background |
| `surfaceLight` | `#2C2C2E` | Elevated card / active input / glass pill |
| `surfaceBorder` | `#2C2C2E` | Subtle inner card border |
| `border` | `#38383A` | Divider and structural border |

### Neon Accents (Apple Fitness Metrics)
| Token | Hex Value | Metric Usage |
| :--- | :--- | :--- |
| `primary` | `#30D158` | Neon Green (Active Workout / Completion / Success) |
| `secondary` | `#FF2D55` | Neon Pink/Red (Carga Levantada / Volume Target) |
| `cyan` | `#64D2FF` | Neon Cyan (Intensity / RPE / Sets) |
| `purple` | `#BF5AF2` | Neon Purple (Reps / Personal Records) |
| `yellow` | `#FFD60A` | Neon Yellow (Streaks / Ranks) |
| `orange` | `#FF9F0C` | Neon Orange (Warning / Fatigue) |

### Translucent Glass Tokens
| Token | Value | Purpose |
| :--- | :--- | :--- |
| `glassBackground` | `rgba(28, 28, 30, 0.75)` | Translucent backdrop for floating nav |
| `glassBorder` | `rgba(255, 255, 255, 0.15)` | Frosted glass edge reflection |
| `glassPillActive` | `#3A3A3C` | Active tab pill container |

### Corner Radii (`radii`)
- `sm`: `8px` (Chips, inputs)
- `md`: `14px` (Buttons, small widgets)
- `lg`: `20px` (Cards, dialogs)
- `xl`: `26px` (Main Apple Fitness widgets)
- `full`: `9999px` (Pills, badges)

---

## Component Architecture (shadcn/ui Primitives)

All UI components live under `src/components/ui/` and `src/features/*/ui/components/`:

1. **Card** (`src/components/ui/Card.tsx`):
   - Variant `default`: Dark squircle container (`#1C1C1E`).
   - Variant `elevated`: Highlighted container (`#2C2C2E`).
   - Variant `glass`: Translucent backdrop for glassmorphism.
2. **Badge** (`src/components/ui/Badge.tsx`):
   - Neon translucent pills with border and bold label.
3. **Floating Navigation Bar** (`App.tsx`):
   - Uses `expo-blur` `BlurView` floating above bottom edge (`bottom: 30px`).
   - Smooth horizontal swipe gesture pager integrated with tab selection state.

---

## Verification & Compliance

- **TypeScript Type Safety**: 100% compliant with `npx tsc --noEmit`.
- **Unit Tests**: 30/30 unit tests passing in Jest.
- **Expo SDK 54**: Native compatibility verified with Expo Go runtime.
