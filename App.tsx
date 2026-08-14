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
import { seedExercises } from '@database/seeds/seed';
import { db } from '@database/client';
import { colors, radii, fonts } from '@core/theme/colors';
import { UserProfile, Sex, ExperienceLevel } from '@domain/entities/user-profile';
import { OnboardingScreen } from '@features/profile/ui/screens/OnboardingScreen';
import { calculateStrengthRank } from '@features/progression/domain/strength-ranks';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 36;
const DAY_CELL_WIDTH = Math.floor((SCREEN_WIDTH - GRID_PADDING - 36) / 7);

const TABS = ['home', 'routines', 'catalog', 'profile'] as const;
type TabType = typeof TABS[number];

const TAB_TITLES: Record<TabType, string> = {
  home: 'Resumen',
  routines: 'Rutinas',
  catalog: 'Ejercicios',
  profile: 'Perfil'
};

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
  
  // Estado para la navegación mensual del calendario
  const [viewMonthDate, setViewMonthDate] = useState<Date>(new Date());
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

      // 1. Cargar Perfil
      const profile = await db.getFirstAsync<any>('SELECT * FROM user_profile LIMIT 1;');
      let userProf: UserProfile | null = null;
      if (profile) {
        userProf = {
          id: profile.id,
          name: profile.name,
          age: profile.age,
          sex: profile.sex as Sex,
          heightCm: profile.height_cm,
          bodyWeightKg: profile.body_weight_kg,
          experienceLevel: profile.experience_level as ExperienceLevel,
          createdAt: profile.created_at
        };
        setUserProfile(userProf);
      }

      // 2. Calcular Estadísticas Reales desde SQLite
      const year = viewMonthDate.getFullYear();
      const month = viewMonthDate.getMonth();
      const firstDayMs = new Date(year, month, 1).getTime();
      const lastDayMs = new Date(year, month + 1, 0, 23, 59, 59).getTime();

      // Sesiones del mes seleccionado
      const monthSessions = await db.getAllAsync<{ date: number }>(
        `SELECT date FROM workout_sessions WHERE date >= ? AND date <= ? ORDER BY date ASC;`,
        [firstDayMs, lastDayMs]
      );
      const trainedDays = monthSessions.map((s) => new Date(s.date).getDate());

      // Totales globales en la app
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

      // Records Adaptativos por Ejercicio Clave
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

      // Rachas de entrenamiento
      const allSessions = await db.getAllAsync<{ date: number }>(
        `SELECT date FROM workout_sessions ORDER BY date DESC;`
      );

      let currentStreak = 0;
      let maxStreak = 0;

      if (allSessions.length > 0) {
        const uniqueDates = Array.from(
          new Set(
            allSessions.map((s) => {
              const d = new Date(s.date);
              return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            })
          )
        );

        currentStreak = uniqueDates.length > 0 ? uniqueDates.length : 0;
        maxStreak = currentStreak;
      }

      const totalVol = totalVolumeRes?.total_vol || 0;
      const totalSess = totalSessionsRes?.cnt || 0;
      const avgVolPerSession = totalSess > 0 ? Math.round(totalVol / totalSess) : 0;

      setStats({
        totalVolumeKg: totalVol,
        totalSessions: totalSess,
        totalSets: totalSetsRes?.cnt || 0,
        avgRpe: avgRpeRes?.avg_rpe ? parseFloat((avgRpeRes.avg_rpe).toFixed(1)) : 0,
        max1RM: max1RMRes?.max_1rm ? Math.round(max1RMRes.max_1rm) : 0,
        avgVolumePerSession: avgVolPerSession,
        currentStreakDays: currentStreak,
        bestStreakDays: maxStreak,
        trainedDaysInSelectedMonth: trainedDays,
        exercisePRs: prs
      });
    } catch (error) {
      console.error('Error cargando estadísticas reales de SQLite:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    loadDatabaseData();
  }, [viewMonthDate]);

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
      createdAt: Date.now()
    };

    await db.runAsync(
      `INSERT INTO user_profile (id, name, age, sex, height_cm, body_weight_kg, experience_level, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        newProfile.id,
        newProfile.name,
        newProfile.age,
        newProfile.sex,
        newProfile.heightCm,
        newProfile.bodyWeightKg,
        newProfile.experienceLevel,
        newProfile.createdAt
      ]
    );

    setUserProfile(newProfile);
    loadDatabaseData();
  };

  // Cambiar de mes en el calendario
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

  // Si no hay perfil, mostramos el Onboarding
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

  // Formato de fecha actual
  const todayDate = new Date();
  const isViewingCurrentMonth =
    viewMonthDate.getFullYear() === todayDate.getFullYear() &&
    viewMonthDate.getMonth() === todayDate.getMonth();

  const formattedHeaderDate = todayDate.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'short'
  });

  const monthYearLabel = viewMonthDate.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric'
  });

  // Cálculo exacto de 7 columnas perfectas (Lunes a Domingo)
  const viewYear = viewMonthDate.getFullYear();
  const viewMonth = viewMonthDate.getMonth();
  const daysInViewMonthCount = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInMonthArray = Array.from({ length: daysInViewMonthCount }, (_, i) => i + 1);

  // 0: Domingo, 1: Lunes, ... 6: Sábado
  const rawFirstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  // Convertir a formato Europeo (0: Lunes, 1: Martes, ... 6: Domingo)
  const startPaddingSlotsCount = (rawFirstDayOfWeek + 6) % 7;
  const paddingSlotsArray = Array.from({ length: startPaddingSlotsCount }, (_, i) => i);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Cabecera Principal Estilo Apple Fitness Dinámica según la Pestaña Activa */}
      <View style={[styles.header, { paddingTop: topInset }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greetingTitle}>{TAB_TITLES[activeTab]}</Text>
          <Text style={styles.dateSubtitle}>{formattedHeaderDate}</Text>
        </View>
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => handleTabPress('profile', 3)}
        >
          <Text style={styles.avatarText}>{userProfile.name.substring(0, 2).toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      {/* Contenido Deslizable (Swipe Pager) con Tipografía Deportiva */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.pagerStyle}
      >
        {/* Pantalla 1: Resumen Dashboard (Estadísticas Reales SQLite) */}
        <ScrollView style={styles.pageContainer} contentContainerStyle={styles.scrollContent}>
          {/* Widget Grande: Anillos / Resumen de Métricas Reales */}
          <View style={styles.appleWidget}>
            <View style={styles.widgetHeaderRow}>
              <Text style={styles.widgetHeaderTitleCompact}>
                Métricas de Atleta
              </Text>
              <TouchableOpacity
                style={styles.moreStatsBtnVisible}
                onPress={() => setShowStatsModal(true)}
              >
                <Ionicons name="analytics" size={14} color={colors.primary} />
                <Text style={styles.moreStatsBtnText}>Stats</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.ringsRow}>
              {/* Indicador Visual Simulado */}
              <View style={styles.ringsVisualContainer}>
                <View style={[styles.ringOuter, { borderColor: colors.secondary }]}>
                  <View style={[styles.ringMiddle, { borderColor: colors.primary }]}>
                    <View style={[styles.ringInner, { borderColor: colors.cyan }]} />
                  </View>
                </View>
              </View>

              {/* Lista de Métricas Reales de SQLite */}
              <View style={styles.metricsList}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Volumen Acumulado</Text>
                  <Text style={[styles.metricValue, { color: colors.secondary }]}>
                    {stats.totalVolumeKg.toLocaleString()} <Text style={styles.metricUnit}>KG</Text>
                  </Text>
                </View>

                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Sesiones Completadas</Text>
                  <Text style={[styles.metricValue, { color: colors.primary }]}>
                    {stats.totalSessions} <Text style={styles.metricUnit}>SESIONES</Text>
                  </Text>
                </View>

                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Series Registradas</Text>
                  <Text style={[styles.metricValue, { color: colors.cyan }]}>
                    {stats.totalSets} <Text style={styles.metricUnit}>SERIES</Text>
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Widget de Historial Mensual Interactivo en Rejilla de 7 Columnas Estrictas */}
          <View style={styles.appleWidget}>
            <View style={styles.widgetTopHeader}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Text style={styles.widgetGridTitle}>Días Entrenados</Text>
                <Text style={styles.widgetSubLabel}>
                  {monthYearLabel.charAt(0).toUpperCase() + monthYearLabel.slice(1)}
                </Text>
              </View>
              
              {/* Insignia de Racha Ultra Compacta */}
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={13} color={colors.primary} />
                <Text style={styles.streakText}>
                  {stats.currentStreakDays} {stats.currentStreakDays === 1 ? 'día' : 'días'}
                </Text>
              </View>
            </View>

            {/* Selector de Meses con Chevrons Inmune a Recortes */}
            <View style={styles.monthNavRow}>
              <TouchableOpacity style={styles.monthNavIconBtn} onPress={handlePrevMonth}>
                <Ionicons name="chevron-back" size={18} color={colors.primary} />
              </TouchableOpacity>

              <View style={styles.monthCurrentCenterContainer}>
                <Text style={styles.monthCurrentText}>
                  {stats.trainedDaysInSelectedMonth.length} días activos
                </Text>
              </View>

              <TouchableOpacity style={styles.monthNavIconBtn} onPress={handleNextMonth}>
                <Ionicons name="chevron-forward" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Días de la Semana Header (L, M, X, J, V, S, D) */}
            <View style={styles.weekDaysHeaderGrid}>
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, idx) => (
                <Text key={idx} style={[styles.weekDayTextGrid, { width: DAY_CELL_WIDTH }]}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Matriz Mensual Dinámica Estricta de 7 Columnas Exactas */}
            <View style={styles.calendarGridStrict}>
              {/* Huecos vacíos de inicio de mes */}
              {paddingSlotsArray.map((p) => (
                <View key={`pad_${p}`} style={[styles.calendarCellContainer, { width: DAY_CELL_WIDTH }]}>
                  <View style={styles.calendarDotBlank} />
                </View>
              ))}

              {/* Días del mes en celdas de ancho exacto */}
              {daysInMonthArray.map((day) => {
                const trained = stats.trainedDaysInSelectedMonth.includes(day);
                const isToday = isViewingCurrentMonth && day === todayDate.getDate();

                return (
                  <View key={day} style={[styles.calendarCellContainer, { width: DAY_CELL_WIDTH }]}>
                    <View
                      style={[
                        styles.calendarDot,
                        trained && styles.calendarDotTrained,
                        isToday && styles.calendarDotToday
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarDotText,
                          (trained || isToday) && styles.calendarDotTextWhite
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Fila de 2 Widgets Secundarios: Reps & Esfuerzo RPE */}
          <View style={styles.widgetGridRow}>
            {/* Widget Izquierda: Total Series */}
            <View style={[styles.appleWidget, styles.halfWidget]}>
              <Text style={styles.widgetGridTitle}>Total Series</Text>
              <Text style={styles.widgetSubLabel}>Histórico Local</Text>
              <Text style={[styles.widgetBigNumber, { color: colors.purple }]}>
                {stats.totalSets}
              </Text>
              
              <View style={styles.miniBarChart}>
                <View style={[styles.bar, { height: '40%', backgroundColor: colors.purple + '60' }]} />
                <View style={[styles.bar, { height: '70%', backgroundColor: colors.purple + '60' }]} />
                <View style={[styles.bar, { height: '100%', backgroundColor: colors.purple }]} />
                <View style={[styles.bar, { height: '60%', backgroundColor: colors.purple + '60' }]} />
                <View style={[styles.bar, { height: '85%', backgroundColor: colors.purple }]} />
              </View>
            </View>

            {/* Widget Derecha: Intensidad RPE Medio */}
            <View style={[styles.appleWidget, styles.halfWidget]}>
              <Text style={styles.widgetGridTitle}>Esfuerzo (RPE)</Text>
              <Text style={styles.widgetSubLabel}>Promedio</Text>
              <Text style={[styles.widgetBigNumber, { color: colors.cyan }]}>
                {stats.avgRpe > 0 ? stats.avgRpe : '0.0'}
              </Text>

              <View style={styles.miniBarChart}>
                <View style={[styles.bar, { height: '50%', backgroundColor: colors.cyan + '60' }]} />
                <View style={[styles.bar, { height: '90%', backgroundColor: colors.cyan }]} />
                <View style={[styles.bar, { height: '70%', backgroundColor: colors.cyan + '60' }]} />
                <View style={[styles.bar, { height: '100%', backgroundColor: colors.cyan }]} />
                <View style={[styles.bar, { height: '85%', backgroundColor: colors.cyan }]} />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Pantalla 2: Rutinas */}
        <ScrollView style={styles.pageContainer} contentContainerStyle={styles.scrollContent}>
          <View style={styles.appleWidget}>
            <Text style={styles.widgetHeaderTitle}>Rutinas Prediseñadas</Text>
            <Text style={styles.routineDesc}>
              Selecciona una rutina para iniciar una sesión con pesos e incrementos automatizados.
            </Text>
          </View>
        </ScrollView>

        {/* Pantalla 3: Catálogo de Ejercicios */}
        <ScrollView style={styles.pageContainer} contentContainerStyle={styles.scrollContent}>
          <View style={styles.appleWidget}>
            <Text style={styles.widgetHeaderTitle}>Catálogo de Ejercicios</Text>
            <Text style={styles.routineDesc}>
              Buscador con más de 1.500 ejercicios filtrables por grupo muscular y equipamiento.
            </Text>
          </View>
        </ScrollView>

        {/* Pantalla 4: Perfil de Atleta + Estadísticas Integradas */}
        <ScrollView style={styles.pageContainer} contentContainerStyle={styles.scrollContent}>
          {/* Card 1: Datos Personales */}
          <View style={styles.appleWidget}>
            <Text style={styles.widgetHeaderTitle}>Perfil de Atleta</Text>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Nombre</Text>
              <Text style={styles.profileValue}>{userProfile.name}</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Edad</Text>
              <Text style={styles.profileValue}>{userProfile.age} años</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Sexo</Text>
              <Text style={styles.profileValue}>
                {userProfile.sex === 'male' ? 'Masculino' : 'Femenino'}
              </Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Peso Corporal</Text>
              <Text style={styles.profileValue}>{userProfile.bodyWeightKg} kg</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Nivel</Text>
              <Text style={styles.profileValue}>{userProfile.experienceLevel.toUpperCase()}</Text>
            </View>
          </View>

          {/* Card 2: Estadísticas del Perfil en Tarjetas de Bloque Amplio */}
          <View style={styles.appleWidget}>
            <Text style={[styles.widgetHeaderTitle, { color: colors.primary }]}>
              Estadísticas & Récords (PRs)
            </Text>
            
            <View style={styles.profileBlockCard}>
              <Text style={styles.profileBlockLabel}>Volumen Acumulado</Text>
              <Text style={[styles.profileBlockValue, { color: colors.secondary }]}>
                {stats.totalVolumeKg.toLocaleString()} kg
              </Text>
            </View>
            
            <View style={styles.profileBlockCard}>
              <Text style={styles.profileBlockLabel}>1RM Máximo Histórico</Text>
              <Text style={[styles.profileBlockValue, { color: colors.primary }]}>
                {stats.max1RM > 0 ? `${stats.max1RM} kg` : 'Sin registro'}
              </Text>
            </View>

            <View style={styles.profileBlockCard}>
              <Text style={styles.profileBlockLabel}>Racha Actual</Text>
              <Text style={[styles.profileBlockValue, { color: colors.cyan }]}>
                {stats.currentStreakDays} {stats.currentStreakDays === 1 ? 'día' : 'días'}
              </Text>
            </View>
          </View>

          {/* Card 3: Marcas Adaptativas por Ejercicio Clave */}
          <View style={styles.appleWidget}>
            <Text style={styles.widgetHeaderTitle}>Mejores Marcas por Ejercicio</Text>

            {stats.exercisePRs.length > 0 ? (
              stats.exercisePRs.map((pr) => (
                <View key={pr.exerciseId} style={styles.prRowItem}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.prExerciseName}>{pr.exerciseName}</Text>
                    <Text style={styles.prSubText}>
                      Max Peso: {pr.maxWeightKg} kg · 1RM: {pr.maxEstimated1RM} kg
                    </Text>
                  </View>
                  <View style={styles.prRankBadge}>
                    <Text style={styles.prRankText}>
                      {pr.rankEmoji} {pr.rankLabel}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyPrContainer}>
                <Text style={styles.emptyPrText}>
                  Aún no has registrado series completadas. Tus mejores marcas por ejercicio aparecerán aquí automáticamente.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </ScrollView>

      {/* Modal de Estadísticas Translúcido que CUBRE 100% HASTA EL BORDE INFERIOR */}
      <Modal
        visible={showStatsModal}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setShowStatsModal(false)}
      >
        <View style={styles.modalOverlayFullBottom}>
          <BlurView intensity={Platform.OS === 'ios' ? 95 : 100} tint="dark" style={styles.modalContainerFullBottom}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Informe de Atleta</Text>
              <TouchableOpacity onPress={() => setShowStatsModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.statGridCard}>
                <Text style={styles.statGridLabel}>1RM Máximo Estimado</Text>
                <Text style={[styles.statGridValue, { color: colors.primary }]}>
                  {stats.max1RM > 0 ? `${stats.max1RM} KG` : 'Sin registro'}
                </Text>
              </View>

              <View style={styles.statGridCard}>
                <Text style={styles.statGridLabel}>Volumen Promedio por Sesión</Text>
                <Text style={[styles.statGridValue, { color: colors.cyan }]}>
                  {stats.avgVolumePerSession > 0 ? `${stats.avgVolumePerSession.toLocaleString()} KG` : '0 KG'}
                </Text>
              </View>

              <View style={styles.statGridCard}>
                <Text style={styles.statGridLabel}>Racha Más Larga</Text>
                <Text style={[styles.statGridValue, { color: colors.purple }]}>
                  {stats.bestStreakDays} Días
                </Text>
              </View>

              <View style={styles.statGridCard}>
                <Text style={styles.statGridLabel}>Intensidad RPE Medio</Text>
                <Text style={[styles.statGridValue, { color: colors.secondary }]}>
                  {stats.avgRpe > 0 ? `${stats.avgRpe} RPE` : '0.0'}
                </Text>
              </View>

              {/* Récords Adaptativos por Ejercicio dentro del Modal */}
              <Text style={[styles.widgetHeaderTitle, { marginTop: 12, marginBottom: 12 }]}>
                Marcas Personales (PRs)
              </Text>

              {stats.exercisePRs.length > 0 ? (
                stats.exercisePRs.map((pr) => (
                  <View key={`modal_${pr.exerciseId}`} style={styles.prRowItem}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.prExerciseName}>{pr.exerciseName}</Text>
                      <Text style={styles.prSubText}>
                        Max Peso: {pr.maxWeightKg} kg · 1RM: {pr.maxEstimated1RM} kg
                      </Text>
                    </View>
                    <View style={styles.prRankBadge}>
                      <Text style={styles.prRankText}>
                        {pr.rankEmoji} {pr.rankLabel}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyPrText}>
                  Completa tu primera sesión de entrenamiento para calcular tus marcas en tiempo real.
                </Text>
              )}
            </ScrollView>
          </BlurView>
        </View>
      </Modal>

      {/* Barra Flotante Translucida de Navegación con Textos Anti-overflow */}
      <View style={[styles.floatingNavContainer, { bottom: bottomInset }]}>
        <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} tint="dark" style={styles.glassBar}>
          <TouchableOpacity
            style={[styles.glassNavItem, activeTab === 'home' && styles.glassNavItemActive]}
            onPress={() => handleTabPress('home', 0)}
          >
            <Ionicons
              name={activeTab === 'home' ? 'grid' : 'grid-outline'}
              size={18}
              color={activeTab === 'home' ? colors.primary : '#8E8E93'}
            />
            <Text
              style={[styles.glassNavLabel, activeTab === 'home' && styles.glassNavLabelActive]}
              numberOfLines={1}
            >
              Resumen
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.glassNavItem, activeTab === 'routines' && styles.glassNavItemActive]}
            onPress={() => handleTabPress('routines', 1)}
          >
            <Ionicons
              name={activeTab === 'routines' ? 'flame' : 'flame-outline'}
              size={18}
              color={activeTab === 'routines' ? colors.primary : '#8E8E93'}
            />
            <Text
              style={[styles.glassNavLabel, activeTab === 'routines' && styles.glassNavLabelActive]}
              numberOfLines={1}
            >
              Rutinas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.glassNavItem, activeTab === 'catalog' && styles.glassNavItemActive]}
            onPress={() => handleTabPress('catalog', 2)}
          >
            <Ionicons
              name={activeTab === 'catalog' ? 'barbell' : 'barbell-outline'}
              size={18}
              color={activeTab === 'catalog' ? colors.primary : '#8E8E93'}
            />
            <Text
              style={[styles.glassNavLabel, activeTab === 'catalog' && styles.glassNavLabelActive]}
              numberOfLines={1}
            >
              Ejercicios
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.glassNavItem, activeTab === 'profile' && styles.glassNavItemActive]}
            onPress={() => handleTabPress('profile', 3)}
          >
            <Ionicons
              name={activeTab === 'profile' ? 'person' : 'person-outline'}
              size={18}
              color={activeTab === 'profile' ? colors.primary : '#8E8E93'}
            />
            <Text
              style={[styles.glassNavLabel, activeTab === 'profile' && styles.glassNavLabelActive]}
              numberOfLines={1}
            >
              Perfil
            </Text>
          </TouchableOpacity>
        </BlurView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  loadingText: {
    color: colors.textSecondary,
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12
  },
  greetingTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.headingBold,
    fontSize: 30,
    letterSpacing: -0.5,
    includeFontPadding: false
  },
  dateSubtitle: {
    color: colors.textSecondary,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    marginTop: 2,
    includeFontPadding: false
  },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8
  },
  avatarText: {
    color: colors.textPrimary,
    fontFamily: fonts.headingBold,
    fontSize: 13
  },
  pagerStyle: {
    flex: 1
  },
  pageContainer: {
    width: SCREEN_WIDTH
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 140
  },
  appleWidget: {
    backgroundColor: colors.surface,
    borderColor: colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: radii.xl,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 14
  },
  widgetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  widgetHeaderTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.headingBold,
    fontSize: 17,
    marginBottom: 12,
    includeFontPadding: false
  },
  widgetHeaderTitleCompact: {
    color: colors.textPrimary,
    fontFamily: fonts.headingBold,
    fontSize: 15,
    flex: 1,
    marginRight: 6,
    includeFontPadding: false
  },
  moreStatsBtnVisible: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '25',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.primary
  },
  moreStatsBtnText: {
    color: colors.primary,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    marginLeft: 4,
    includeFontPadding: false
  },
  widgetTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  widgetGridTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.headingBold,
    fontSize: 15,
    includeFontPadding: false
  },
  widgetSubLabel: {
    color: colors.textSecondary,
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    marginTop: 2,
    includeFontPadding: false
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radii.full
  },
  streakText: {
    color: colors.primary,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    marginLeft: 4,
    includeFontPadding: false
  },
  monthNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.md,
    marginBottom: 14
  },
  monthNavIconBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: colors.border,
    borderWidth: 1
  },
  monthCurrentCenterContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8
  },
  monthCurrentText: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    textAlign: 'center',
    includeFontPadding: false
  },
  weekDaysHeaderGrid: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8
  },
  weekDayTextGrid: {
    color: colors.textSecondary,
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    textAlign: 'center'
  },
  calendarGridStrict: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start'
  },
  calendarCellContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 3
  },
  calendarDotBlank: {
    width: 30,
    height: 30
  },
  calendarDot: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center'
  },
  calendarDotTrained: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4
  },
  calendarDotToday: {
    borderColor: '#FFFFFF',
    borderWidth: 1.5
  },
  calendarDotText: {
    fontFamily: fonts.headingSemiBold,
    fontSize: 11,
    color: colors.textMuted
  },
  calendarDotTextWhite: {
    color: '#FFFFFF',
    fontFamily: fonts.headingBold
  },
  ringsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  ringsVisualContainer: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center'
  },
  ringOuter: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 7,
    justifyContent: 'center',
    alignItems: 'center'
  },
  ringMiddle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 7,
    justifyContent: 'center',
    alignItems: 'center'
  },
  ringInner: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 7
  },
  metricsList: {
    flex: 1,
    marginLeft: 14
  },
  metricItem: {
    marginBottom: 6
  },
  metricLabel: {
    color: colors.textSecondary,
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    includeFontPadding: false
  },
  metricValue: {
    fontFamily: fonts.headingBold,
    fontSize: 16,
    marginTop: 1,
    includeFontPadding: false
  },
  metricUnit: {
    fontFamily: fonts.headingSemiBold,
    fontSize: 10
  },
  widgetGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  halfWidget: {
    width: (SCREEN_WIDTH - 44) / 2,
    marginBottom: 0
  },
  widgetBigNumber: {
    fontFamily: fonts.headingBold,
    fontSize: 26,
    marginVertical: 4,
    includeFontPadding: false
  },
  miniBarChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 32,
    justifyContent: 'space-between',
    marginTop: 6
  },
  bar: {
    width: 5,
    borderRadius: 3
  },
  routineDesc: {
    color: colors.textSecondary,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
    includeFontPadding: false
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight
  },
  profileLabel: {
    color: colors.textSecondary,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    flex: 1,
    marginRight: 8,
    includeFontPadding: false
  },
  profileValue: {
    color: colors.textPrimary,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    textAlign: 'right',
    includeFontPadding: false
  },
  profileBlockCard: {
    backgroundColor: colors.surfaceLight,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    marginBottom: 10,
    borderColor: colors.border,
    borderWidth: 1
  },
  profileBlockLabel: {
    color: colors.textSecondary,
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    marginBottom: 2,
    includeFontPadding: false
  },
  profileBlockValue: {
    fontFamily: fonts.headingBold,
    fontSize: 18,
    includeFontPadding: false
  },
  prRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    marginBottom: 8,
    borderColor: colors.border,
    borderWidth: 1
  },
  prExerciseName: {
    color: colors.textPrimary,
    fontFamily: fonts.headingBold,
    fontSize: 13,
    includeFontPadding: false
  },
  prSubText: {
    color: colors.textSecondary,
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    marginTop: 2,
    includeFontPadding: false
  },
  prRankBadge: {
    backgroundColor: colors.primary + '20',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
    borderColor: colors.primary,
    borderWidth: 1
  },
  prRankText: {
    color: colors.primary,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    includeFontPadding: false
  },
  emptyPrContainer: {
    paddingVertical: 12
  },
  emptyPrText: {
    color: colors.textSecondary,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic'
  },
  modalOverlayFullBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
    width: '100%',
    height: '100%'
  },
  modalContainerFullBottom: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 32,
    maxHeight: '90%',
    width: '100%',
    borderColor: colors.border,
    borderWidth: 1
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  modalTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.headingBold,
    fontSize: 20,
    includeFontPadding: false
  },
  closeBtn: {
    padding: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: radii.full
  },
  modalBody: {
    marginBottom: 10
  },
  statGridCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: radii.lg,
    padding: 14,
    marginBottom: 10,
    borderColor: colors.border,
    borderWidth: 1
  },
  statGridLabel: {
    color: colors.textSecondary,
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    marginBottom: 4,
    includeFontPadding: false
  },
  statGridValue: {
    fontFamily: fonts.headingBold,
    fontSize: 20,
    includeFontPadding: false
  },
  floatingNavContainer: {
    position: 'absolute',
    left: 14,
    right: 14,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: 'rgba(28, 28, 30, 0.94)',
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12
  },
  glassBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 6,
    paddingHorizontal: 4,
    backgroundColor: 'transparent'
  },
  glassNavItem: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  glassNavItemActive: {
    backgroundColor: '#3A3A3C'
  },
  glassNavLabel: {
    color: '#8E8E93',
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: -0.2,
    marginTop: 2,
    textAlign: 'center',
    includeFontPadding: false
  },
  glassNavLabelActive: {
    color: colors.primary,
    fontFamily: fonts.bodyBold
  }
});
