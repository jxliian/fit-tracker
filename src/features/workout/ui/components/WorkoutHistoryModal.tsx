import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@core/theme/colors';
import { SqliteWorkoutRepository } from '@features/workout/repositories/sqlite-workout-repository';
import { WorkoutSession } from '@domain/entities/workout-session';
import { ExerciseSet } from '@domain/entities/exercise-set';
import { db } from '@database/client';
import { getLocalizedExerciseName } from '@domain/entities/exercise';

export interface WorkoutHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  lang: 'es' | 'en';
  filterDateMs?: number | null;
}

interface SessionDetail extends WorkoutSession {
  sets: ExerciseSet[];
  totalVolume: number;
}

export const WorkoutHistoryModal: React.FC<WorkoutHistoryModalProps> = ({
  visible,
  onClose,
  lang,
  filterDateMs
}) => {
  const [sessions, setSessions] = useState<SessionDetail[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [exerciseNamesMap, setExerciseNamesMap] = useState<Record<string, string>>({});

  const workoutRepo = new SqliteWorkoutRepository();

  useEffect(() => {
    if (visible) {
      loadHistory();
    }
  }, [visible, filterDateMs]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      // Cargar nombres de ejercicios
      const allEx = await db.getAllAsync<{ id: string; name: string }>(
        'SELECT id, name FROM exercises;'
      );
      const nameMap: Record<string, string> = {};
      allEx.forEach((e) => {
        nameMap[e.id] = getLocalizedExerciseName(e.name, lang);
      });
      setExerciseNamesMap(nameMap);

      const allSessions = await workoutRepo.getAllSessions();
      const detailed: SessionDetail[] = [];

      for (const s of allSessions) {
        // Si hay un filtro por día específico del calendario
        if (filterDateMs) {
          const sDate = new Date(s.date);
          const fDate = new Date(filterDateMs);
          const isSameDay =
            sDate.getFullYear() === fDate.getFullYear() &&
            sDate.getMonth() === fDate.getMonth() &&
            sDate.getDate() === fDate.getDate();
          if (!isSameDay) continue;
        }

        const sets = await workoutRepo.getSetsForSession(s.id);
        const totalVolume = sets.reduce((sum, st) => sum + (st.isWarmup ? 0 : st.weightKg * st.reps), 0);
        detailed.push({
          ...s,
          sets,
          totalVolume
        });
      }

      setSessions(detailed);
      if (filterDateMs && detailed.length > 0) {
        setExpandedSessionId(detailed[0].id);
      }
    } catch (e) {
      console.error('Error loading workout history', e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const jsonString = JSON.stringify(sessions, null, 2);
      await Share.share({
        message: jsonString,
        title: 'FitTracker Workout History Backup'
      });
    } catch (error) {
      Alert.alert('Export Error', 'Could not export workout history.');
    }
  };

  if (!visible) return null;

  const t = {
    title: filterDateMs
      ? (lang === 'es' ? 'Entrenamiento del Día' : 'Day Workout Detail')
      : (lang === 'es' ? 'Historial de Entrenamientos' : 'Workout History'),
    noSessions: lang === 'es' ? 'No hay entrenamientos registrados para este día.' : 'No workouts recorded for this day.',
    export: 'JSON',
    setsLabel: lang === 'es' ? 'Series' : 'Sets',
    volLabel: lang === 'es' ? 'Volumen' : 'Volume',
    close: lang === 'es' ? 'Cerrar' : 'Close'
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { flex: 1 }]} numberOfLines={1}>{t.title}</Text>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportData} activeOpacity={0.7}>
          <Ionicons name="download-outline" size={15} color={colors.primary} />
          <Text style={styles.exportText}>{t.export}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
        {sessions.length === 0 ? (
          <Text style={styles.emptyTxt}>{t.noSessions}</Text>
        ) : (
          sessions.map((s) => {
            const isExpanded = expandedSessionId === s.id;
            const dateFormatted = new Date(s.date).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
              weekday: 'short',
              day: 'numeric',
              month: 'short'
            });

            // Agrupar series por ejercicio
            const groupedSetsMap = new Map<string, ExerciseSet[]>();
            s.sets.forEach((st) => {
              const exName = exerciseNamesMap[st.exerciseId] || st.exerciseId;
              if (!groupedSetsMap.has(exName)) {
                groupedSetsMap.set(exName, []);
              }
              groupedSetsMap.get(exName)!.push(st);
            });

            return (
              <TouchableOpacity
                key={s.id}
                style={styles.sessionCard}
                activeOpacity={0.8}
                onPress={() => setExpandedSessionId(isExpanded ? null : s.id)}
              >
                {/* Cabecera del Día: Título arriba, fecha y métricas abajo */}
                <View style={styles.sessionHeaderBlock}>
                  <Text style={styles.sessionName}>
                    {s.name && s.name !== 'Entrenamiento Libre' ? s.name : dateFormatted}
                  </Text>
                  <View style={styles.sessionMetaSubRow}>
                    {s.name && s.name !== 'Entrenamiento Libre' && (
                      <Text style={styles.sessionDate}>{dateFormatted}</Text>
                    )}
                    <View style={styles.metaBadgeRow}>
                      <View style={styles.badgePill}>
                        <Text style={styles.badgePillTxt}>{s.sets.length} {t.setsLabel}</Text>
                      </View>
                      <View style={[styles.badgePill, styles.badgePillPrimary]}>
                        <Text style={[styles.badgePillTxt, { color: colors.primary }]}>
                          {s.totalVolume.toLocaleString()} KG TOTAL
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {isExpanded && (
                  <View style={styles.expandedDetails}>
                    <View style={styles.divider} />
                    {Array.from(groupedSetsMap.entries()).map(([exName, setsList]) => (
                      <View key={exName} style={styles.exerciseGroupBlock}>
                        <View style={styles.exerciseTitleRow}>
                          <Ionicons name="barbell-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                          <Text style={styles.exerciseGroupTitle}>{exName}</Text>
                        </View>

                        {setsList.map((st, idx) => (
                          <View key={st.id || idx} style={styles.setRow}>
                            <Text style={styles.setTxt}>
                              {lang === 'es' ? 'Serie' : 'Set'} {st.setOrder}: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{st.weightKg} kg × {st.reps} reps</Text> (RPE {st.rpe})
                            </Text>
                            <Text style={styles.rm1Txt}>1RM: {st.estimated1RM} kg</Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%'
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: 12
  },
  exportText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 6
  },
  emptyTxt: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: 20
  },
  sessionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12
  },
  sessionHeaderBlock: {
    flexDirection: 'column'
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8
  },
  sessionMetaSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  sessionDate: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600'
  },
  metaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  badgePill: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginLeft: 6
  },
  badgePillPrimary: {
    backgroundColor: colors.primary + '18',
    borderColor: colors.primary + '40'
  },
  badgePillTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary
  },
  expandedDetails: {
    marginTop: 12
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 12
  },
  exerciseGroupBlock: {
    marginBottom: 12,
    backgroundColor: colors.surfaceLight + '40',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border + '40'
  },
  exerciseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  exerciseGroupTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4
  },
  setTxt: {
    fontSize: 13,
    color: colors.textSecondary
  },
  rm1Txt: {
    fontSize: 12,
    color: colors.cyan,
    fontWeight: '700'
  }
});
