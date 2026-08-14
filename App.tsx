import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Platform,
  ScrollView,
  Dimensions,
  Modal,
  TextInput,
  Image,
  TouchableWithoutFeedback,
  PanResponder,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  useFonts,
  Outfit_800ExtraBold,
  Outfit_600SemiBold,
  Outfit_500Medium
} from '@expo-google-fonts/outfit';
import {
  PlusJakartaSans_700Bold,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_400Regular
} from '@expo-google-fonts/plus-jakarta-sans';
import { Ionicons } from '@expo/vector-icons';
import { initDatabase } from '@database/schema/init';
import { seedExercises, seedUserRoutinesAndHistory } from '@database/seeds/seed';
import { db } from '@database/client';
import { colors, radii, fonts } from '@core/theme/colors';
import { UserProfile, Sex, ExperienceLevel } from '@domain/entities/user-profile';
import { OnboardingScreen } from '@features/profile/ui/screens/OnboardingScreen';
import { calculateStrengthRank } from '@features/progression/domain/strength-ranks';
import { calculateStreak } from '@domain/streak';
import { ActiveWorkoutModal } from '@features/workout/ui/components/ActiveWorkoutModal';
import { WorkoutHistoryModal } from '@features/workout/ui/components/WorkoutHistoryModal';
import { ProgressionChart } from '@features/progression/ui/components/ProgressionChart';

