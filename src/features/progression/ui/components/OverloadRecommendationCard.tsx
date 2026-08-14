import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ProgressionRecommendation } from '@features/progression/domain/calculators';
import { colors } from '@core/theme/colors';

export interface OverloadRecommendationCardProps {
  recommendation: ProgressionRecommendation;
  onApplyWeight?: (newWeightKg: number) => void;
}

export const OverloadRecommendationCard: React.FC<OverloadRecommendationCardProps> = ({
  recommendation,
  onApplyWeight
}) => {
  const getBannerStyle = () => {
    switch (recommendation.action) {
      case 'INCREMENT':
        return {
          bg: colors.secondary + '18',
          border: colors.secondary,
          titleColor: colors.secondary,
          title: 'Aumentar Carga Recomendada'
        };
      case 'DELOAD':
        return {
          bg: colors.danger + '18',
          border: colors.danger,
          titleColor: colors.danger,
          title: 'Semana de Descarga Programada'
        };
      default:
        return {
          bg: colors.warning + '18',
          border: colors.warning,
          titleColor: colors.warning,
          title: 'Mantener Carga Actual'
        };
    }
  };

  const style = getBannerStyle();

  return (
    <View style={[styles.card, { backgroundColor: style.bg, borderColor: style.border }]}>
      <Text style={[styles.title, { color: style.titleColor }]}>{style.title}</Text>
      
      <Text style={styles.suggestedWeightText}>
        Carga sugerida: <Text style={styles.boldWeight}>{recommendation.recommendedWeightKg} kg</Text>
      </Text>

      <Text style={styles.rationaleText}>{recommendation.reasoning}</Text>

      {onApplyWeight && (
        <TouchableOpacity
          style={[styles.applyButton, { backgroundColor: style.border }]}
          onPress={() => onApplyWeight(recommendation.recommendedWeightKg)}
        >
          <Text style={styles.applyButtonText}>Usar {recommendation.recommendedWeightKg} kg</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    marginVertical: 10
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6
  },
  suggestedWeightText: {
    color: colors.textPrimary,
    fontSize: 15,
    marginVertical: 4
  },
  boldWeight: {
    fontWeight: '800',
    fontSize: 18,
    color: colors.textPrimary
  },
  rationaleText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18
  },
  applyButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center'
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14
  }
});
