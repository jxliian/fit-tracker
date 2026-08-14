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
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { initDatabase } from '@database/schema/init';
import { seedExercises } from '@database/seeds/seed';
import { db } from '@database/client';
import { colors, radii } from '@core/theme/colors';
import { UserProfile, Sex, ExperienceLevel } from '@domain/entities/user-profile';
import { OnboardingScreen } from '@features/profile/ui/screens/OnboardingScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Ancho exacto de cada celda para 7 columnas perfectas
const GRID_PADDING = 40;
const DAY_CELL_WIDTH = Math.floor((SCREEN_WIDTH - GRID_PADDING - 40) / 7);

const TABS = ['home', 'routines', 'catalog', 'profile'] as const;
type TabType = typeof TABS[number];

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
}

export default function App() {
  const [fontsLoaded] = useFonts(Ionicons.font);
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
    trainedDaysInSelectedMonth: []
  });

  const scrollViewRef = useRef<ScrollView>(null);

  // Cargar perfil y datos reales de la base de datos SQLite
  const loadDatabaseData = async () => {
    try {
      await initDatabase();
      await seedExercises();

      // 1. Cargar Perfil
      const profile = await db.getFirstAsync<any>('SELECT * FROM user_profile LIMIT 1;');
      if (profile) {
        setUserProfile({
          id: profile.id,
          name: profile.name,
          age: profile.age,
          sex: profile.sex as Sex,
          heightCm: profile.height_cm,
          bodyWeightKg: profile.body_weight_kg,
          experienceLevel: profile.experience_level as ExperienceLevel,
          createdAt: profile.created_at
        });
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
        trainedDaysInSelectedMonth: trainedDays
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

      {/* Cabecera Principal Estilo Apple Fitness */}
      <View style={[styles.header, { paddingTop: topInset }]}>
        <View>
          <Text style={styles.greetingTitle}>Resumen</Text>
          <Text style={styles.dateSubtitle}>{formattedHeaderDate}</Text>
        </View>
        <TouchableOpacity style={styles.avatarButton}>
          <Text style={styles.avatarText}>{userProfile.name.substring(0, 2).toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      {/* Contenido Deslizable (Swipe Pager) con Widgets Apple Style */}
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
              <Text style={styles.widgetHeaderTitleCompact}>Métricas de Atleta</Text>
              <TouchableOpacity
                style={styles.moreStatsBtnVisible}
                onPress={() => setShowStatsModal(true)}
              >
                <Ionicons name="analytics" size={14} color={colors.primary} />
                <Text style={styles.moreStatsBtnText}>Más Stats</Text>
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
                    {stats.totalVolumeKg.toLocaleString()}{' '}
                    <Text style={styles.metricUnit}>KG</Text>
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
              <View>
                <Text style={styles.widgetGridTitle}>Días Entrenados</Text>
                <Text style={styles.widgetSubLabel}>
                  {monthYearLabel.charAt(0).toUpperCase() + monthYearLabel.slice(1)}
                </Text>
              </View>
              
              {/* Insignia de Racha */}
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={14} color={colors.primary} />
                <Text style={styles.streakText}>
                  Racha: {stats.currentStreakDays} {stats.currentStreakDays === 1 ? 'Día' : 'Días'}
                </Text>
              </View>
            </View>

            {/* Selector de Meses (Anterior / Siguiente) */}
            <View style={styles.monthNavRow}>
              <TouchableOpacity style={styles.monthNavBtn} onPress={handlePrevMonth}>
                <Ionicons name="chevron-back" size={16} color={colors.textPrimary} />
                <Text style={styles.monthNavBtnText}>Anterior</Text>
              </TouchableOpacity>

              <Text style={styles.monthCurrentText}>
                {stats.trainedDaysInSelectedMonth.length} días activos
              </Text>

              <TouchableOpacity style={styles.monthNavBtn} onPress={handleNextMonth}>
                <Text style={styles.monthNavBtnText}>Siguiente</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textPrimary} />
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

        {/* Pantalla 4: Perfil de Atleta */}
        <ScrollView style={styles.pageContainer} contentContainerStyle={styles.scrollContent}>
          <View style={styles.appleWidget}>
            <Text style={styles.widgetHeaderTitle}>Perfil de Atleta</Text>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Nombre:</Text>
              <Text style={styles.profileValue}>{userProfile.name}</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Edad:</Text>
              <Text style={styles.profileValue}>{userProfile.age} años</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Sexo:</Text>
              <Text style={styles.profileValue}>
                {userProfile.sex === 'male' ? 'Masculino' : 'Femenino'}
              </Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Peso Corporal:</Text>
              <Text style={styles.profileValue}>{userProfile.bodyWeightKg} kg</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Nivel:</Text>
              <Text style={styles.profileValue}>{userProfile.experienceLevel.toUpperCase()}</Text>
            </View>
          </View>
        </ScrollView>
      </ScrollView>

      {/* Modal de Estadísticas Detalladas (Informe de Atleta) */}
      <Modal
        visible={showStatsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStatsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={Platform.OS === 'ios' ? 90 : 100} tint="dark" style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Informe de Atleta</Text>
              <TouchableOpacity onPress={() => setShowStatsModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.statGridCard}>
                <Text style={styles.statGridLabel}>1RM Máximo Estimado</Text>
                <Text style={[styles.statGridValue, { color: colors.primary }]}>
                  {stats.max1RM > 0 ? `${stats.max1RM} KG` : 'N/A'}
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
            </ScrollView>
          </BlurView>
        </View>
      </Modal>

      {/* Barra Flotante Translucida de Navegación */}
      <View style={[styles.floatingNavContainer, { bottom: bottomInset }]}>
        <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} tint="dark" style={styles.glassBar}>
          <TouchableOpacity
            style={[styles.glassNavItem, activeTab === 'home' && styles.glassNavItemActive]}
            onPress={() => handleTabPress('home', 0)}
          >
            <Ionicons
              name={activeTab === 'home' ? 'grid' : 'grid-outline'}
              size={20}
              color={activeTab === 'home' ? colors.primary : '#8E8E93'}
            />
            <Text style={[styles.glassNavLabel, activeTab === 'home' && styles.glassNavLabelActive]}>
              Resumen
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.glassNavItem, activeTab === 'routines' && styles.glassNavItemActive]}
            onPress={() => handleTabPress('routines', 1)}
          >
            <Ionicons
              name={activeTab === 'routines' ? 'flame' : 'flame-outline'}
              size={20}
              color={activeTab === 'routines' ? colors.primary : '#8E8E93'}
            />
            <Text style={[styles.glassNavLabel, activeTab === 'routines' && styles.glassNavLabelActive]}>
              Rutinas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.glassNavItem, activeTab === 'catalog' && styles.glassNavItemActive]}
            onPress={() => handleTabPress('catalog', 2)}
          >
            <Ionicons
              name={activeTab === 'catalog' ? 'barbell' : 'barbell-outline'}
              size={20}
              color={activeTab === 'catalog' ? colors.primary : '#8E8E93'}
            />
            <Text style={[styles.glassNavLabel, activeTab === 'catalog' && styles.glassNavLabelActive]}>
              Ejercicios
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.glassNavItem, activeTab === 'profile' && styles.glassNavItemActive]}
            onPress={() => handleTabPress('profile', 3)}
          >
            <Ionicons
              name={activeTab === 'profile' ? 'person' : 'person-outline'}
              size={20}
              color={activeTab === 'profile' ? colors.primary : '#8E8E93'}
            />
            <Text style={[styles.glassNavLabel, activeTab === 'profile' && styles.glassNavLabelActive]}>
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
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingBottom: 12
  },
  greetingTitle: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5
  },
  dateSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    color: colors.textPrimary,
    fontWeight: '800',
    fontSize: 14
  },
  pagerStyle: {
    flex: 1
  },
  pageContainer: {
    width: SCREEN_WIDTH
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 140
  },
  appleWidget: {
    backgroundColor: colors.surface,
    borderColor: colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: 20,
    marginBottom: 16
  },
  widgetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  widgetHeaderTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800'
  },
  widgetHeaderTitleCompact: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    flex: 1
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
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 4
  },
  widgetTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  widgetGridTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800'
  },
  widgetSubLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radii.full
  },
  streakText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 4
  },
  monthNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    marginBottom: 14
  },
  monthNavBtn: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  monthNavBtnText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    marginHorizontal: 4
  },
  monthCurrentText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600'
  },
  weekDaysHeaderGrid: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 8
  },
  weekDayTextGrid: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
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
    width: 32,
    height: 32
  },
  calendarDot: {
    width: 32,
    height: 32,
    borderRadius: 10,
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
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted
  },
  calendarDotTextWhite: {
    color: '#FFFFFF',
    fontWeight: '800'
  },
  ringsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  ringsVisualContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center'
  },
  ringOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  ringMiddle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  ringInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 8
  },
  metricsList: {
    flex: 1,
    marginLeft: 20
  },
  metricItem: {
    marginBottom: 10
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600'
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 1
  },
  metricUnit: {
    fontSize: 11,
    fontWeight: '800'
  },
  widgetGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  halfWidget: {
    width: (SCREEN_WIDTH - 52) / 2,
    marginBottom: 0
  },
  widgetBigNumber: {
    fontSize: 32,
    fontWeight: '900',
    marginVertical: 6
  },
  miniBarChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 36,
    justifyContent: 'space-between',
    marginTop: 6
  },
  bar: {
    width: 6,
    borderRadius: 3
  },
  routineDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight
  },
  profileLabel: {
    color: colors.textSecondary,
    fontSize: 14
  },
  profileValue: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end'
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: 24,
    maxHeight: '75%',
    borderColor: colors.border,
    borderWidth: 1
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900'
  },
  closeBtn: {
    padding: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: radii.full
  },
  modalBody: {
    marginBottom: 20
  },
  statGridCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: radii.lg,
    padding: 16,
    marginBottom: 12,
    borderColor: colors.border,
    borderWidth: 1
  },
  statGridLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4
  },
  statGridValue: {
    fontSize: 22,
    fontWeight: '900'
  },
  floatingNavContainer: {
    position: 'absolute',
    left: 18,
    right: 18,
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
    paddingHorizontal: 6,
    backgroundColor: 'transparent'
  },
  glassNavItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  glassNavItemActive: {
    backgroundColor: '#3A3A3C'
  },
  glassNavLabel: {
    color: '#8E8E93',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2
  },
  glassNavLabelActive: {
    color: colors.primary,
    fontWeight: '800'
  }
});
