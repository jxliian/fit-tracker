import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StrengthRankInfo } from '../../domain/strength-ranks';
import { colors } from '@core/theme/colors';

export interface StrengthRankBadgeProps {
  rankInfo: StrengthRankInfo;
  exerciseName?: string;
}

export const StrengthRankBadge: React.FC<StrengthRankBadgeProps> = ({
  rankInfo,
  exerciseName
}) => {
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'WOOD': return colors.rankWood;
      case 'IRON': return colors.rankIron;
      case 'BRONZE': return colors.rankBronze;
      case 'SILVER': return colors.rankSilver;
      case 'GOLD': return colors.rankGold;
      case 'PLATINUM': return colors.rankPlatinum;
      case 'DIAMOND': return colors.rankDiamond;
      default: return colors.primary;
    }
  };

  const badgeColor = getTierColor(rankInfo.tier);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.badgePill, { backgroundColor: badgeColor + '25', borderColor: badgeColor }]}>
          <Text style={[styles.tierText, { color: badgeColor }]}>RANGO {rankInfo.label.toUpperCase()}</Text>
        </View>
        <Text style={styles.percentileText}>Top {100 - rankInfo.percentile}%</Text>
      </View>

      {exerciseName && <Text style={styles.exerciseTitle}>{exerciseName}</Text>}

      <View style={styles.statsRow}>
        <Text style={styles.ratioLabel}>Ratio de Fuerza:</Text>
        <Text style={styles.ratioValue}>{rankInfo.ratio}x Peso Corporal</Text>
      </View>

      {rankInfo.weightNeededForNextTierKg > 0 && (
        <View style={styles.nextTierContainer}>
          <Text style={styles.nextTierText}>
            Subes de rango con <Text style={styles.highlightKg}>+{rankInfo.weightNeededForNextTierKg} kg</Text> en tu 1RM
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 8
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1
  },
  emoji: {
    fontSize: 18,
    marginRight: 6
  },
  tierText: {
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.8
  },
  percentileText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600'
  },
  exerciseTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10
  },
  ratioLabel: {
    color: colors.textMuted,
    fontSize: 14
  },
  ratioValue: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14
  },
  nextTierContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLight
  },
  nextTierText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center'
  },
  highlightKg: {
    color: colors.secondary,
    fontWeight: '700'
  }
});
