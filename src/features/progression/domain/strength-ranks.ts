import { Sex } from '@domain/entities/user-profile';

export type StrengthRankTier =
  | 'WOOD'
  | 'IRON'
  | 'BRONZE'
  | 'SILVER'
  | 'GOLD'
  | 'PLATINUM'
  | 'DIAMOND';

export interface StrengthRankInfo {
  tier: StrengthRankTier;
  label: string;
  emoji: string;
  ratio: number;
  percentile: number;
  weightNeededForNextTierKg: number;
}

export const STRENGTH_RANK_META: Record<
  StrengthRankTier,
  { label: string; emoji: string; minPercentile: number }
> = {
  WOOD: { label: 'Madera', emoji: '🪵', minPercentile: 15 },
  IRON: { label: 'Hierro', emoji: '⚙️', minPercentile: 35 },
  BRONZE: { label: 'Bronce', emoji: '🥉', minPercentile: 55 },
  SILVER: { label: 'Plata', emoji: '🥈', minPercentile: 75 },
  GOLD: { label: 'Oro', emoji: '🥇', minPercentile: 90 },
  PLATINUM: { label: 'Platino', emoji: '💎', minPercentile: 97 },
  DIAMOND: { label: 'Diamante', emoji: '👑', minPercentile: 99.5 }
};

/**
 * Calcula el rango de fuerza basado en el 1RM estimado, peso corporal y sexo.
 */
export function calculateStrengthRank(
  estimated1RMKg: number,
  bodyWeightKg: number,
  sex: Sex,
  exerciseType: 'compound' | 'isolation' = 'compound'
): StrengthRankInfo {
  if (bodyWeightKg <= 0 || estimated1RMKg <= 0) {
    return {
      tier: 'WOOD',
      label: STRENGTH_RANK_META.WOOD.label,
      emoji: STRENGTH_RANK_META.WOOD.emoji,
      ratio: 0,
      percentile: 10,
      weightNeededForNextTierKg: Math.round(bodyWeightKg * 0.5)
    };
  }

  // Ratio de fuerza sobre peso corporal
  const rawRatio = estimated1RMKg / bodyWeightKg;

  // Ajuste por sexo (las mujeres tienen un promedio de masa muscular ~65-70% respecto a hombres)
  const normalizedRatio = sex === 'female' ? rawRatio * 1.45 : rawRatio;

  // Ajuste por tipo de ejercicio (los aislados mueven menos peso)
  const finalScore = exerciseType === 'isolation' ? normalizedRatio * 2.2 : normalizedRatio;

  let tier: StrengthRankTier = 'WOOD';
  let nextThresholdScore = 0.75;

  if (finalScore >= 2.0) {
    tier = 'DIAMOND';
    nextThresholdScore = 2.5;
  } else if (finalScore >= 1.75) {
    tier = 'PLATINUM';
    nextThresholdScore = 2.0;
  } else if (finalScore >= 1.5) {
    tier = 'GOLD';
    nextThresholdScore = 1.75;
  } else if (finalScore >= 1.25) {
    tier = 'SILVER';
    nextThresholdScore = 1.5;
  } else if (finalScore >= 1.0) {
    tier = 'BRONZE';
    nextThresholdScore = 1.25;
  } else if (finalScore >= 0.75) {
    tier = 'IRON';
    nextThresholdScore = 1.0;
  } else {
    tier = 'WOOD';
    nextThresholdScore = 0.75;
  }

  // Calcular peso exacto en kg necesario para ascender de rango
  const targetNormalizedRatio = nextThresholdScore;
  const targetRawRatio = sex === 'female' ? targetNormalizedRatio / 1.45 : targetNormalizedRatio;
  const targetRawScore = exerciseType === 'isolation' ? targetRawRatio / 2.2 : targetRawRatio;
  const target1RMKg = targetRawScore * bodyWeightKg;
  const weightNeededForNextTierKg = Math.max(0, Math.round((target1RMKg - estimated1RMKg) * 10) / 10);

  const meta = STRENGTH_RANK_META[tier];

  return {
    tier,
    label: meta.label,
    emoji: meta.emoji,
    ratio: Math.round(rawRatio * 100) / 100,
    percentile: meta.minPercentile,
    weightNeededForNextTierKg
  };
}
