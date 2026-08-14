import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { colors } from '@core/theme/colors';

export interface DataPoint {
  label: string;
  value: number;
}

export interface ChartChip {
  id: string;
  label: string;
}

export interface ProgressionChartProps {
  title: string;
  unit: string;
  data: DataPoint[];
  color?: string;
  chips?: ChartChip[];
  activeChipId?: string;
  onSelectChip?: (id: string) => void;
}

export const ProgressionChart: React.FC<ProgressionChartProps> = ({
  title,
  unit,
  data,
  color = colors.primary,
  chips,
  activeChipId,
  onSelectChip
}) => {
  const [chartWidth, setChartWidth] = useState<number>(300);
  const chartHeight = 140;
  const paddingH = 24;
  const paddingV = 28;

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0) {
      setChartWidth(width - 32); // Restar padding del contenedor
    }
  };

  const hasData = data && data.length > 0;
  const maxValue = hasData ? Math.max(...data.map((d) => d.value), 1) : 1;
  const minValue = hasData ? Math.min(...data.map((d) => d.value)) : 0;

  // Calcular coordenadas de cada punto en el canvas 2D
  const points = hasData
    ? data.map((d, i) => {
        const x = data.length > 1 ? paddingH + (i * (chartWidth - paddingH * 2)) / (data.length - 1) : chartWidth / 2;
        const range = maxValue > 0 ? maxValue : 1;
        const normalized = d.value / range;
        const y = chartHeight - paddingV - normalized * (chartHeight - paddingV * 2);
        return { x, y, value: d.value, label: d.label };
      })
    : [];

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {hasData && (
          <Text style={[styles.unitText, { color }]}>
            Máx: {maxValue} {unit}
          </Text>
        )}
      </View>

      {chips && chips.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScrollView}
          contentContainerStyle={styles.chipContentContainer}
        >
          {chips.map((chip) => {
            const isActive = chip.id === activeChipId;
            return (
              <TouchableOpacity
                key={chip.id}
                style={[styles.chip, isActive && { backgroundColor: color, borderColor: color }]}
                activeOpacity={0.7}
                onPress={() => onSelectChip && onSelectChip(chip.id)}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {!hasData ? (
        <Text style={styles.emptyText}>Sin datos registrados para este ejercicio.</Text>
      ) : (
        <View style={{ width: chartWidth, height: chartHeight, position: 'relative' }}>
          {/* Segmentos de Líneas puras en React Native */}
          {points.map((pt, idx) => {
            if (idx === points.length - 1) return null;
            const next = points[idx + 1];
            const dx = next.x - pt.x;
            const dy = next.y - pt.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angleRad = Math.atan2(dy, dx);
            const angleDeg = (angleRad * 180) / Math.PI;

            return (
              <View
                key={`line_${idx}`}
                style={{
                  position: 'absolute',
                  left: pt.x,
                  top: pt.y,
                  width: length,
                  height: 3,
                  backgroundColor: color,
                  borderRadius: 1.5,
                  transformOrigin: '0% 50%',
                  transform: [{ rotate: `${angleDeg}deg` }]
                }}
              />
            );
          })}

          {/* Puntos y valores */}
          {points.map((pt, idx) => {
            const isMax = pt.value === maxValue;
            const dotSize = isMax ? 12 : 9;
            return (
              <React.Fragment key={`node_${idx}`}>
                {/* Punto circular */}
                <View
                  style={{
                    position: 'absolute',
                    left: pt.x - dotSize / 2,
                    top: pt.y - dotSize / 2,
                    width: dotSize,
                    height: dotSize,
                    borderRadius: dotSize / 2,
                    backgroundColor: isMax ? colors.cyan : color,
                    borderWidth: 2,
                    borderColor: '#1C1C1E',
                    zIndex: 10
                  }}
                />

                {/* Valor numérico encima */}
                <View
                  style={{
                    position: 'absolute',
                    left: pt.x - 24,
                    top: Math.max(0, pt.y - 22),
                    width: 48,
                    alignItems: 'center',
                    zIndex: 11
                  }}
                >
                  <Text style={styles.valText}>{pt.value > 0 ? pt.value : ''}</Text>
                </View>

                {/* Fecha debajo */}
                <View
                  style={{
                    position: 'absolute',
                    left: pt.x - 24,
                    bottom: 2,
                    width: 48,
                    alignItems: 'center',
                    zIndex: 11
                  }}
                >
                  <Text style={styles.labelSub} numberOfLines={1}>
                    {pt.label}
                  </Text>
                </View>
              </React.Fragment>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%'
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: 8
  },
  unitText: {
    fontSize: 12,
    fontWeight: '700'
  },
  chipScrollView: {
    marginBottom: 12
  },
  chipContentContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  chip: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 6
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  valText: {
    fontSize: 10,
    color: colors.textPrimary,
    fontWeight: '700'
  },
  labelSub: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500'
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 8,
    textAlign: 'center'
  }
});
