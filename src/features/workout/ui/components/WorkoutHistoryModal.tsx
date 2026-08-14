import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  Modal,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@core/theme/colors';
import { SqliteWorkoutRepository } from '@features/workout/repositories/sqlite-workout-repository';
import { WorkoutSession } from '@domain/entities/workout-session';
import { db } from '@database/client';
import { getLocalizedExerciseName } from '@domain/entities/exercise';

const fonts = {
  headingBold: 'System',
  bodyBold: 'System',
  bodySemiBold: 'System',
  bodyRegular: 'System'
};

const radii = {
  sm: 6,
  md: 12,
  xl: 20
};

export interface WorkoutHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  lang: 'es' | 'en';
  filterDateMs?: number | null;
}

interface EditableSet {
  id: string;
  sessionId: string;
  exerciseId: string;
  setOrder: number;
  weightKg: string;
  reps: string;
  rpe: string;
  isWarmup: boolean;
  estimated1RM: number;
}

interface SessionDetail extends Omit<WorkoutSession, 'sets'> {
  sets: EditableSet[];
  totalVolume: number;
}

interface RoutineItem {
  id: string;
  name: string;
  description: string;
}

interface CatalogExercise {
  id: string;
  name: string;
  category: string;
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

  // Modales secundarios
  const [showAddRoutineModal, setShowAddRoutineModal] = useState<boolean>(false);
  const [routinesList, setRoutinesList] = useState<RoutineItem[]>([]);
  
