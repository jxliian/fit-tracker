import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  chartType?: 'line' | 'bar';
  chips?: ChartChip[];
  activeChipId?: string;
  onSelectChip?: (id: string) => void;
  onRemove?: () => void;
}

export const ProgressionChart: React.FC<ProgressionChartProps> = ({
  title,
  unit,
  data,
  color = colors.primary,
  chartType = 'line',
  chips,
  activeChipId,
  onSelectChip,
  onRemove
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

  // Calcular coordenadas de cada punto
  const points = hasData
    ? data.map((d, i) => {
        const x = data.length > 1 ? paddingH + (i * (chartWidth - paddingH * 2)) / (data.length - 1) : chartWidth / 2;
        const range = maxValue > 0 ? maxValue : 1;
        const normalized = Math.max(0.05, d.value / range);
        const y = chartHeight - paddingV - normalized * (chartHeight - paddingV * 2);
        return { x, y, normalized, value: d.value, label: d.label };
      })
    : [];

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons
            name={chartType === 'bar' ? 'bar-chart' : 'stats-chart'}
            size={16}
            color={color}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {hasData && (
          <Text style={[styles.unitText, { color, marginRight: onRemove ? 8 : 0 }]}>
            Máx: {maxValue} {unit}
          </Text>
        )}

        {onRemove && (
          <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
            <Ionicons name="trash-outline" size={16} color="#FF453A" />
          </TouchableOpacity>
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
        <Text style={styles.emptyText}>Sin datos registrados aún.</Text>
      ) : chartType === 'bar' ? (
        /* RENDERIZADO EN MODO BARRAS */
        <View style={{ width: chartWidth, height: chartHeight, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingTop: 20 }}>
          {points.map((pt, idx) => {
            const barHeight = Math.max(12, pt.normalized * (chartHeight - 44));
            const isMax = pt.value === maxValue;
            return (
              <View key={`bar_${idx}`} style={{ alignItems: 'center', flex: 1 }}>
                <Text style={styles.valText}>{pt.value > 0 ? pt.value : ''}</Text>
                <View
                  style={{
                    width: Math.min(28, (chartWidth / (data.length || 1)) * 0.5),
                    height: barHeight,
                    backgroundColor: isMax ? colors.cyan : color,
                    borderRadius: 6,
                    marginVertical: 4,
                    borderWidth: isMax ? 1 : 0,
                    borderColor: '#FFFFFF'
                  }}
                />
                <Text style={styles.labelSub} numberOfLines={1}>
                  {pt.label}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        /* RENDERIZADO EN MODO LÍNEA */
        <View style={{ width: chartWidth, height: chartHeight, position: 'relative' }}>
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

          {points.map((pt, idx) => {
            const isMax = pt.value === maxValue;
            const dotSize = isMax ? 12 : 9;
            return (
              <React.Fragment key={`node_${idx}`}>
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
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary
  },
  unitText: {
    fontSize: 11,
    fontWeight: '700'
  },
  removeBtn: {
    padding: 4,
    marginLeft: 4
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
    marginTop: 12,
    marginBottom: 12,
    textAlign: 'center'
  }
});
