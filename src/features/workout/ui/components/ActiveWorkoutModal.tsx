import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, fonts } from '@core/theme/colors';
import { RestTimerModal } from './RestTimerModal';
import { db } from '@database/client';
import { SqliteWorkoutRepository } from '../../repositories/sqlite-workout-repository';
import { SqliteExerciseRepository } from '../../repositories/sqlite-exercise-repository';
import { GetProgressionRecommendationUseCase } from '@features/progression/use-cases/get-progression-recommendation';
import { ProgressionRecommendation } from '@features/progression/domain/calculators';

export interface ExerciseItemInWorkout {
  exerciseId: string;
  exerciseName: string;
  category: string;
  recommendation?: ProgressionRecommendation;
  sets: {
    id: string;
    setOrder: number;
    weightKg: string;
    reps: string;
    rpe: string;
    isWarmup: boolean;
    isCompleted: boolean;
  }[];
}

export interface ActiveWorkoutModalProps {
  visible: boolean;
  workoutName: string;
  initialExercises?: { exerciseId: string; exerciseName: string; category: string }[];
  onClose: () => void;
  onFinish: () => void;
}

export const ActiveWorkoutModal: React.FC<ActiveWorkoutModalProps> = ({
  visible,
  workoutName,
  initialExercises = [],
  onClose,
  onFinish
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [exercisesInWorkout, setExercisesInWorkout] = useState<ExerciseItemInWorkout[]>([]);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restDuration, setRestDuration] = useState(90);

  // Selector de ejercicio adicional
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [catalogExercises, setCatalogExercises] = useState<{ id: string; name: string; category: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const workoutRepo = new SqliteWorkoutRepository();
  const exerciseRepo = new SqliteExerciseRepository();
  const getRecommendation = new GetProgressionRecommendationUseCase(workoutRepo, exerciseRepo);

  // Cronómetro del entrenamiento
  useEffect(() => {
    let timer: any = null;
    if (visible) {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [visible]);

  // Cargar ejercicios iniciales y sus recomendaciones
  useEffect(() => {
    if (visible) {
      loadInitialExercises();
    }
  }, [visible, initialExercises]);

  const loadInitialExercises = async () => {
    const list: ExerciseItemInWorkout[] = [];

    for (const item of initialExercises) {
      let rec: ProgressionRecommendation | undefined = undefined;
      try {
        rec = await getRecommendation.execute({ exerciseId: item.exerciseId });
      } catch (err) {
        // Sin historial previo
      }

      list.push({
        exerciseId: item.exerciseId,
        exerciseName: item.exerciseName,
        category: item.category,
        recommendation: rec,
        sets: [
          {
            id: `set_${Date.now()}_1`,
            setOrder: 1,
            weightKg: rec?.recommendedWeightKg ? String(rec.recommendedWeightKg) : '',
            reps: rec?.recommendedReps ? String(rec.recommendedReps) : '',
            rpe: '8.0',
            isWarmup: false,
            isCompleted: false
          }
        ]
      });
    }

    setExercisesInWorkout(list);
  };

  // Cargar catálogo de ejercicios para el selector
  const loadCatalogExercises = async () => {
    try {
      const rows = await db.getAllAsync<{ id: string; name: string; category: string }>(
        `SELECT id, name, category FROM exercises ORDER BY name ASC;`
      );
      setCatalogExercises(rows);
    } catch (error) {
      console.error('Error cargando catálogo:', error);
    }
  };

  const handleOpenPicker = () => {
    loadCatalogExercises();
    setShowExercisePicker(true);
  };

  const handleAddExerciseFromPicker = async (ex: { id: string; name: string; category: string }) => {
    setShowExercisePicker(false);
    let rec: ProgressionRecommendation | undefined = undefined;
    try {
      rec = await getRecommendation.execute({ exerciseId: ex.id });
    } catch (err) {}

    setExercisesInWorkout((prev) => [
      ...prev,
      {
        exerciseId: ex.id,
        exerciseName: ex.name,
        category: ex.category,
        recommendation: rec,
        sets: [
          {
            id: `set_${Date.now()}_1`,
            setOrder: 1,
            weightKg: rec?.recommendedWeightKg ? String(rec.recommendedWeightKg) : '',
            reps: rec?.recommendedReps ? String(rec.recommendedReps) : '',
            rpe: '8.0',
            isWarmup: false,
            isCompleted: false
          }
        ]
      }
    ]);
  };

  const handleAddSet = (exerciseIndex: number) => {
    setExercisesInWorkout((prev) => {
      const updated = [...prev];
      const targetEx = { ...updated[exerciseIndex] };
      const lastSet = targetEx.sets[targetEx.sets.length - 1];

      const newSetOrder = targetEx.sets.length + 1;
      targetEx.sets = [
        ...targetEx.sets,
        {
          id: `set_${Date.now()}_${newSetOrder}`,
          setOrder: newSetOrder,
          weightKg: lastSet ? lastSet.weightKg : '',
          reps: lastSet ? lastSet.reps : '',
          rpe: lastSet ? lastSet.rpe : '8.0',
          isWarmup: false,
          isCompleted: false
        }
      ];

      updated[exerciseIndex] = targetEx;
      return updated;
    });
  };

  const handleUpdateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: 'weightKg' | 'reps' | 'rpe' | 'isWarmup' | 'isCompleted',
    val: any
  ) => {
    setExercisesInWorkout((prev) => {
      const updated = [...prev];
      const targetEx = { ...updated[exerciseIndex] };
      const targetSet = { ...targetEx.sets[setIndex], [field]: val };

      // Si se marca como completada y antes no lo estaba, activar temporizador
      if (field === 'isCompleted' && val === true && !targetEx.sets[setIndex].isCompleted) {
        setShowRestTimer(true);
      }

      targetEx.sets[setIndex] = targetSet;
      updated[exerciseIndex] = targetEx;
      return updated;
    });
  };

  const handleFinishWorkout = async () => {
    // Validar si hay al menos una serie completada
    let totalCompletedSets = 0;
    exercisesInWorkout.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.isCompleted && parseFloat(s.weightKg) > 0 && parseInt(s.reps, 10) > 0) {
          totalCompletedSets++;
        }
      });
    });

    if (totalCompletedSets === 0) {
      Alert.alert(
        'Entrenamiento Vacío',
        'Por favor completa al menos 1 serie introduciendo Peso y Repeticiones antes de finalizar.'
      );
      return;
    }

    try {
      // 1. Crear sesión en SQLite
      const createdSession = await workoutRepo.createSession({
        name: workoutName || 'Entrenamiento Libre',
        date: Date.now(),
        notes: `Duración: ${formatTimer(elapsedSeconds)}`
      });

      // 2. Insertar cada serie completada
      for (const ex of exercisesInWorkout) {
        let order = 1;
        for (const s of ex.sets) {
          if (s.isCompleted && parseFloat(s.weightKg) > 0 && parseInt(s.reps, 10) > 0) {
            await workoutRepo.addSetToSession({
              sessionId: createdSession.id,
              exerciseId: ex.exerciseId,
              setOrder: order++,
              weightKg: parseFloat(s.weightKg),
              reps: parseInt(s.reps, 10),
              rpe: parseFloat(s.rpe) || 8.0,
              isWarmup: s.isWarmup
            });
          }
        }
      }

      Alert.alert('¡Entrenamiento Guardado!', `Has completado ${totalCompletedSets} series efectivas. ¡Buen trabajo!`);
      onFinish();
    } catch (error) {
      console.error('Error guardando el entrenamiento:', error);
      Alert.alert('Error', 'No se pudo guardar la sesión de entrenamiento.');
    }
  };

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredCatalog = catalogExercises.filter((ex) =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ex.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Cabecera del Entrenamiento Activo */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeHeaderBtn} onPress={onClose}>
            <Ionicons name="chevron-down" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerTitleBox}>
            <Text style={styles.workoutNameText} numberOfLines={1}>{workoutName}</Text>
            <View style={styles.liveTimerBadge}>
              <View style={styles.redDot} />
              <Text style={styles.timerText}>{formatTimer(elapsedSeconds)}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.finishBtn} onPress={handleFinishWorkout}>
            <Text style={styles.finishBtnText}>Finalizar</Text>
          </TouchableOpacity>
        </View>

        {/* Lista de Ejercicios y Series */}
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
          {exercisesInWorkout.map((ex, exIdx) => (
            <View key={`ex_${ex.exerciseId}_${exIdx}`} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exerciseTitle}>{ex.exerciseName}</Text>
                  <Text style={styles.exerciseCategory}>{ex.category.toUpperCase()}</Text>
                </View>
              </View>

              {/* Banner de Sobrecarga Progresiva */}
              {ex.recommendation && (
                <View style={styles.recommendationBanner}>
                  <Ionicons name="sparkles" size={16} color={colors.primary} />
                  <Text style={styles.recommendationText}>
                    Sugerencia: <Text style={{ color: colors.primary, fontFamily: fonts.bodyBold }}>{ex.recommendation.recommendedWeightKg} kg × {ex.recommendation.recommendedReps} reps</Text> ({ex.recommendation.reasoning})
                  </Text>
                </View>
              )}

              {/* Encabezado de Columnas de Series */}
              <View style={styles.setsHeaderRow}>
                <Text style={[styles.setColLabel, { width: 36 }]}>SERIE</Text>
                <Text style={[styles.setColLabel, { flex: 1 }]}>PESO (KG)</Text>
                <Text style={[styles.setColLabel, { flex: 1 }]}>REPS</Text>
                <Text style={[styles.setColLabel, { width: 50 }]}>RPE</Text>
                <Text style={[styles.setColLabel, { width: 36, textAlign: 'center' }]}>CAL</Text>
                <Text style={[styles.setColLabel, { width: 36, textAlign: 'center' }]}>OK</Text>
              </View>

              {/* Lista de Series por Ejercicio */}
              {ex.sets.map((s, setIdx) => (
                <View
                  key={s.id}
                  style={[styles.setRow, s.isCompleted && styles.setRowCompleted]}
                >
                  <Text style={styles.setOrderNum}>{s.setOrder}</Text>

                  <TextInput
                    style={[styles.setInput, { flex: 1 }]}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    value={s.weightKg}
                    onChangeText={(txt) => handleUpdateSet(exIdx, setIdx, 'weightKg', txt)}
                  />

                  <TextInput
                    style={[styles.setInput, { flex: 1 }]}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    value={s.reps}
                    onChangeText={(txt) => handleUpdateSet(exIdx, setIdx, 'reps', txt)}
                  />

                  <TextInput
                    style={[styles.setInput, { width: 50 }]}
                    keyboardType="numeric"
                    placeholder="8.0"
                    placeholderTextColor={colors.textMuted}
                    value={s.rpe}
                    onChangeText={(txt) => handleUpdateSet(exIdx, setIdx, 'rpe', txt)}
                  />

                  {/* Checkbox Calentamiento */}
                  <TouchableOpacity
                    style={[styles.checkBtn, s.isWarmup && styles.checkBtnWarmup]}
                    onPress={() => handleUpdateSet(exIdx, setIdx, 'isWarmup', !s.isWarmup)}
                  >
                    <Text style={styles.checkBtnText}>{s.isWarmup ? 'W' : '-'}</Text>
                  </TouchableOpacity>

                  {/* Checkbox Completar Serie */}
                  <TouchableOpacity
                    style={[styles.checkBtn, s.isCompleted && styles.checkBtnActive]}
                    onPress={() => handleUpdateSet(exIdx, setIdx, 'isCompleted', !s.isCompleted)}
                  >
                    <Ionicons
                      name={s.isCompleted ? 'checkmark-sharp' : 'ellipse-outline'}
                      size={18}
                      color={s.isCompleted ? '#FFFFFF' : colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Botón Añadir Serie */}
              <TouchableOpacity style={styles.addSetBtn} onPress={() => handleAddSet(exIdx)}>
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text style={styles.addSetBtnText}>Añadir Serie</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Botón para Añadir Otro Ejercicio al Entrenamiento */}
          <TouchableOpacity style={styles.addExerciseBtn} onPress={handleOpenPicker}>
            <Ionicons name="barbell-outline" size={20} color={colors.primary} />
            <Text style={styles.addExerciseBtnText}>+ Añadir Ejercicio</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Modal de Temporizador de Descanso */}
        <RestTimerModal
          visible={showRestTimer}
          initialSeconds={restDuration}
          onClose={() => setShowRestTimer(false)}
        />

        {/* Modal para Buscar y Seleccionar Ejercicio */}
        <Modal visible={showExercisePicker} animationType="slide" transparent>
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Seleccionar Ejercicio</Text>
                <TouchableOpacity onPress={() => setShowExercisePicker(false)}>
                  <Ionicons name="close" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nombre o músculo..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />

              <ScrollView style={{ flex: 1 }}>
                {filteredCatalog.slice(0, 30).map((ex) => (
                  <TouchableOpacity
                    key={ex.id}
                    style={styles.catalogItem}
                    onPress={() => handleAddExerciseFromPicker(ex)}
                  >
                    <Text style={styles.catalogItemName}>{ex.name}</Text>
                    <Text style={styles.catalogItemCat}>{ex.category.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 24,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderBottomWidth: 1
  },
  closeHeaderBtn: {
    padding: 6
  },
  headerTitleBox: {
    alignItems: 'center'
  },
  workoutNameText: {
    color: colors.textPrimary,
    fontFamily: fonts.headingBold,
    fontSize: 16
  },
  liveTimerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  redDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF3B30',
    marginRight: 6
  },
  timerText: {
    color: colors.primary,
    fontFamily: fonts.bodyBold,
    fontSize: 13
  },
  finishBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radii.md
  },
  finishBtnText: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyBold,
    fontSize: 13
  },
  body: {
    flex: 1
  },
  bodyContent: {
    padding: 16,
    paddingBottom: 60
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderColor: colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: 16,
    marginBottom: 16
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  exerciseTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.headingBold,
    fontSize: 17
  },
  exerciseCategory: {
    color: colors.textSecondary,
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    marginTop: 2
  },
  recommendationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '18',
    borderColor: colors.primary + '40',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 10,
    marginBottom: 12
  },
  recommendationText: {
    color: colors.textSecondary,
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    marginLeft: 8,
    flex: 1
  },
  setsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4
  },
  setColLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemiBold,
    fontSize: 10
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: radii.md,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 8,
    borderColor: colors.border,
    borderWidth: 1
  },
  setRowCompleted: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary + '50'
  },
  setOrderNum: {
    width: 36,
    color: colors.textPrimary,
    fontFamily: fonts.headingBold,
    fontSize: 14,
    textAlign: 'center'
  },
  setInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.sm,
    color: colors.textPrimary,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    textAlign: 'center'
  },
  checkBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4
  },
  checkBtnWarmup: {
    backgroundColor: colors.secondary + '30',
    borderColor: colors.secondary
  },
  checkBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  checkBtnText: {
    color: colors.textPrimary,
    fontFamily: fonts.bodyBold,
    fontSize: 12
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 4
  },
  addSetBtnText: {
    color: colors.primary,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    marginLeft: 4
  },
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderWidth: 1.5,
    borderRadius: radii.xl,
    paddingVertical: 14,
    marginTop: 8
  },
  addExerciseBtnText: {
    color: colors.primary,
    fontFamily: fonts.headingBold,
    fontSize: 15,
    marginLeft: 8
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end'
  },
  pickerContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    height: '80%',
    padding: 20
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  pickerTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.headingBold,
    fontSize: 18
  },
  searchInput: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    color: colors.textPrimary,
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14
  },
  catalogItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  catalogItemName: {
    color: colors.textPrimary,
    fontFamily: fonts.headingBold,
    fontSize: 15
  },
  catalogItemCat: {
    color: colors.textSecondary,
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    marginTop: 2
  }
});