  const [showExercisePickerSessionId, setShowExercisePickerSessionId] = useState<string | null>(null);
  const [catalogExercises, setCatalogExercises] = useState<CatalogExercise[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState<string>('');

  const workoutRepo = new SqliteWorkoutRepository();

  useEffect(() => {
    if (visible) {
      loadHistory();
      loadRoutines();
    }
  }, [visible, filterDateMs]);

  const loadRoutines = async () => {
    try {
      const rows = await db.getAllAsync<RoutineItem>('SELECT id, name, description FROM routines;');
      setRoutinesList(rows);
    } catch (e) {
      console.error('Error loading routines:', e);
    }
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const allEx = await db.getAllAsync<{ id: string; name: string }>('SELECT id, name FROM exercises;');
      const nameMap: Record<string, string> = {};
      allEx.forEach((e) => {
        nameMap[e.id] = getLocalizedExerciseName(e.name, lang);
      });
      setExerciseNamesMap(nameMap);

      const allSessions = await workoutRepo.getAllSessions();
      const detailed: SessionDetail[] = [];

      for (const s of allSessions) {
        if (filterDateMs) {
          const sDate = new Date(s.date);
          const fDate = new Date(filterDateMs);
          const isSameDay =
            sDate.getFullYear() === fDate.getFullYear() &&
            sDate.getMonth() === fDate.getMonth() &&
            sDate.getDate() === fDate.getDate();
          if (!isSameDay) continue;
        }

        const rawSets = await workoutRepo.getSetsForSession(s.id);
        const editableSets: EditableSet[] = rawSets.map((st) => ({
          id: st.id,
          sessionId: st.sessionId,
          exerciseId: st.exerciseId,
          setOrder: st.setOrder,
          weightKg: String(st.weightKg),
          reps: String(st.reps),
          rpe: String(st.rpe),
          isWarmup: Boolean(st.isWarmup),
          estimated1RM: st.estimated1RM
        }));

        const totalVolume = editableSets.reduce(
          (sum, st) => sum + (st.isWarmup ? 0 : (Number(st.weightKg) || 0) * (Number(st.reps) || 0)),
          0
        );

        detailed.push({
          ...s,
          sets: editableSets,
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

  // --- ELIMINAR SESIÓN COMPLETA ---
  const handleDeleteSession = (sessionId: string) => {
    Alert.alert(
      lang === 'es' ? 'Eliminar Entrenamiento' : 'Delete Workout',
      lang === 'es' ? '¿Deseas eliminar este entrenamiento completo? Esta acción no se puede deshacer.' : 'Delete this workout session? This cannot be undone.',
      [
        { text: lang === 'es' ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: lang === 'es' ? 'Eliminar' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.runAsync('DELETE FROM exercise_sets WHERE session_id = ?;', [sessionId]);
              await db.runAsync('DELETE FROM workout_sessions WHERE id = ?;', [sessionId]);
              loadHistory();
            } catch (err) {
              console.error('Error deleting session:', err);
            }
          }
        }
      ]
    );
  };

  // --- ACTUALIZAR VALORES DE UN SET EN ESTADO LOCAL ---
  const handleUpdateSetLocal = (sessionId: string, setId: string, field: keyof EditableSet, val: any) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        const updatedSets = s.sets.map((st) => {
          if (st.id !== setId) return st;
          return { ...st, [field]: val };
        });

        const newVol = updatedSets.reduce(
          (sum, st) => sum + (st.isWarmup ? 0 : (Number(st.weightKg) || 0) * (Number(st.reps) || 0)),
          0
        );

        return { ...s, sets: updatedSets, totalVolume: newVol };
      })
    );
  };

  // --- GUARDAR CAMBIOS EN BASE DE DATOS SQLITE ---
  const handleSaveSessionEdits = async (session: SessionDetail) => {
    try {
      for (const st of session.sets) {
        const weight = Number(st.weightKg) || 0;
        const reps = Number(st.reps) || 0;
        const rpe = Number(st.rpe) || 8.0;
        const est1RM = Math.round(weight * (1 + reps / 30) * 10) / 10;

        await db.runAsync(
          `UPDATE exercise_sets SET weight_kg = ?, reps = ?, rpe = ?, is_warmup = ?, estimated_1rm = ? WHERE id = ?;`,
          [weight, reps, rpe, st.isWarmup ? 1 : 0, est1RM || 0, st.id]
        );
      }
      Alert.alert(
        lang === 'es' ? 'Éxito' : 'Success',
        lang === 'es' ? 'Entrenamiento guardado y actualizado.' : 'Workout updated successfully.'
      );
      loadHistory();
    } catch (err) {
      console.error('Error saving session edits:', err);
      Alert.alert('Error', 'No se pudieron guardar los cambios.');
    }
  };

  // --- AÑADIR SERIE A UN EJERCICIO DE LA SESIÓN ---
  const handleAddSetToExercise = async (sessionId: string, exerciseId: string, currentCount: number) => {
    try {
      const newSetId = `set_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await db.runAsync(
        `INSERT INTO exercise_sets (id, session_id, exercise_id, set_order, weight_kg, reps, rpe, is_warmup, estimated_1rm, rest_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [newSetId, sessionId, exerciseId, currentCount + 1, 60, 10, 8.0, 0, 80, 90]
      );
      loadHistory();
    } catch (err) {
      console.error('Error adding set:', err);
    }
  };

  // --- ELIMINAR SERIE INDIVIDUAL ---
  const handleDeleteSet = async (setId: string) => {
    try {
      await db.runAsync('DELETE FROM exercise_sets WHERE id = ?;', [setId]);
      loadHistory();
    } catch (err) {
      console.error('Error deleting set:', err);
    }
  };

  // --- AÑADIR EJERCICIO A SESIÓN PASADA ---
  const handleOpenExercisePicker = async (sessionId: string) => {
    try {
      const rows = await db.getAllAsync<CatalogExercise>('SELECT id, name, category FROM exercises ORDER BY name ASC;');
      setCatalogExercises(rows);
      setShowExercisePickerSessionId(sessionId);
    } catch (e) {
      console.error('Error loading exercises catalog:', e);
    }
  };

  const handleSelectExerciseForSession = async (ex: CatalogExercise) => {
    if (!showExercisePickerSessionId) return;
    const sessionId = showExercisePickerSessionId;
    setShowExercisePickerSessionId(null);

    try {
      const newSetId = `set_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await db.runAsync(
        `INSERT INTO exercise_sets (id, session_id, exercise_id, set_order, weight_kg, reps, rpe, is_warmup, estimated_1rm, rest_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [newSetId, sessionId, ex.id, 1, 50, 10, 8.0, 0, 66.6, 90]
      );
      loadHistory();
    } catch (err) {
      console.error('Error adding exercise to session:', err);
    }
  };

  // --- AÑADIR ENTRENAMIENTO COMPLETO AL DÍA SELECCIONADO ---
  const handleCreateWorkoutForDate = async (routine?: RoutineItem) => {
    setShowAddRoutineModal(false);
    const targetDateMs = filterDateMs || Date.now();
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const sessionName = routine ? routine.name : (lang === 'es' ? 'Entrenamiento Personalizado' : 'Custom Workout');

    try {
      // 1. Crear la sesión en la fecha elegida
      await db.runAsync(
        `INSERT INTO workout_sessions (id, date, duration_seconds, notes, name) VALUES (?, ?, ?, ?, ?);`,
        [newSessionId, targetDateMs, 2700, 'Sesión registrada', sessionName]
      );

      // 2. Si viene de una rutina existente, traer los ejercicios de esa rutina
      if (routine) {
        const routineExs = await db.getAllAsync<{ exercise_id: string }>(
          `SELECT exercise_id FROM routine_exercises WHERE routine_id = ? ORDER BY exercise_order ASC;`,
          [routine.id]
        );

        let setCounter = 1;
        for (const exItem of routineExs) {
          for (let sIdx = 1; sIdx <= 3; sIdx++) {
            const setId = `set_${Date.now()}_${setCounter++}`;
            await db.runAsync(
              `INSERT INTO exercise_sets (id, session_id, exercise_id, set_order, weight_kg, reps, rpe, is_warmup, estimated_1rm, rest_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
              [setId, newSessionId, exItem.exercise_id, sIdx, 60, 10, 8.0, sIdx === 1 ? 1 : 0, 80, 90]
            );
          }
        }
      } else {
        // Ejercicio por defecto (Sentadilla Libre)
        const setId = `set_${Date.now()}_1`;
        await db.runAsync(
          `INSERT INTO exercise_sets (id, session_id, exercise_id, set_order, weight_kg, reps, rpe, is_warmup, estimated_1rm, rest_seconds) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [setId, newSessionId, 'barbell-squat', 1, 70, 8, 8.0, 0, 88.6, 90]
        );
      }

      loadHistory();
      setExpandedSessionId(newSessionId);
    } catch (err) {
      console.error('Error creating workout session for date:', err);
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
    addWorkoutBtn: lang === 'es' ? '+ Añadir Entrenamiento a este Día' : '+ Add Workout to this Day',
    saveBtn: lang === 'es' ? '💾 Guardar Cambios' : '💾 Save Changes',
    addSetBtn: lang === 'es' ? '+ Añadir Serie' : '+ Add Set',
    addExerciseBtn: lang === 'es' ? '+ Añadir Ejercicio' : '+ Add Exercise'
  };

  const filteredCatalog = catalogExercises.filter((ex) =>
    ex.name.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Cabecera del Modal */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { flex: 1 }]} numberOfLines={1}>
          {t.title}
        </Text>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportData} activeOpacity={0.7}>
          <Ionicons name="download-outline" size={15} color={colors.primary} />
          <Text style={styles.exportText}>{t.export}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
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
            const groupedSetsMap = new Map<string, EditableSet[]>();
            s.sets.forEach((st) => {
              const exName = exerciseNamesMap[st.exerciseId] || st.exerciseId;
              if (!groupedSetsMap.has(exName)) {
                groupedSetsMap.set(exName, []);
              }
              groupedSetsMap.get(exName)!.push(st);
            });

            return (
              <View key={s.id} style={styles.sessionCard}>
                {/* Cabecera de Sesión: Título, Métricas y Botón Eliminar */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setExpandedSessionId(isExpanded ? null : s.id)}
                  style={styles.sessionHeaderBlock}
                >
                  <View style={styles.sessionTitleRow}>
                    <Text style={styles.sessionName} numberOfLines={1}>
                      {s.name && s.name !== 'Entrenamiento Libre' ? s.name : dateFormatted}
                    </Text>
                    <TouchableOpacity
                      style={styles.deleteSessionBtn}
                      onPress={() => handleDeleteSession(s.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.sessionMetaSubRow}>
                    {s.name && s.name !== 'Entrenamiento Libre' && (
                      <Text style={styles.sessionDate}>{dateFormatted}</Text>
                    )}
                    <View style={styles.metaBadgeRow}>
                      <View style={styles.badgePill}>
                        <Text style={styles.badgePillTxt}>
                          {s.sets.length} {t.setsLabel}
                        </Text>
                      </View>
                      <View style={[styles.badgePill, styles.badgePillPrimary]}>
                        <Text style={[styles.badgePillTxt, { color: colors.primary }]}>
                          {s.totalVolume.toLocaleString()} KG TOTAL
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Vista Detallada Completa Editable */}
                {isExpanded && (
                  <View style={styles.expandedDetails}>
                    <View style={styles.divider} />

                    {Array.from(groupedSetsMap.entries()).map(([exName, setsList]) => {
                      const exId = setsList[0]?.exerciseId;
                      return (
                        <View key={exName} style={styles.exerciseGroupBlock}>
                          <View style={styles.exerciseTitleRow}>
                            <Ionicons name="barbell-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                            <Text style={styles.exerciseGroupTitle}>{exName}</Text>
                          </View>

                          {/* Encabezado de columnas */}
                          <View style={styles.setColHeaderRow}>
                            <Text style={[styles.setColLabel, { width: 24 }]}>#</Text>
                            <Text style={[styles.setColLabel, { flex: 1 }]}>PESO (KG)</Text>
                            <Text style={[styles.setColLabel, { flex: 1 }]}>REPS</Text>
                            <Text style={[styles.setColLabel, { width: 40 }]}>RPE</Text>
                            <Text style={[styles.setColLabel, { width: 70, textAlign: 'center' }]}>TIPO</Text>
                            <Text style={{ width: 24 }} />
                          </View>

                          {/* Lista de Series Editables */}
                          {setsList.map((st, idx) => (
                            <View key={st.id || idx} style={styles.editableSetRow}>
                              <Text style={styles.setOrderNum}>{st.setOrder}</Text>

                              {/* Input Peso */}
                              <TextInput
                                style={[styles.setInput, { flex: 1 }]}
                                keyboardType="numeric"
                                value={st.weightKg}
                                onChangeText={(txt) => handleUpdateSetLocal(s.id, st.id, 'weightKg', txt)}
                              />

                              {/* Input Reps */}
                              <TextInput
                                style={[styles.setInput, { flex: 1 }]}
                                keyboardType="numeric"
                                value={st.reps}
                                onChangeText={(txt) => handleUpdateSetLocal(s.id, st.id, 'reps', txt)}
                              />

                              {/* Input RPE */}
                              <TextInput
                                style={[styles.setInput, { width: 40 }]}
                                keyboardType="numeric"
                                value={st.rpe}
                                onChangeText={(txt) => handleUpdateSetLocal(s.id, st.id, 'rpe', txt)}
                              />

                              {/* Insignia Tipo de Serie */}
                              <TouchableOpacity
                                style={[styles.setKindChip, st.isWarmup ? styles.setKindWarmup : styles.setKindEffective]}
                                onPress={() => handleUpdateSetLocal(s.id, st.id, 'isWarmup', !st.isWarmup)}
                              >
                                <Text style={[styles.setKindText, st.isWarmup ? styles.setKindTextWarmup : styles.setKindTextEffective]}>
                                  {st.isWarmup ? 'Calent.' : 'Efectiva'}
                                </Text>
                              </TouchableOpacity>

                              {/* Botón Borrar Serie */}
                              <TouchableOpacity style={styles.deleteSetBtn} onPress={() => handleDeleteSet(st.id)}>
                                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                              </TouchableOpacity>
                            </View>
                          ))}

                          {/* Botón Añadir Serie a este Ejercicio */}
                          <TouchableOpacity
                            style={styles.addSetSubBtn}
                            onPress={() => handleAddSetToExercise(s.id, exId, setsList.length)}
                          >
                            <Ionicons name="add" size={14} color={colors.primary} />
                            <Text style={styles.addSetSubBtnText}>{t.addSetBtn}</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}

                    {/* Botón Añadir Nuevo Ejercicio a esta Sesión */}
                    <TouchableOpacity
                      style={styles.addExerciseSubBtn}
                      onPress={() => handleOpenExercisePicker(s.id)}
                    >
                      <Ionicons name="add-circle-outline" size={16} color={colors.cyan} />
                      <Text style={styles.addExerciseSubBtnText}>{t.addExerciseBtn}</Text>
                    </TouchableOpacity>

                    {/* Botón Guardar Cambios en SQLite */}
                    <TouchableOpacity style={styles.saveSessionBtn} onPress={() => handleSaveSessionEdits(s)}>
                      <Text style={styles.saveSessionBtnText}>{t.saveBtn}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* BOTÓN INFERIOR: Añadir Entrenamiento al Día */}
      <TouchableOpacity style={styles.addWorkoutMainBtn} onPress={() => setShowAddRoutineModal(true)}>
        <Ionicons name="add-circle" size={20} color="#FFFFFF" />
        <Text style={styles.addWorkoutMainBtnText}>{t.addWorkoutBtn}</Text>
      </TouchableOpacity>

      {/* MODAL 1: SELECTOR DE RUTINAS PARA EL DÍA */}
      <Modal visible={showAddRoutineModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentBox}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                {lang === 'es' ? 'Seleccionar Entrenamiento' : 'Select Workout'}
              </Text>
              <TouchableOpacity onPress={() => setShowAddRoutineModal(false)}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              {/* Opción Entrenamiento Personalizado */}
              <TouchableOpacity style={styles.routineOptionCard} onPress={() => handleCreateWorkoutForDate()}>
                <Ionicons name="fitness-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.routineOptionTitle}>
                    {lang === 'es' ? 'Entrenamiento Personalizado' : 'Custom Workout'}
                  </Text>
                  <Text style={styles.routineOptionSub}>
                    {lang === 'es' ? 'Crear sesión vacía y añadir ejercicios manualmente' : 'Create empty session and customize'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Rutinas preexistentes creadas por el usuario */}
              {routinesList.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={styles.routineOptionCard}
                  onPress={() => handleCreateWorkoutForDate(r)}
                >
                  <Ionicons name="barbell-outline" size={20} color={colors.cyan} style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.routineOptionTitle}>{r.name}</Text>
                    <Text style={styles.routineOptionSub} numberOfLines={1}>
                      {r.description || 'Rutina guardada'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: CATÁLOGO DE EJERCICIOS PARA AÑADIR A LA SESIÓN */}
      <Modal visible={Boolean(showExercisePickerSessionId)} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentBox}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                {lang === 'es' ? 'Añadir Ejercicio' : 'Add Exercise'}
              </Text>
              <TouchableOpacity onPress={() => setShowExercisePickerSessionId(null)}>
                <Ionicons name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder={lang === 'es' ? 'Buscar ejercicio...' : 'Search exercise...'}
              placeholderTextColor={colors.textMuted}
              value={exerciseSearch}
              onChangeText={setExerciseSearch}
            />

            <FlatList
              data={filteredCatalog}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.catalogItem}
                  onPress={() => handleSelectExerciseForSession(item)}
                >
                  <Text style={styles.catalogItemName}>{item.name}</Text>
                  <Text style={styles.catalogItemCat}>{item.category.toUpperCase()}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
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
    fontFamily: fonts.headingBold,
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
    fontFamily: fonts.bodyBold,
    color: colors.primary,
    marginLeft: 6
  },
  emptyTxt: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: 20,
    fontFamily: fonts.bodyRegular
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
  sessionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  sessionName: {
    flex: 1,
    fontSize: 16,
    fontFamily: fonts.headingBold,
    color: colors.textPrimary,
    marginRight: 8
  },
  deleteSessionBtn: {
    padding: 4
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
    fontFamily: fonts.bodySemiBold
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
    fontFamily: fonts.bodyBold,
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
    fontFamily: fonts.headingBold,
    color: colors.primary
  },
  setColHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 2
  },
  setColLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 10
  },
  editableSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  setOrderNum: {
    width: 24,
    color: colors.textSecondary,
    fontFamily: fonts.bodyBold,
    fontSize: 12
  },
  setInput: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.sm,
    color: colors.textPrimary,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginRight: 6,
    textAlign: 'center'
  },
  setKindChip: {
    width: 70,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center'
  },
  setKindWarmup: {
    backgroundColor: 'rgba(255, 149, 0, 0.18)',
    borderColor: '#FF9500'
  },
  setKindEffective: {
    backgroundColor: 'rgba(48, 209, 88, 0.18)',
    borderColor: '#30D158'
  },
  setKindText: {
    fontSize: 9,
    fontFamily: fonts.bodyBold
  },
  setKindTextWarmup: {
    color: '#FF9500'
  },
  setKindTextEffective: {
    color: '#30D158'
  },
  deleteSetBtn: {
    padding: 2
  },
  addSetSubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6
  },
  addSetSubBtnText: {
    color: colors.primary,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    marginLeft: 4
  },
  addExerciseSubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: colors.cyan + '18',
    borderColor: colors.cyan + '40',
    borderWidth: 1,
    borderRadius: radii.md,
    marginBottom: 10
  },
  addExerciseSubBtnText: {
    color: colors.cyan,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    marginLeft: 6
  },
  saveSessionBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: radii.md,
    alignItems: 'center',
    marginTop: 4
  },
  saveSessionBtnText: {
    color: '#FFFFFF',
    fontFamily: fonts.headingBold,
    fontSize: 14
  },
  addWorkoutMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    paddingVertical: 12,
    marginTop: 10
  },
  addWorkoutMainBtnText: {
    color: '#FFFFFF',
    fontFamily: fonts.headingBold,
    fontSize: 14,
    marginLeft: 8
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end'
  },
  modalContentBox: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: 20,
    maxHeight: '80%'
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  modalTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.headingBold,
    fontSize: 18
  },
  routineOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 10
  },
  routineOptionTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.headingBold,
    fontSize: 14
  },
  routineOptionSub: {
    color: colors.textSecondary,
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    marginTop: 2
  },
  searchInput: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    color: colors.textPrimary,
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12
  },
  catalogItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  catalogItemName: {
    color: colors.textPrimary,
    fontFamily: fonts.headingBold,
    fontSize: 14
  },
  catalogItemCat: {
    color: colors.textSecondary,
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    marginTop: 2
  }
});