// Dictionary for internationalization (ES / EN)
const i18n = {
  es: {
    tabs: { home: 'Inicio', routines: 'Rutinas', catalog: 'Ejercicios', profile: 'Perfil' },
    headerTitle: { home: 'Resumen', routines: 'Rutinas', catalog: 'Ejercicios', profile: 'Perfil' },
    startWorkout: 'INICIAR ENTRENAMIENTO LIBRE',
    createRoutine: 'CREAR RUTINA PERSONALIZADA',
    routinesTitle: 'Rutinas Disponibles',
    routinesSub: 'Selecciona una rutina para iniciar el seguimiento en vivo.',
    startRoutine: 'INICIAR RUTINA',
    catalogTitle: 'Catálogo de Ejercicios',
    catalogSub: 'Busca entre +1.500 ejercicios filtrables por grupo muscular.',
    searchPlaceholder: 'Buscar ejercicio...',
    categories: ['Todos', 'Pecho', 'Espalda', 'Piernas', 'Hombros', 'Bíceps', 'Tríceps'],
    profileTitle: 'Perfil de Atleta',
    editProfile: 'Editar Perfil',
    name: 'Nombre',
    age: 'Edad',
    sex: 'Sexo',
    male: 'Masculino',
    female: 'Femenino',
    weight: 'Peso Corporal',
    height: 'Estatura',
    level: 'Nivel',
    language: 'Idioma de la App',
    statsTitle: 'Estadísticas & Récords',
    prTitle: 'Mejores Marcas',
    noPrs: 'Aún no has registrado series. Tus marcas aparecerán aquí.',
    save: 'Guardar',
    cancel: 'Cancelar',
    close: 'Cerrar',
    beginner: 'Principiante',
    intermediate: 'Intermedio',
    advanced: 'Avanzado',
    athleteReport: 'Informe de Atleta',
    max1RM: '1RM Máximo',
    avgVolPerSession: 'Vol. Promedio/Sesión',
    longestStreak: 'Racha Más Larga',
    avgRpe: 'RPE Medio',
    personalRecords: 'Marcas Personales',
    metrics: 'Métricas de Atleta',
    trainedDays: 'Días Entrenados',
    totalSets: 'Total Series',
    streak: 'Racha',
    days: 'días',
    day: 'día',
    activeDays: 'días activos',
    instructions: 'Instrucciones',
    noInstructions: 'Instrucciones no disponibles para este ejercicio.',
    swipeToClose: 'Toca fuera o usa la X para cerrar',
    volume: 'Volumen',
    sessions: 'Sesiones',
    sets: 'Series',
    accumulatedVolume: 'Volumen Acumulado',
    currentStreak: 'Racha Actual',
    weekDays: ['L','M','X','J','V','S','D'],
    noRecords: 'Sin registro'
  },
  en: {
    tabs: { home: 'Home', routines: 'Routines', catalog: 'Exercises', profile: 'Profile' },
    headerTitle: { home: 'Summary', routines: 'Routines', catalog: 'Exercises', profile: 'Profile' },
    startWorkout: 'START FREE WORKOUT',
    createRoutine: 'CREATE CUSTOM ROUTINE',
    routinesTitle: 'Available Routines',
    routinesSub: 'Select a routine to launch live workout tracking.',
    startRoutine: 'LAUNCH ROUTINE',
    catalogTitle: 'Exercise Catalog',
    catalogSub: 'Search through 1,500+ exercises filterable by muscle group.',
    searchPlaceholder: 'Search exercise...',
    categories: ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Biceps', 'Triceps'],
    profileTitle: 'Athlete Profile',
    editProfile: 'Edit Profile',
    name: 'Name',
    age: 'Age',
    sex: 'Sex',
    male: 'Male',
    female: 'Female',
    weight: 'Body Weight',
    height: 'Height',
    level: 'Experience Level',
    language: 'App Language',
    statsTitle: 'Stats & Records',
    prTitle: 'Personal Records',
    noPrs: 'No sets logged yet. Your records will appear here.',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    athleteReport: 'Athlete Report',
    max1RM: 'Max 1RM',
    avgVolPerSession: 'Avg Vol/Session',
    longestStreak: 'Longest Streak',
    avgRpe: 'Avg RPE',
    personalRecords: 'Personal Records',
    metrics: 'Athlete Metrics',
    trainedDays: 'Trained Days',
    totalSets: 'Total Sets',
    streak: 'Streak',
    days: 'days',
    day: 'day',
    activeDays: 'active days',
    instructions: 'Instructions',
    noInstructions: 'No instructions available for this exercise.',
    swipeToClose: 'Tap outside or press X to close',
    volume: 'Volume',
    sessions: 'Sessions',
    sets: 'Sets',
    accumulatedVolume: 'Accumulated Volume',
    currentStreak: 'Current Streak',
    weekDays: ['M','T','W','T','F','S','S'],
    noRecords: 'No record'
  }
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GRID_PADDING = 36;
const DAY_CELL_WIDTH = Math.floor((SCREEN_WIDTH - GRID_PADDING - 36) / 7);

const TABS = ['home', 'routines', 'catalog', 'profile'] as const;
type TabType = typeof TABS[number];

interface ExercisePR {
  exerciseId: string;
  exerciseName: string;
  maxWeightKg: number;
  maxEstimated1RM: number;
  rankLabel: string;
  rankEmoji: string;
}

interface DashboardStats {
  totalVolumeKg: number;
  totalSessions: number;
  totalSets: number;
  avgRpe: number;
  max1RM: number;
  avgVolumePerSession: number;
  currentStreakDays: number;
  bestStreakDays: number;
  trainedDaysInSelectedMonth: number[];
  exercisePRs: ExercisePR[];
}

const getLocalizedInstructions = (instructionsRaw: string | undefined | null, lang: 'es' | 'en') => {
  if (!instructionsRaw) return lang === 'es' ? 'Instrucciones no disponibles.' : 'No instructions available.';
  try {
    const parsed = JSON.parse(instructionsRaw);
    if (typeof parsed === 'object' && parsed !== null) {
      if (parsed[lang]) {
        return Array.isArray(parsed[lang]) ? parsed[lang].join('\n\n') : parsed[lang];
      }
      if (parsed.es) return Array.isArray(parsed.es) ? parsed.es.join('\n\n') : parsed.es;
      if (parsed.en) return Array.isArray(parsed.en) ? parsed.en.join('\n\n') : parsed.en;
    }
    return String(parsed);
  } catch (e) {
    return instructionsRaw;
  }
};

const getExerciseGifUri = (ex: any) => {
  if (!ex) return null;
  if (ex.gif_url && typeof ex.gif_url === 'string') {
    if (ex.gif_url.startsWith('http')) return ex.gif_url;
    const cleanPath = ex.gif_url.startsWith('/') ? ex.gif_url.slice(1) : ex.gif_url;
    return `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/${cleanPath}`;
  }
  const rawId = String(ex.id).replace(/\D/g, '').padStart(4, '0');
  return `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${rawId}/0.jpg`;
};

const EXERCISE_SPANISH_MAP: Record<string, string> = {
  "3/4 sit-up": "Abdominales 3/4",
  "45° side bend": "Inclinación Lateral 45°",
  "air bike": "Bicicleta de Aire",
  "alternate heel touch": "Toques de Talón Alternos",
  "assisted chest dip": "Fondos de Pecho Asistidos",
  "assisted dip": "Fondos Asistidos",
  "assisted pull-up": "Dominadas Asistidas",
  "assisted triceps dip": "Fondos de Tríceps Asistidos",
  "back extension": "Extensión Lumbar / Espalda",
  "band bench press": "Press de Banca con Banda",
  "barbell bench press": "Press de Banca con Barra",
  "barbell bicep curl": "Curl de Bíceps con Barra",
  "barbell curl": "Curl con Barra",
  "barbell deadlift": "Peso Muerto con Barra",
  "barbell front squat": "Sentadilla Frontal con Barra",
  "barbell hip thrust": "Hip Thrust con Barra",
  "barbell incline bench press": "Press Inclinado con Barra",
  "barbell lunge": "Zancadas con Barra",
  "barbell overhead press": "Press Militar con Barra",
  "barbell row": "Remo con Barra",
  "barbell shoulder press": "Press de Hombros con Barra",
  "barbell shrug": "Encogimientos de Hombros con Barra",
  "barbell squat": "Sentadilla con Barra",
  "bench press": "Press de Banca",
  "biceps curl": "Curl de Bíceps",
  "cable chest fly": "Cruce de Poleas para Pecho",
  "cable crossover": "Cruce de Poleas",
  "cable face pull": "Face Pull en Polea",
  "cable lateral raise": "Elevación Lateral en Polea",
  "cable lat pulldown": "Jalón al Pecho en Polea",
  "cable row": "Remo en Polea",
  "cable triceps extension": "Extensión de Tríceps en Polea",
  "calf raise": "Elevación de Gemelos",
  "chest dip": "Fondos de Pecho",
  "chin-up": "Dominadas Supinas",
  "close-grip bench press": "Press de Banca Agarre Cerrado",
  "crunch": "Abdominales Crunch",
  "deadlift": "Peso Muerto",
  "decline bench press": "Press Declinado",
  "dip": "Fondos en Paralelas",
  "dumbbell bench press": "Press de Banca con Mancuernas",
  "dumbbell bicep curl": "Curl de Bíceps con Mancuernas",
  "dumbbell fly": "Aperturas con Mancuernas",
  "dumbbell incline press": "Press Inclinado con Mancuernas",
  "dumbbell lateral raise": "Elevaciones Laterales con Mancuernas",
  "dumbbell lunge": "Zancadas con Mancuernas",
  "dumbbell row": "Remo con Mancuerna",
  "dumbbell shoulder press": "Press de Hombros con Mancuernas",
  "dumbbell shrug": "Encogimientos con Mancuernas",
  "face pull": "Face Pull",
  "front raise": "Elevaciones Frontales",
  "front squat": "Sentadilla Frontal",
  "hammer curl": "Curl Martillo",
  "hanging leg raise": "Elevación de Piernas Colgado",
  "hip thrust": "Hip Thrust",
  "incline bench press": "Press Inclinado de Banca",
  "incline dumbbell press": "Press Inclinado con Mancuernas",
  "lat pulldown": "Jalón al Pecho",
  "lateral raise": "Elevaciones Laterales",
  "leg curl": "Curl Femoral",
  "leg extension": "Extensión de Piernas",
  "leg press": "Prensa de Piernas",
  "lunge": "Zancadas",
  "military press": "Press Militar",
  "overhead press": "Press Militar de Hombros",
  "pec deck": "Aperturas en Máquina",
  "plank": "Plancha Abdominal",
  "preacher curl": "Curl Predicador",
  "pull-up": "Dominadas",
  "push-up": "Flexiones de Pecho",
  "romanian deadlift": "Peso Muerto Rumano",
  "russian twist": "Giros Rusos",
  "seated cable row": "Remo Sentado en Polea",
  "shoulder press": "Press de Hombros",
  "shrug": "Encogimiento de Hombros",
  "side plank": "Plancha Lateral",
  "skullcrusher": "Press Francés / Skullcrusher",
  "squat": "Sentadilla",
  "standing calf raise": "Elevación de Gemelos de Pie",
  "triceps dip": "Fondos de Tríceps",
  "triceps extension": "Extensión de Tríceps",
  "triceps pushdown": "Empuje de Tríceps en Polea",
  "walking lunge": "Zancadas Caminando"
};

const getLocalizedExerciseName = (name: string, lang: 'es' | 'en') => {
  if (!name) return '';
  if (lang === 'en') return name;
  const lower = name.toLowerCase().trim();
  if (EXERCISE_SPANISH_MAP[lower]) {
    return EXERCISE_SPANISH_MAP[lower];
  }
  return name
    .replace(/\bbarbell\b/gi, 'con Barra')
    .replace(/\bdumbbell\b/gi, 'con Mancuerna')
    .replace(/\bcable\b/gi, 'en Polea')
    .replace(/\bbench press\b/gi, 'Press de Banca')
    .replace(/\bincline\b/gi, 'Inclinado')
    .replace(/\bdecline\b/gi, 'Declinado')
    .replace(/\bseated\b/gi, 'Sentado')
    .replace(/\bstanding\b/gi, 'de Pie')
    .replace(/\bsquat\b/gi, 'Sentadilla')
    .replace(/\bdeadlift\b/gi, 'Peso Muerto')
    .replace(/\bcurl\b/gi, 'Curl')
    .replace(/\bextension\b/gi, 'Extensión')
    .replace(/\braise\b/gi, 'Elevación')
    .replace(/\brow\b/gi, 'Remo')
    .replace(/\bfly\b/gi, 'Aperturas')
    .replace(/\bpress\b/gi, 'Press')
    .replace(/\blunge\b/gi, 'Zancadas');
};

const ROUTINE_TRANSLATIONS: Record<string, { name: string; desc: string }> = {
  'Fuerza Pecho y Tríceps': {
    name: 'Chest & Triceps Strength',
    desc: 'Heavy hypertrophy and strength session focusing on chest press movements and triceps extensions.'
  },
  'Hipertrofia Espalda y Bíceps': {
    name: 'Back & Biceps Hypertrophy',
    desc: 'Complete pull workout targeting lats, upper back thickness, and isolated biceps curls.'
  },
  'Piernas Completo': {
    name: 'Full Legs',
    desc: 'Lower body session combining quads, hamstrings, glutes, and calf isolation work.'
  },
  'Hombros y Abdomen': {
    name: 'Shoulders & Core',
    desc: 'Deltoid development and core stability routines.'
  },
  'Torso Completo': {
    name: 'Upper Body Complete',
    desc: 'Comprehensive chest, back, shoulders, and arms routine.'
  }
};

const getLocalizedRoutineName = (name: string, lang: 'es' | 'en') => {
  if (!name) return '';
  if (lang === 'es') return name;
  if (ROUTINE_TRANSLATIONS[name]) return ROUTINE_TRANSLATIONS[name].name;
  return name;
};

const getLocalizedRoutineDesc = (desc: string, name: string, lang: 'es' | 'en') => {
  if (!desc) return '';
  if (lang === 'es') return desc;
  if (ROUTINE_TRANSLATIONS[name]) return ROUTINE_TRANSLATIONS[name].desc;
  return desc;
};

interface SwipeableModalSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  blur?: boolean;
}

