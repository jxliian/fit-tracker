import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Vibration } from 'react-native';
import { colors } from '@core/theme/colors';

export interface RestTimerModalProps {
  visible: boolean;
  initialSeconds: number;
  onClose: () => void;
}

export const RestTimerModal: React.FC<RestTimerModalProps> = ({
  visible,
  initialSeconds,
  onClose
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(initialSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(true);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
    setIsRunning(true);
  }, [initialSeconds, visible]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (visible && isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && visible) {
      // Al llegar a 0, hacer vibrar el teléfono
      Vibration.vibrate([0, 500, 200, 500]);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [visible, isRunning, secondsLeft]);

  if (!visible) return null;

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = Math.min(100, Math.max(0, (secondsLeft / initialSeconds) * 100));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>⏱️ Descanso en Progreso</Text>
          
          <Text style={styles.timerText}>{formatTime(secondsLeft)}</Text>

          {/* Barra de progreso de descanso */}
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>

          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setSecondsLeft((prev) => Math.max(0, prev - 15))}
            >
              <Text style={styles.timeButtonText}>-15s</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setIsRunning(!isRunning)}
            >
              <Text style={styles.actionButtonText}>
                {isRunning ? 'Pausar' : 'Reanudar'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setSecondsLeft((prev) => prev + 30)}
            >
              <Text style={styles.timeButtonText}>+30s</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.skipButton} onPress={onClose}>
            <Text style={styles.skipButtonText}>Omitir Descanso</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end'
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16
  },
  timerText: {
    fontSize: 54,
    fontWeight: '800',
    color: colors.primary,
    fontFamily: 'monospace',
    marginVertical: 8
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 16
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 12
  },
  timeButton: {
    backgroundColor: colors.surfaceLight,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  timeButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 14
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15
  },
  skipButton: {
    marginTop: 8,
    paddingVertical: 8
  },
  skipButtonText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600'
  }
});