const SwipeableModalSheet: React.FC<SwipeableModalSheetProps> = ({ visible, onClose, children }) => {
  const panY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      panY.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(panY, {
      toValue: SCREEN_HEIGHT,
      duration: 180,
      useNativeDriver: true
    }).start(() => {
      onClose();
      panY.setValue(0);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, g) => {
        return g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx);
      },
      onMoveShouldSetPanResponderCapture: (_, g) => {
        return g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx);
      },
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) {
          panY.setValue(g.dy);
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 60 || g.vy > 0.3) {
          handleClose();
        } else {
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 3,
            speed: 16
          }).start();
        }
      }
    })
  ).current;

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={handleClose} />
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.modalBox,
            { transform: [{ translateY: panY }] }
          ]}
        >
          <View style={{ width: '100%', paddingVertical: 6, alignItems: 'center' }}>
            <View style={styles.sheetHandle} />
          </View>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    Outfit_800ExtraBold,
    Outfit_600SemiBold,
    Outfit_500Medium,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_400Regular
  });

  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  
  // Modales de Entrenamiento, Rutinas, Ejercicios y Perfil
  const [showActiveWorkout, setShowActiveWorkout] = useState<boolean>(false);
  const [activeWorkoutTitle, setActiveWorkoutTitle] = useState<string>('Entrenamiento Libre');
  const [activeWorkoutInitialExercises, setActiveWorkoutInitialExercises] = useState<{ exerciseId: string; exerciseName: string; category: string }[]>([]);

  // Estado para Rutinas desde SQLite
  const [routinesList, setRoutinesList] = useState<{ id: string; name: string; description: string }[]>([]);
  const [showCreateRoutineModal, setShowCreateRoutineModal] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [newRoutineDesc, setNewRoutineDesc] = useState('');

  // Estado para Catálogo de Ejercicios
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState('Todos');
  const [allExercises, setAllExercises] = useState<{ id: string; name: string; category: string; equipment: string; instructions?: string; gif_url?: string }[]>([]);
  const [selectedExerciseDetail, setSelectedExerciseDetail] = useState<any | null>(null);

  // Estado Completo para Editar Perfil
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editSex, setEditSex] = useState<Sex>('male');
  const [editHeight, setEditHeight] = useState('');
  const [editBodyWeight, setEditBodyWeight] = useState('');
  const [editExperienceLevel, setEditExperienceLevel] = useState<ExperienceLevel>('intermediate');
  const [editLanguage, setEditLanguage] = useState<'es' | 'en'>('es');

  // Estado para la navegación mensual del calendario y gráficas
  const [viewMonthDate, setViewMonthDate] = useState<Date>(new Date());
  const [volumeChartData, setVolumeChartData] = useState<{ label: string; value: number }[]>([]);
  const [strengthChartData, setStrengthChartData] = useState<{ label: string; value: number }[]>([]);
  const [selectedCalendarDateMs, setSelectedCalendarDateMs] = useState<number | null>(null);
  const [selected1RMExerciseId, setSelected1RMExerciseId] = useState<string>('barbell-squat');

  const activeLang = userProfile?.language || 'es';
  const t = i18n[activeLang] || i18n.es;

  const exerciseChips = [
    { id: 'barbell-squat', label: activeLang === 'es' ? 'Sentadilla' : 'Squat' },
    { id: 'hip-thrust', label: 'Hip Thrust' },
    { id: 'bench-press-trad', label: activeLang === 'es' ? 'Press Banca' : 'Bench Press' },
    { id: 'pull-ups', label: activeLang === 'es' ? 'Dominadas' : 'Pull Ups' },
    { id: 'barbell-row', label: activeLang === 'es' ? 'Remo Barra' : 'Barbell Row' }
  ];

  const load1RMChartForExercise = async (exId: string) => {
    try {
      const max1RMSets = await db.getAllAsync<{ date: number; max_1rm: number }>(
        `SELECT ws.date, MAX(es.estimated_1rm) as max_1rm 
         FROM exercise_sets es 
         JOIN workout_sessions ws ON es.session_id = ws.id 
         WHERE es.exercise_id = ?
         GROUP BY ws.id 
         ORDER BY ws.date ASC 
         LIMIT 8;`,
        [exId]
      );

      const points = max1RMSets.map((st) => {
        const d = new Date(st.date);
        return {
          label: `${d.getDate()}/${d.getMonth() + 1}`,
          value: Math.round(st.max_1rm)
        };
      });
      setStrengthChartData(points);
    } catch (e) {
      console.error('Error cargando gráfica de 1RM', e);
    }
  };

  const handleSelect1RMExercise = (id: string) => {
    setSelected1RMExerciseId(id);
    load1RMChartForExercise(id);
  };

  const [stats, setStats] = useState<DashboardStats>({
    totalVolumeKg: 0,
    totalSessions: 0,
    totalSets: 0,
    avgRpe: 0,
    max1RM: 0,
    avgVolumePerSession: 0,
    currentStreakDays: 0,
    bestStreakDays: 0,
    trainedDaysInSelectedMonth: [],
    exercisePRs: []
  });

  const scrollViewRef = useRef<ScrollView>(null);

  // Cargar perfil y datos reales de la base de datos SQLite
  const loadDatabaseData = async () => {
    try {
      await initDatabase();
      await seedExercises();
      await seedUserRoutinesAndHistory();

      // 1. Cargar Perfil
      const profile = await db.getFirstAsync<any>('SELECT * FROM user_profile LIMIT 1;');
      let userProf: UserProfile | null = null;
      if (profile) {
        userProf = {
          id: profile.id,
          name: profile.name,
          age: profile.age,
          sex: profile.sex as Sex,
          heightCm: profile.height_cm || 175,
          bodyWeightKg: profile.body_weight_kg || 75,
          experienceLevel: profile.experience_level as ExperienceLevel,
          language: (profile.language as 'es' | 'en') || 'es',
          createdAt: profile.created_at
        };
        setUserProfile(userProf);
      }

      // 2. Cargar Rutinas
      const routines = await db.getAllAsync<{ id: string; name: string; description: string }>(
        `SELECT id, name, description FROM routines;`
      );
      setRoutinesList(routines);

      // 3. Cargar Ejercicios
      const exercises = await db.getAllAsync<any>(
        `SELECT id, name, category, equipment, gif_url, instructions FROM exercises ORDER BY name ASC;`
      );
      setAllExercises(exercises);

      // 4. Calcular Estadísticas Reales desde SQLite
      const year = viewMonthDate.getFullYear();
      const month = viewMonthDate.getMonth();
      const firstDayMs = new Date(year, month, 1).getTime();
      const lastDayMs = new Date(year, month + 1, 0, 23, 59, 59).getTime();

      const monthSessions = await db.getAllAsync<{ date: number }>(
        `SELECT date FROM workout_sessions WHERE date >= ? AND date <= ? ORDER BY date ASC;`,
        [firstDayMs, lastDayMs]
      );
      const trainedDays = monthSessions.map((s) => new Date(s.date).getDate());

      const totalVolumeRes = await db.getFirstAsync<{ total_vol: number }>(
        `SELECT SUM(weight_kg * reps) as total_vol FROM exercise_sets WHERE is_warmup = 0;`
      );
      const totalSessionsRes = await db.getFirstAsync<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM workout_sessions;`
      );
      const totalSetsRes = await db.getFirstAsync<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM exercise_sets;`
      );
      const avgRpeRes = await db.getFirstAsync<{ avg_rpe: number }>(
        `SELECT AVG(rpe) as avg_rpe FROM exercise_sets WHERE is_warmup = 0;`
      );
      const max1RMRes = await db.getFirstAsync<{ max_1rm: number }>(
        `SELECT MAX(estimated_1rm) as max_1rm FROM exercise_sets;`
      );

      const exercisePRsRaw = await db.getAllAsync<{
        exercise_id: string;
        exercise_name: string;
        max_weight: number;
        max_1rm: number;
      }>(
        `SELECT 
           es.exercise_id, 
           e.name as exercise_name, 
           MAX(es.weight_kg) as max_weight, 
           MAX(es.estimated_1rm) as max_1rm
         FROM exercise_sets es
         JOIN exercises e ON es.exercise_id = e.id
         GROUP BY es.exercise_id
         ORDER BY max_1rm DESC
         LIMIT 5;`
      );

      const bodyWeight = userProf?.bodyWeightKg || 70;
      const userSex = userProf?.sex || 'male';

      const prs: ExercisePR[] = exercisePRsRaw.map((item) => {
        const rankInfo = calculateStrengthRank(item.max_1rm, bodyWeight, userSex);
        return {
          exerciseId: item.exercise_id,
          exerciseName: item.exercise_name,
          maxWeightKg: item.max_weight,
          maxEstimated1RM: Math.round(item.max_1rm),
          rankLabel: rankInfo.label,
          rankEmoji: rankInfo.emoji
        };
      });

      const allSessions = await db.getAllAsync<{ date: number }>(
        `SELECT date FROM workout_sessions ORDER BY date DESC;`
      );

      const sessionTimestamps = allSessions.map((s) => s.date);
      const streakInfo = calculateStreak(sessionTimestamps, 3);

      const totalVol = totalVolumeRes?.total_vol || 0;
      const totalSess = totalSessionsRes?.cnt || 0;
      const avgVolPerSession = totalSess > 0 ? Math.round(totalVol / totalSess) : 0;

      setStats({
        totalVolumeKg: totalVol,
        totalSessions: totalSess,
        totalSets: totalSetsRes?.cnt || 0,
        avgRpe: avgRpeRes?.avg_rpe ? parseFloat(avgRpeRes.avg_rpe.toFixed(1)) : 0,
        max1RM: max1RMRes?.max_1rm ? Math.round(max1RMRes.max_1rm) : 0,
        avgVolumePerSession: avgVolPerSession,
        currentStreakDays: streakInfo.currentStreak,
        bestStreakDays: streakInfo.bestStreak,
        trainedDaysInSelectedMonth: trainedDays,
        exercisePRs: prs
      });

      // 5. Cargar datos para gráficas de progresión
      const recentSessions = await db.getAllAsync<{ id: string; name: string; date: number }>(
        `SELECT id, name, date FROM workout_sessions ORDER BY date DESC LIMIT 6;`
      );

      const chartPointsVolume: { label: string; value: number }[] = [];
      const reversedSessions = [...recentSessions].reverse();

      for (const s of reversedSessions) {
        const volRes = await db.getFirstAsync<{ vol: number }>(
          `SELECT SUM(weight_kg * reps) as vol FROM exercise_sets WHERE session_id = ? AND is_warmup = 0;`,
          [s.id]
        );
        const d = new Date(s.date);
        const label = `${d.getDate()}/${d.getMonth() + 1}`;
        chartPointsVolume.push({
          label,
          value: volRes?.vol ? Math.round(volRes.vol) : 0
        });
      }
      setVolumeChartData(chartPointsVolume);

      await load1RMChartForExercise(selected1RMExerciseId);
    } catch (error) {
      console.error('Error cargando estadísticas reales de SQLite:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    loadDatabaseData();
  }, [viewMonthDate]);

  const handleStartFreeWorkout = () => {
    setActiveWorkoutTitle(t.startWorkout);
    setActiveWorkoutInitialExercises([]);
    setShowActiveWorkout(true);
  };

  const handleStartRoutineWorkout = async (routine: { id: string; name: string }) => {
    try {
      const routineExs = await db.getAllAsync<{ exercise_id: string; exercise_name: string; category: string }>(
        `SELECT re.exercise_id, e.name as exercise_name, e.category 
         FROM routine_exercises re
         JOIN exercises e ON re.exercise_id = e.id
         WHERE re.routine_id = ?
         ORDER BY re.exercise_order ASC;`,
        [routine.id]
      );

      let initialList = routineExs.map((r) => ({
        exerciseId: r.exercise_id,
        exerciseName: r.exercise_name,
        category: r.category
      }));

      if (initialList.length === 0) {
        if (routine.id === 'routine_push') {
          initialList = [
            { exerciseId: 'press-banca', exerciseName: 'Press de Banca', category: 'chest' },
            { exerciseId: 'press-militar', exerciseName: 'Press Militar', category: 'shoulders' },
            { exerciseId: 'fondos-triceps', exerciseName: 'Fondos de Tríceps', category: 'triceps' }
          ];
        } else if (routine.id === 'routine_pull') {
          initialList = [
            { exerciseId: 'dominadas', exerciseName: 'Dominadas', category: 'back' },
            { exerciseId: 'remo-con-barra', exerciseName: 'Remo con Barra', category: 'back' },
            { exerciseId: 'curl-biceps', exerciseName: 'Curl de Bíceps', category: 'biceps' }
          ];
        } else if (routine.id === 'routine_legs') {
          initialList = [
            { exerciseId: 'sentadilla-trasera', exerciseName: 'Sentadilla Trasera', category: 'quads' },
            { exerciseId: 'peso-muerto-rumano', exerciseName: 'Peso Muerto Rumano', category: 'hamstrings' },
            { exerciseId: 'prensa-pierna', exerciseName: 'Prensa de Piernas', category: 'quads' }
          ];
        }
      }

      setActiveWorkoutTitle(routine.name);
      setActiveWorkoutInitialExercises(initialList);
      setShowActiveWorkout(true);
    } catch (err) {
      console.error('Error al cargar la rutina:', err);
    }
  };

  const handleCreateRoutineSave = async () => {
    if (!newRoutineName.trim()) return;
    const newId = `routine_${Date.now()}`;
    await db.runAsync(
      `INSERT INTO routines (id, name, description, is_predefined) VALUES (?, ?, ?, 0);`,
      [newId, newRoutineName.trim(), newRoutineDesc.trim() || 'Rutina personalizada']
    );
    setNewRoutineName('');
    setNewRoutineDesc('');
    setShowCreateRoutineModal(false);
    loadDatabaseData();
  };

  const handleSaveEditProfile = async () => {
    if (!userProfile) return;
    const newName = editName.trim() || userProfile.name;
    const newAge = parseInt(editAge, 10) || userProfile.age;
    const newSex = editSex;
    const newHeight = parseFloat(editHeight) || userProfile.heightCm;
    const newWeight = parseFloat(editBodyWeight) || userProfile.bodyWeightKg;
    const newLevel = editExperienceLevel;
    const newLang = editLanguage;

    await db.runAsync(
      `UPDATE user_profile SET name = ?, age = ?, sex = ?, height_cm = ?, body_weight_kg = ?, experience_level = ?, language = ? WHERE id = ?;`,
      [newName, newAge, newSex, newHeight, newWeight, newLevel, newLang, userProfile.id]
    );

    setShowEditProfileModal(false);
    loadDatabaseData();
  };

  const openEditProfile = () => {
    if (userProfile) {
      setEditName(userProfile.name);
      setEditAge(String(userProfile.age));
      setEditSex(userProfile.sex);
      setEditHeight(String(userProfile.heightCm || 175));
      setEditBodyWeight(String(userProfile.bodyWeightKg));
      setEditExperienceLevel(userProfile.experienceLevel);
      setEditLanguage(userProfile.language || 'es');
      setShowEditProfileModal(true);
    }
  };

  const handleCompleteOnboarding = async (data: {
    name: string;
    age: number;
    sex: Sex;
    heightCm: number;
    bodyWeightKg: number;
    experienceLevel: ExperienceLevel;
  }) => {
    const newProfile: UserProfile = {
      id: 'usr_' + Date.now(),
      ...data,
      language: 'es',
      createdAt: Date.now()
    };

    await db.runAsync(
      `INSERT INTO user_profile (id, name, age, sex, height_cm, body_weight_kg, experience_level, language, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        newProfile.id,
        newProfile.name,
        newProfile.age,
        newProfile.sex,
        newProfile.heightCm,
        newProfile.bodyWeightKg,
        newProfile.experienceLevel,
        'es',
        newProfile.createdAt
      ]
    );

    setUserProfile(newProfile);
    loadDatabaseData();
  };

  const handlePrevMonth = () => {
    setViewMonthDate(new Date(viewMonthDate.getFullYear(), viewMonthDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewMonthDate(new Date(viewMonthDate.getFullYear(), viewMonthDate.getMonth() + 1, 1));
  };

  const handleTabPress = (tab: TabType, index: number) => {
    setActiveTab(tab);
    scrollViewRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index >= 0 && index < TABS.length && TABS[index] !== activeTab) {
      setActiveTab(TABS[index]);
    }
  };

  if (isInitializing || !fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando FitTracker...</Text>
      </View>
    );
  }

  if (!userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <OnboardingScreen onComplete={handleCompleteOnboarding} />
      </SafeAreaView>
    );
  }

  const topInset = Platform.OS === 'android' ? (StatusBar.currentHeight || 36) + 12 : 16;
  const bottomInset = Platform.OS === 'ios' ? 44 : 36;

  const todayDate = new Date();
  const isViewingCurrentMonth =
    viewMonthDate.getFullYear() === todayDate.getFullYear() &&
    viewMonthDate.getMonth() === todayDate.getMonth();

  const formattedHeaderDate = todayDate.toLocaleDateString(activeLang === 'es' ? 'es-ES' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'short'
  });

  const monthYearLabel = viewMonthDate.toLocaleDateString(activeLang === 'es' ? 'es-ES' : 'en-US', {
    month: 'long',
    year: 'numeric'
  });

  const viewYear = viewMonthDate.getFullYear();
  const viewMonth = viewMonthDate.getMonth();
  const daysInViewMonthCount = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInMonthArray = Array.from({ length: daysInViewMonthCount }, (_, i) => i + 1);

  const rawFirstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const startPaddingSlotsCount = (rawFirstDayOfWeek + 6) % 7;
  const paddingSlotsArray = Array.from({ length: startPaddingSlotsCount }, (_, i) => i);

  // Filtrado de ejercicios por categoría e idioma (búsqueda en inglés y español)
  const muscleCategories = t.categories;
  const filteredExercises = allExercises.filter((ex) => {
    const spanishName = getLocalizedExerciseName(ex.name, 'es');
    const searchLower = catalogSearch.toLowerCase().trim();
    const matchesSearch =
      !searchLower ||
      ex.name.toLowerCase().includes(searchLower) ||
      spanishName.toLowerCase().includes(searchLower) ||
      (ex.category && ex.category.toLowerCase().includes(searchLower)) ||
      (ex.equipment && ex.equipment.toLowerCase().includes(searchLower));

    if (selectedMuscleFilter === 'Todos' || selectedMuscleFilter === 'All') return matchesSearch;
    const cat = (ex.category || '').toLowerCase();
    const filterLower = selectedMuscleFilter.toLowerCase();

    if (filterLower.includes('pecho') || filterLower.includes('chest')) {
      return matchesSearch && (cat.includes('chest') || cat.includes('pectoral'));
    }
    if (filterLower.includes('espalda') || filterLower.includes('back')) {
      return matchesSearch && (cat.includes('back') || cat.includes('lat') || cat.includes('trapezius'));
    }
    if (filterLower.includes('pierna') || filterLower.includes('leg')) {
      return matchesSearch && (cat.includes('quad') || cat.includes('leg') || cat.includes('glute') || cat.includes('hamstring') || cat.includes('calv'));
    }
    if (filterLower.includes('hombro') || filterLower.includes('shoulder')) {
      return matchesSearch && (cat.includes('shoulder') || cat.includes('deltoid'));
    }
    if (filterLower.includes('bícep') || filterLower.includes('bicep')) {
      return matchesSearch && (cat.includes('bicep') || cat.includes('arm'));
    }
    if (filterLower.includes('trícep') || filterLower.includes('tricep')) {
      return matchesSearch && (cat.includes('tricep') || cat.includes('arm'));
    }
    return matchesSearch;
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={[styles.header, { paddingTop: topInset }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greetingTitle}>{t.headerTitle[activeTab]}</Text>
          <Text style={styles.dateSubtitle}>{formattedHeaderDate}</Text>
        </View>
        <TouchableOpacity style={styles.avatarButton} onPress={() => handleTabPress('profile', 3)}>
          <Text style={styles.avatarText}>{userProfile.name.substring(0, 2).toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView ref={scrollViewRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={handleScroll} style={styles.pagerStyle}>
        {/* P1: Resumen Dashboard */}
        <ScrollView style={styles.pageContainer} contentContainerStyle={styles.scrollContent} nestedScrollEnabled={true} overScrollMode="never" scrollEventThrottle={16} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.startWorkoutCta} onPress={handleStartFreeWorkout}>
            <Ionicons name="play" size={22} color="#FFFFFF" />
            <Text style={styles.startWorkoutCtaText}>{t.startWorkout}</Text>
          </TouchableOpacity>

          <View style={styles.widget}>
            <Text style={styles.wTitle}>{t.metrics}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              <TouchableOpacity style={styles.pillBtn} onPress={() => setShowStatsModal(true)}>
                <Ionicons name="analytics" size={14} color={colors.primary} />
                <Text style={styles.pillBtnText}>{t.athleteReport}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.pillBtn} onPress={() => { setSelectedCalendarDateMs(null); setShowHistoryModal(true); }}>
                <Ionicons name="time-outline" size={14} color={colors.primary} />
                <Text style={styles.pillBtnText}>{activeLang === 'es' ? 'Historial' : 'History'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.ringsRow}>
              <View style={styles.ringsVisualContainer}>
                <View style={[styles.ringOuter, { borderColor: colors.secondary }]}>
                  <View style={[styles.ringMiddle, { borderColor: colors.primary }]}>
                    <View style={[styles.ringInner, { borderColor: colors.cyan }]} />
                  </View>
                </View>
              </View>
              <View style={styles.metricsList}>
                <View style={styles.mItem}><Text style={styles.mLabel}>{t.volume}</Text><Text style={[styles.mVal, { color: colors.secondary }]}>{stats.totalVolumeKg.toLocaleString()} KG</Text></View>
                <View style={styles.mItem}><Text style={styles.mLabel}>{t.sessions}</Text><Text style={[styles.mVal, { color: colors.primary }]}>{stats.totalSessions}</Text></View>
                <View style={styles.mItem}><Text style={styles.mLabel}>{t.sets}</Text><Text style={[styles.mVal, { color: colors.cyan }]}>{stats.totalSets}</Text></View>
              </View>
            </View>
          </View>

          <View style={styles.widget}>
            <Text style={styles.wTitle}>{t.trainedDays}</Text>
            <Text style={styles.wSub}>{monthYearLabel.charAt(0).toUpperCase() + monthYearLabel.slice(1)}</Text>
            <View style={styles.streakRow}>
              <Ionicons name="flame" size={14} color={colors.primary} />
              <Text style={styles.streakTxt}>{t.streak}: {stats.currentStreakDays} {stats.currentStreakDays === 1 ? t.day : t.days}</Text>
            </View>

            <View style={styles.monthNav}>
              <TouchableOpacity style={styles.monthIconBtn} onPress={handlePrevMonth}>
                <Ionicons name="chevron-back" size={20} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.monthCenter}>{stats.trainedDaysInSelectedMonth.length} {t.activeDays}</Text>
              <TouchableOpacity style={styles.monthIconBtn} onPress={handleNextMonth}>
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {t.weekDays.map((d,i) => <Text key={i} style={[styles.weekDay, { width: DAY_CELL_WIDTH }]}>{d}</Text>)}
            </View>
            <View style={styles.calGrid}>
              {paddingSlotsArray.map(p => <View key={`p${p}`} style={[styles.calCell, { width: DAY_CELL_WIDTH }]}><View style={styles.calBlank} /></View>)}
              {daysInMonthArray.map(day => {
                const tr = stats.trainedDaysInSelectedMonth.includes(day);
                const today = isViewingCurrentMonth && day === todayDate.getDate();
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.calCell, { width: DAY_CELL_WIDTH }]}
                    activeOpacity={0.7}
                    onPress={() => {
                      const selectedMs = new Date(viewMonthDate.getFullYear(), viewMonthDate.getMonth(), day).getTime();
                      setSelectedCalendarDateMs(selectedMs);
                      setShowHistoryModal(true);
                    }}
                  >
                    <View style={[styles.calDot, tr && styles.calDotActive, today && styles.calDotToday]}>
                      <Text style={[styles.calDotTxt, (tr || today) && styles.calDotTxtW]}>{day}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Gráficas de Progresión en Dashboard */}
          <ProgressionChart
            title={activeLang === 'es' ? 'Volumen por Entrenamiento' : 'Session Volume'}
            unit="KG"
            data={volumeChartData}
            color={colors.secondary}
          />

          <ProgressionChart
            title={activeLang === 'es' ? 'Evolución 1RM por Ejercicio' : '1RM Progression by Exercise'}
            unit="KG"
            data={strengthChartData}
            color={colors.primary}
            chips={exerciseChips}
            activeChipId={selected1RMExerciseId}
            onSelectChip={handleSelect1RMExercise}
          />

          <View style={styles.widgetGridRow}>
            <View style={[styles.widget, styles.halfW]}>
              <Text style={styles.wTitleSm}>{t.totalSets}</Text>
              <Text style={[styles.bigNum, { color: colors.purple }]}>{stats.totalSets}</Text>
            </View>
            <View style={[styles.widget, styles.halfW]}>
              <Text style={styles.wTitleSm}>{t.avgRpe}</Text>
              <Text style={[styles.bigNum, { color: colors.cyan }]}>{stats.avgRpe > 0 ? stats.avgRpe : '0.0'}</Text>
            </View>
          </View>
        </ScrollView>

        {/* P2: Rutinas Prediseñadas y Creador */}
        <ScrollView style={styles.pageContainer} contentContainerStyle={styles.scrollContent} nestedScrollEnabled={true} overScrollMode="never" scrollEventThrottle={16} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.startWorkoutCta} onPress={() => setShowCreateRoutineModal(true)}>
            <Ionicons name="add-circle" size={22} color="#FFFFFF" />
            <Text style={styles.startWorkoutCtaText}>{t.createRoutine}</Text>
          </TouchableOpacity>

          <View style={styles.widget}>
            <Text style={styles.wTitle}>{t.routinesTitle}</Text>
            <Text style={styles.wSub}>{t.routinesSub}</Text>
          </View>

          {routinesList.map((r) => (
            <View key={r.id} style={styles.widget}>
              <Text style={styles.wTitle}>{getLocalizedRoutineName(r.name, activeLang)}</Text>
              <Text style={styles.wSub}>{getLocalizedRoutineDesc(r.description, r.name, activeLang)}</Text>
              <TouchableOpacity
                style={[styles.pillBtn, { marginTop: 12, backgroundColor: colors.primary }]}
                onPress={() => handleStartRoutineWorkout(r)}
              >
                <Ionicons name="play" size={14} color="#FFFFFF" />
                <Text style={[styles.pillBtnText, { color: '#FFFFFF' }]}>{t.startRoutine}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        {/* P3: Catálogo de Ejercicios */}
        <ScrollView style={styles.pageContainer} contentContainerStyle={styles.scrollContent} nestedScrollEnabled={true} overScrollMode="never" scrollEventThrottle={16} showsVerticalScrollIndicator={false}>
          <View style={styles.widget}>
            <Text style={styles.wTitle}>{t.catalogTitle}</Text>
            <Text style={styles.wSub}>{t.catalogSub}</Text>
          </View>

          {/* Buscador */}
          <View style={styles.searchBoxContainer}>
            <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchTextInput}
              placeholder={t.searchPlaceholder}
              placeholderTextColor={colors.textMuted}
              value={catalogSearch}
              onChangeText={setCatalogSearch}
            />
            {catalogSearch.length > 0 && (
              <TouchableOpacity onPress={() => setCatalogSearch('')}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Chips de Categorías en Cuadrícula Flexible Wrap */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 }}>
            {muscleCategories.map((cat) => {
              const isActive = selectedMuscleFilter === cat || (cat === 'Todos' && selectedMuscleFilter === 'All') || (cat === 'All' && selectedMuscleFilter === 'Todos');
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chipItem, isActive && styles.chipItemActive, { marginBottom: 8 }]}
                  onPress={() => setSelectedMuscleFilter(cat)}
                >
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Lista de Ejercicios */}
          {filteredExercises.slice(0, 40).map((ex) => (
            <TouchableOpacity
              key={ex.id}
              style={[styles.blockCard, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
              onPress={() => setSelectedExerciseDetail(ex)}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.bVal, { textAlign: 'left' }]} numberOfLines={1}>{getLocalizedExerciseName(ex.name, activeLang)}</Text>
                <Text style={[styles.bLabel, { textAlign: 'left' }]}>{ex.category.toUpperCase()} · {ex.equipment.toUpperCase()}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* P4: Perfil de Atleta y Edición Completa */}
        <ScrollView style={styles.pageContainer} contentContainerStyle={styles.scrollContent} nestedScrollEnabled={true} overScrollMode="never" scrollEventThrottle={16} showsVerticalScrollIndicator={false}>
          <View style={styles.widget}>
            <Text style={styles.wTitle}>{t.profileTitle}</Text>
            <TouchableOpacity style={styles.pillBtn} onPress={openEditProfile}>
              <Ionicons name="create-outline" size={14} color={colors.primary} />
              <Text style={styles.pillBtnText}>{t.editProfile}</Text>
            </TouchableOpacity>

            <View style={styles.blockCard}><Text style={styles.bLabel}>{t.name}</Text><Text style={styles.bVal}>{userProfile.name}</Text></View>
            <View style={styles.blockCard}><Text style={styles.bLabel}>{t.age}</Text><Text style={styles.bVal}>{userProfile.age} {activeLang === 'es' ? 'años' : 'years'}</Text></View>
            <View style={styles.blockCard}><Text style={styles.bLabel}>{t.sex}</Text><Text style={styles.bVal}>{userProfile.sex === 'male' ? t.male : t.female}</Text></View>
            <View style={styles.blockCard}><Text style={styles.bLabel}>{t.height}</Text><Text style={styles.bVal}>{userProfile.heightCm} cm</Text></View>
            <View style={styles.blockCard}><Text style={styles.bLabel}>{t.weight}</Text><Text style={styles.bVal}>{userProfile.bodyWeightKg} kg</Text></View>
            <View style={styles.blockCard}><Text style={styles.bLabel}>{t.level}</Text><Text style={styles.bVal}>{(t as any)[userProfile.experienceLevel] || userProfile.experienceLevel.toUpperCase()}</Text></View>
            <View style={styles.blockCard}><Text style={styles.bLabel}>{t.language}</Text><Text style={styles.bVal}>{userProfile.language === 'en' ? 'English (EN)' : 'Español (ES)'}</Text></View>
          </View>

          <View style={styles.widget}>
            <Text style={styles.wTitle}>{t.statsTitle}</Text>
            <View style={styles.blockCard}><Text style={styles.bLabel}>{t.accumulatedVolume}</Text><Text style={styles.bVal}>{stats.totalVolumeKg.toLocaleString()} kg</Text></View>
            <View style={styles.blockCard}><Text style={styles.bLabel}>{t.max1RM}</Text><Text style={styles.bVal}>{stats.max1RM > 0 ? `${stats.max1RM} kg` : t.noRecords}</Text></View>
            <View style={styles.blockCard}><Text style={styles.bLabel}>{t.currentStreak}</Text><Text style={styles.bVal}>{stats.currentStreakDays} {stats.currentStreakDays === 1 ? t.day : t.days}</Text></View>
          </View>

          <View style={styles.widget}>
            <Text style={styles.wTitle}>{t.prTitle}</Text>
            {stats.exercisePRs.length > 0 ? stats.exercisePRs.map(pr => (
              <View key={pr.exerciseId} style={styles.blockCard}>
                <Text style={styles.bVal}>{getLocalizedExerciseName(pr.exerciseName, activeLang)}</Text>
                <Text style={styles.bLabel}>Max: {pr.maxWeightKg} kg · 1RM: {pr.maxEstimated1RM} kg</Text>
                <Text style={[styles.bLabel, { marginTop: 4 }]}>{pr.rankLabel}</Text>
              </View>
            )) : (
              <Text style={styles.wSub}>{t.noPrs}</Text>
            )}
          </View>
        </ScrollView>
      </ScrollView>

      {/* Modal Entrenamiento Activo */}
      <ActiveWorkoutModal
        visible={showActiveWorkout}
        workoutName={activeWorkoutTitle}
        initialExercises={activeWorkoutInitialExercises}
        onClose={() => setShowActiveWorkout(false)}
        onFinish={() => {
          setShowActiveWorkout(false);
          loadDatabaseData();
        }}
      />

      {/* Modal Crear Rutina */}
      <Modal visible={showCreateRoutineModal} animationType="slide" transparent onRequestClose={() => setShowCreateRoutineModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowCreateRoutineModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalBox}>
                <View style={styles.sheetHandle} />
                <Text style={styles.modalTitle}>Nueva Rutina</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Nombre (ej. Torso Pesado)"
                  placeholderTextColor={colors.textMuted}
                  value={newRoutineName}
                  onChangeText={setNewRoutineName}
                />
                <TextInput
                  style={styles.formInput}
                  placeholder="Descripción opcional"
                  placeholderTextColor={colors.textMuted}
                  value={newRoutineDesc}
                  onChangeText={setNewRoutineDesc}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14 }}>
                  <TouchableOpacity style={[styles.pillBtn, { marginRight: 8 }]} onPress={() => setShowCreateRoutineModal(false)}>
                    <Text style={styles.pillBtnText}>{t.cancel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.pillBtn, { backgroundColor: colors.primary }]} onPress={handleCreateRoutineSave}>
                    <Text style={[styles.pillBtnText, { color: '#FFF' }]}>{t.save}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal Editar Perfil Completo */}
      <Modal visible={showEditProfileModal} animationType="slide" transparent onRequestClose={() => setShowEditProfileModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowEditProfileModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalBox}>
                <View style={styles.sheetHandle} />
                <View style={styles.modalHead}>
                  <Text style={styles.modalTitle}>{t.editProfile}</Text>
                  <TouchableOpacity onPress={() => setShowEditProfileModal(false)} style={styles.closeBtn}>
                    <Ionicons name="close" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.inputLabel}>{t.name}</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Nombre"
                    placeholderTextColor={colors.textMuted}
                    value={editName}
                    onChangeText={setEditName}
                  />

                  <Text style={styles.inputLabel}>{t.age}</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Edad"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textMuted}
                    value={editAge}
                    onChangeText={setEditAge}
                  />

                  <Text style={styles.inputLabel}>{t.sex}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 6, marginBottom: 10 }}>
                    <TouchableOpacity
                      style={[styles.segmentBtn, editSex === 'male' && styles.segmentBtnActive]}
                      onPress={() => setEditSex('male')}
                    >
                      <Text style={[styles.segmentBtnText, editSex === 'male' && styles.segmentBtnTextActive]}>{t.male}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.segmentBtn, editSex === 'female' && styles.segmentBtnActive]}
                      onPress={() => setEditSex('female')}
                    >
                      <Text style={[styles.segmentBtnText, editSex === 'female' && styles.segmentBtnTextActive]}>{t.female}</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.inputLabel}>{t.height} (cm)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="175"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textMuted}
                    value={editHeight}
                    onChangeText={setEditHeight}
                  />

                  <Text style={styles.inputLabel}>{t.weight} (kg)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="75"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textMuted}
                    value={editBodyWeight}
                    onChangeText={setEditBodyWeight}
                  />

                  <Text style={styles.inputLabel}>{t.level}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 6, marginBottom: 10 }}>
                    {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                      <TouchableOpacity
                        key={lvl}
                        style={[styles.segmentBtn, editExperienceLevel === lvl && styles.segmentBtnActive]}
                        onPress={() => setEditExperienceLevel(lvl)}
                      >
                        <Text style={[styles.segmentBtnText, editExperienceLevel === lvl && styles.segmentBtnTextActive]}>{(t as any)[lvl] || lvl}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>{t.language}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 6, marginBottom: 14 }}>
                    <TouchableOpacity
                      style={[styles.segmentBtn, editLanguage === 'es' && styles.segmentBtnActive]}
                      onPress={() => setEditLanguage('es')}
                    >
                      <Text style={[styles.segmentBtnText, editLanguage === 'es' && styles.segmentBtnTextActive]}>Español (ES)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.segmentBtn, editLanguage === 'en' && styles.segmentBtnActive]}
                      onPress={() => setEditLanguage('en')}
                    >
                      <Text style={[styles.segmentBtnText, editLanguage === 'en' && styles.segmentBtnTextActive]}>English (EN)</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                    <TouchableOpacity style={[styles.pillBtn, { marginRight: 8 }]} onPress={() => setShowEditProfileModal(false)}>
                      <Text style={styles.pillBtnText}>{t.cancel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.pillBtn, { backgroundColor: colors.primary }]} onPress={handleSaveEditProfile}>
                      <Text style={[styles.pillBtnText, { color: '#FFF' }]}>{t.save}</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal Detalle Ejercicio con GIF y Deslizable Suave */}
      <SwipeableModalSheet
        visible={!!selectedExerciseDetail}
        onClose={() => setSelectedExerciseDetail(null)}
      >
        {selectedExerciseDetail && (
          <>
            <View style={styles.modalHead}>
              <Text style={[styles.modalTitle, { flex: 1 }]}>{getLocalizedExerciseName(selectedExerciseDetail.name, activeLang)}</Text>
              <TouchableOpacity
                onPress={() => setSelectedExerciseDetail(null)}
                style={styles.closeBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.65 }} showsVerticalScrollIndicator={true} nestedScrollEnabled={true} overScrollMode="never" scrollEventThrottle={16}>
              {/* Animación GIF o Imagen de Demostración */}
              {getExerciseGifUri(selectedExerciseDetail) && (
                <Image
                  source={{ uri: getExerciseGifUri(selectedExerciseDetail)! }}
                  style={styles.exerciseGifImage}
                  resizeMode="contain"
                />
              )}

              <Text style={[styles.wSub, { color: colors.primary, marginBottom: 10, textAlign: 'left' }]}>
                {selectedExerciseDetail.category.toUpperCase()} · {selectedExerciseDetail.equipment.toUpperCase()}
              </Text>

              <Text style={[styles.wTitle, { fontSize: 16, marginTop: 4, marginBottom: 6, textAlign: 'left' }]}>{t.instructions}</Text>
              <Text style={[styles.wSub, { textAlign: 'left', lineHeight: 22, color: colors.textPrimary, marginBottom: 16 }]}>
                {getLocalizedInstructions(selectedExerciseDetail.instructions, activeLang)}
              </Text>
            </ScrollView>

            <Text style={styles.swipeCloseHint}>{t.swipeToClose}</Text>
          </>
        )}
      </SwipeableModalSheet>

      {/* Modal Estadísticas / Métricas Deslizable Suave */}
      <SwipeableModalSheet
        visible={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        blur={true}
      >
        <View style={styles.modalHead}>
          <Text style={styles.modalTitle}>{t.athleteReport}</Text>
          <TouchableOpacity
            onPress={() => setShowStatsModal(false)}
            style={styles.closeBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Ionicons name="close" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.65 }} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
          <View style={styles.blockCard}><Text style={styles.bLabel}>{t.max1RM}</Text><Text style={styles.bVal}>{stats.max1RM > 0 ? `${stats.max1RM} KG` : t.noRecords}</Text></View>
          <View style={styles.blockCard}><Text style={styles.bLabel}>{t.avgVolPerSession}</Text><Text style={styles.bVal}>{stats.avgVolumePerSession > 0 ? `${stats.avgVolumePerSession.toLocaleString()} KG` : '0 KG'}</Text></View>
          <View style={styles.blockCard}><Text style={styles.bLabel}>{t.longestStreak}</Text><Text style={styles.bVal}>{stats.bestStreakDays} {t.days}</Text></View>
          <View style={styles.blockCard}><Text style={styles.bLabel}>{t.avgRpe}</Text><Text style={styles.bVal}>{stats.avgRpe > 0 ? `${stats.avgRpe}` : '0.0'}</Text></View>

          <ProgressionChart
            title={activeLang === 'es' ? 'Volumen por Entrenamiento' : 'Session Volume'}
            unit="KG"
            data={volumeChartData}
            color={colors.secondary}
          />

          <ProgressionChart
            title={activeLang === 'es' ? 'Evolución 1RM por Ejercicio' : '1RM Progression by Exercise'}
            unit="KG"
            data={strengthChartData}
            color={colors.primary}
            chips={exerciseChips}
            activeChipId={selected1RMExerciseId}
            onSelectChip={handleSelect1RMExercise}
          />

          <Text style={[styles.wTitle, { marginTop: 16 }]}>{t.personalRecords}</Text>
          {stats.exercisePRs.length > 0 ? stats.exercisePRs.map(pr => (
            <View key={`m_${pr.exerciseId}`} style={styles.blockCard}>
              <Text style={styles.bVal}>{getLocalizedExerciseName(pr.exerciseName, activeLang)}</Text>
              <Text style={styles.bLabel}>Max: {pr.maxWeightKg} kg · 1RM: {pr.maxEstimated1RM} kg</Text>
            </View>
          )) : <Text style={styles.wSub}>{t.noPrs}</Text>}
        </ScrollView>
        <Text style={styles.swipeCloseHint}>{t.swipeToClose}</Text>
      </SwipeableModalSheet>

      {/* Modal Historial de Entrenamientos */}
      <SwipeableModalSheet
        visible={showHistoryModal}
        onClose={() => { setShowHistoryModal(false); setSelectedCalendarDateMs(null); }}
        blur={true}
      >
        <WorkoutHistoryModal
          visible={showHistoryModal}
          onClose={() => { setShowHistoryModal(false); setSelectedCalendarDateMs(null); }}
          lang={activeLang}
          filterDateMs={selectedCalendarDateMs}
        />
      </SwipeableModalSheet>

      {/* Floating Bottom Nav */}
      <View style={[styles.floatingNav, { bottom: bottomInset }]}>
        <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} tint="dark" style={styles.glassBar}>
          {(['home','routines','catalog','profile'] as const).map((tab, idx) => {
            const icons: Record<string, [string, string]> = { home: ['grid','grid-outline'], routines: ['flame','flame-outline'], catalog: ['barbell','barbell-outline'], profile: ['person','person-outline'] };
            const labels: Record<string, string> = t.tabs;
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity key={tab} style={[styles.navItem, isActive && styles.navItemActive]} onPress={() => handleTabPress(tab, idx)}>
                <Ionicons name={(isActive ? icons[tab][0] : icons[tab][1]) as any} size={18} color={isActive ? colors.primary : '#8E8E93'} />
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]} numberOfLines={1}>{labels[tab]}</Text>
              </TouchableOpacity>
            );
          })}
        </BlurView>
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { color: colors.textSecondary, fontFamily: fonts.bodyRegular, fontSize: 14, marginTop: 16, textAlign: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  greetingTitle: { color: colors.textPrimary, fontFamily: fonts.headingBold, fontSize: 30, letterSpacing: -0.5, includeFontPadding: false },
  dateSubtitle: { color: colors.textSecondary, fontFamily: fonts.bodySemiBold, fontSize: 13, marginTop: 2, includeFontPadding: false },
  avatarButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceLight, borderColor: colors.border, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: colors.textPrimary, fontFamily: fonts.headingBold, fontSize: 13, includeFontPadding: false },
  pagerStyle: { flex: 1 },
  pageContainer: { width: SCREEN_WIDTH },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 140 },

  // Widget = Card container
  widget: { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, borderWidth: 1, borderRadius: radii.xl, paddingHorizontal: 20, paddingVertical: 18, marginBottom: 14, alignItems: 'center' },
  wTitle: { color: colors.textPrimary, fontFamily: fonts.headingBold, fontSize: 17, textAlign: 'center', includeFontPadding: false, marginBottom: 8 },
  wTitleSm: { color: colors.textPrimary, fontFamily: fonts.headingBold, fontSize: 15, textAlign: 'center', includeFontPadding: false, marginBottom: 4 },
  wSub: { color: colors.textSecondary, fontFamily: fonts.bodyRegular, fontSize: 13, textAlign: 'center', lineHeight: 20, includeFontPadding: false, marginBottom: 4 },

  // Pill button (Stats)
  pillBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '20', borderColor: colors.primary, borderWidth: 1, borderRadius: radii.full, paddingVertical: 6, paddingHorizontal: 14, marginBottom: 12 },
  pillBtnText: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 13, marginLeft: 6, includeFontPadding: false },

  // Streak badge
  streakRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '20', borderColor: colors.primary, borderWidth: 1, borderRadius: radii.full, paddingVertical: 6, paddingHorizontal: 14, marginTop: 12, marginBottom: 16 },
  streakTxt: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 13, marginLeft: 6, includeFontPadding: false },

  // Month navigation - icon buttons only, no text that can clip
  monthNav: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceLight, borderRadius: radii.md, paddingVertical: 6, paddingHorizontal: 8, marginBottom: 14, alignSelf: 'stretch' },
  monthIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  monthCenter: { flex: 1, color: colors.textPrimary, fontFamily: fonts.bodyBold, fontSize: 14, textAlign: 'center', includeFontPadding: false },

  // Rings & metrics - row layout with left label and right value (space-between, no clipping)
  ringsRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  ringsVisualContainer: { width: 90, height: 90, justifyContent: 'center', alignItems: 'center' },
  ringOuter: { width: 86, height: 86, borderRadius: 43, borderWidth: 7, justifyContent: 'center', alignItems: 'center' },
  ringMiddle: { width: 66, height: 66, borderRadius: 33, borderWidth: 7, justifyContent: 'center', alignItems: 'center' },
  ringInner: { width: 46, height: 46, borderRadius: 23, borderWidth: 7 },
  metricsList: { flex: 1, marginLeft: 16 },
  mItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingVertical: 2 },
  mLabel: { color: colors.textSecondary, fontFamily: fonts.bodyRegular, fontSize: 12, includeFontPadding: false, flexShrink: 1 },
  mVal: { fontFamily: fonts.headingBold, fontSize: 14, includeFontPadding: false, marginLeft: 6 },

  // Calendar
  weekRow: { flexDirection: 'row', alignSelf: 'stretch', marginBottom: 8 },
  weekDay: { color: colors.textSecondary, fontFamily: fonts.bodySemiBold, fontSize: 11, textAlign: 'center' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'stretch' },
  calCell: { alignItems: 'center', justifyContent: 'center', marginVertical: 3 },
  calBlank: { width: 30, height: 30 },
  calDot: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  calDotActive: { backgroundColor: colors.primary },
  calDotToday: { borderColor: '#FFF', borderWidth: 1.5 },
  calDotTxt: { fontFamily: fonts.headingSemiBold, fontSize: 11, color: colors.textMuted, includeFontPadding: false },
  calDotTxtW: { color: '#FFF', fontFamily: fonts.headingBold },

  // Widget grid row (2 half-width cards)
  widgetGridRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  halfW: { width: (SCREEN_WIDTH - 44) / 2, marginBottom: 0 },
  bigNum: { fontFamily: fonts.headingBold, fontSize: 26, textAlign: 'center', includeFontPadding: false, marginVertical: 4 },
  miniBarChart: { flexDirection: 'row', alignItems: 'flex-end', height: 32, justifyContent: 'space-between', marginTop: 6, alignSelf: 'stretch' },
  bar: { width: 5, borderRadius: 3 },

  // Block cards (profile, stats) - vertical stacked, centered text
  blockCard: { backgroundColor: colors.surfaceLight, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 10, alignItems: 'center', alignSelf: 'stretch' },
  bLabel: { color: colors.textSecondary, fontFamily: fonts.bodySemiBold, fontSize: 12, textAlign: 'center', includeFontPadding: false, marginBottom: 2 },
  bVal: { color: colors.textPrimary, fontFamily: fonts.headingBold, fontSize: 17, textAlign: 'center', includeFontPadding: false },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalBox: { width: '100%', backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 6, paddingBottom: Platform.OS === 'ios' ? 40 : 28, maxHeight: '92%', borderColor: colors.border, borderWidth: 1, elevation: 25 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: colors.textPrimary, fontFamily: fonts.headingBold, fontSize: 20, includeFontPadding: false },
  closeBtn: { padding: 8, backgroundColor: colors.surfaceLight, borderRadius: radii.full },

  // CTA Start Workout button
  startWorkoutCta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radii.xl, paddingVertical: 15, paddingHorizontal: 20, marginBottom: 14, alignSelf: 'stretch', elevation: 4 },
  startWorkoutCtaText: { color: '#FFFFFF', fontFamily: fonts.headingBold, fontSize: 15, marginLeft: 8, includeFontPadding: false },

  // Catalog search & category chips
  searchBoxContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceLight, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  searchTextInput: { flex: 1, color: colors.textPrimary, fontFamily: fonts.bodyRegular, fontSize: 14 },
  chipItem: { backgroundColor: colors.surfaceLight, borderColor: colors.border, borderWidth: 1, borderRadius: radii.full, paddingVertical: 6, paddingHorizontal: 14, marginRight: 8 },
  chipItemActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontFamily: fonts.bodyBold, fontSize: 12 },
  chipTextActive: { color: '#FFFFFF' },

  // Modal sheet handle & close hint
  sheetHandle: { width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)', alignSelf: 'center', marginBottom: 12 },
  swipeCloseHint: { color: colors.textMuted, fontFamily: fonts.bodyRegular, fontSize: 11, textAlign: 'center', marginTop: 12 },

  // Exercise Detail GIF / Image
  exerciseGifImage: { width: '100%', height: 210, borderRadius: radii.md, marginBottom: 12, backgroundColor: colors.surfaceLight },

  // Profile Edit Segmented Control & Labels
  inputLabel: { color: colors.textSecondary, fontFamily: fonts.bodyBold, fontSize: 12, marginTop: 12, marginBottom: 2 },
  segmentBtn: { flex: 1, backgroundColor: colors.surfaceLight, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center', marginRight: 6 },
  segmentBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentBtnText: { color: colors.textSecondary, fontFamily: fonts.bodyBold, fontSize: 12 },
  segmentBtnTextActive: { color: '#FFFFFF' },

  // Form inputs for modals
  formInput: { backgroundColor: colors.surfaceLight, borderColor: colors.border, borderWidth: 1, borderRadius: radii.md, color: colors.textPrimary, fontFamily: fonts.bodyRegular, fontSize: 14, paddingVertical: 10, paddingHorizontal: 14, marginTop: 4 },

  // Floating Nav
  floatingNav: { position: 'absolute', left: 14, right: 14, borderRadius: 32, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(28,28,30,0.94)', zIndex: 9999, elevation: 10 },
  glassBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 6, paddingHorizontal: 4, backgroundColor: 'transparent' },
  navItem: { flex: 1, paddingVertical: 8, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  navItemActive: { backgroundColor: '#3A3A3C' },
  navLabel: { color: '#8E8E93', fontFamily: fonts.bodySemiBold, fontSize: 10, marginTop: 2, textAlign: 'center', includeFontPadding: false },
  navLabelActive: { color: colors.primary, fontFamily: fonts.bodyBold }
});

