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
// Shadcn components inlined - Metro can't resolve @components/ui alias without babel plugin

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

      <View style={[styles.header, { paddingTop: topInset }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greetingTitle}>{TAB_TITLES[activeTab]}</Text>
          <Text style={styles.dateSubtitle}>{formattedHeaderDate}</Text>
        </View>
        <TouchableOpacity style={styles.avatarButton} onPress={() => handleTabPress('profile', 3)}>
          <Text style={styles.avatarText}>{userProfile.name.substring(0, 2).toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView ref={scrollViewRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={handleScroll} style={styles.pagerStyle}>
        {/* P1: Resumen */}
        <ScrollView style={styles.pageContainer} contentContainerStyle={styles.scrollContent}>
          <View style={styles.widget}>
            <Text style={styles.wTitle}>Métricas de Atleta</Text>
            <TouchableOpacity style={styles.pillBtn} onPress={() => setShowStatsModal(true)}>
              <Ionicons name="analytics" size={14} color={colors.primary} />
              <Text style={styles.pillBtnText}>Estadísticas</Text>
            </TouchableOpacity>

            <View style={styles.ringsRow}>
              <View style={styles.ringsVisualContainer}>
                <View style={[styles.ringOuter, { borderColor: colors.secondary }]}>
                  <View style={[styles.ringMiddle, { borderColor: colors.primary }]}>
                    <View style={[styles.ringInner, { borderColor: colors.cyan }]} />
                  </View>
                </View>
              </View>
              <View style={styles.metricsList}>
                <View style={styles.mItem}><Text style={styles.mLabel}>Volumen</Text><Text style={[styles.mVal, { color: colors.secondary }]}>{stats.totalVolumeKg.toLocaleString()} KG</Text></View>
                <View style={styles.mItem}><Text style={styles.mLabel}>Sesiones</Text><Text style={[styles.mVal, { color: colors.primary }]}>{stats.totalSessions}</Text></View>
                <View style={styles.mItem}><Text style={styles.mLabel}>Series</Text><Text style={[styles.mVal, { color: colors.cyan }]}>{stats.totalSets}</Text></View>
              </View>
            </View>
          </View>

          <View style={styles.widget}>
            <Text style={styles.wTitle}>Días Entrenados</Text>
            <Text style={styles.wSub}>{monthYearLabel.charAt(0).toUpperCase() + monthYearLabel.slice(1)}</Text>
            <View style={styles.streakRow}>
              <Ionicons name="flame" size={14} color={colors.primary} />
              <Text style={styles.streakTxt}>Racha: {stats.currentStreakDays} {stats.currentStreakDays === 1 ? 'día' : 'días'}</Text>
            </View>

            <View style={styles.monthNav}>
              <TouchableOpacity style={styles.monthIconBtn} onPress={handlePrevMonth}>
                <Ionicons name="chevron-back" size={20} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.monthCenter}>{stats.trainedDaysInSelectedMonth.length} días activos</Text>
              <TouchableOpacity style={styles.monthIconBtn} onPress={handleNextMonth}>
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {['L','M','X','J','V','S','D'].map((d,i) => <Text key={i} style={[styles.weekDay, { width: DAY_CELL_WIDTH }]}>{d}</Text>)}
            </View>
            <View style={styles.calGrid}>
              {paddingSlotsArray.map(p => <View key={`p${p}`} style={[styles.calCell, { width: DAY_CELL_WIDTH }]}><View style={styles.calBlank} /></View>)}
              {daysInMonthArray.map(day => {
                const t = stats.trainedDaysInSelectedMonth.includes(day);
                const today = isViewingCurrentMonth && day === todayDate.getDate();
                return (
                  <View key={day} style={[styles.calCell, { width: DAY_CELL_WIDTH }]}>
                    <View style={[styles.calDot, t && styles.calDotActive, today && styles.calDotToday]}>
                      <Text style={[styles.calDotTxt, (t || today) && styles.calDotTxtW]}>{day}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.widgetGridRow}>
            <View style={[styles.widget, styles.halfW]}>
              <Text style={styles.wTitleSm}>Total Series</Text>
              <Text style={[styles.bigNum, { color: colors.purple }]}>{stats.totalSets}</Text>
              <View style={styles.miniBarChart}>
                <View style={[styles.bar, { height: '40%', backgroundColor: colors.purple + '60' }]} />
                <View style={[styles.bar, { height: '70%', backgroundColor: colors.purple + '60' }]} />
                <View style={[styles.bar, { height: '100%', backgroundColor: colors.purple }]} />
                <View style={[styles.bar, { height: '60%', backgroundColor: colors.purple + '60' }]} />
                <View style={[styles.bar, { height: '85%', backgroundColor: colors.purple }]} />
              </View>
            </View>
            <View style={[styles.widget, styles.halfW]}>
              <Text style={styles.wTitleSm}>RPE Medio</Text>
              <Text style={[styles.bigNum, { color: colors.cyan }]}>{stats.avgRpe > 0 ? stats.avgRpe : '0.0'}</Text>
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

        {/* P2: Rutinas */}
        <ScrollView style={styles.pageContainer} contentContainerStyle={styles.scrollContent}>
          <View style={styles.widget}><Text style={styles.wTitle}>Rutinas Prediseñadas</Text><Text style={styles.wSub}>Selecciona una rutina para iniciar una sesión con pesos e incrementos automatizados.</Text></View>
        </ScrollView>

        {/* P3: Ejercicios */}
        <ScrollView style={styles.pageContainer} contentContainerStyle={styles.scrollContent}>
          <View style={styles.widget}><Text style={styles.wTitle}>Catálogo de Ejercicios</Text><Text style={styles.wSub}>Buscador con más de 1.500 ejercicios filtrables por grupo muscular y equipamiento.</Text></View>
        </ScrollView>

        {/* P4: Perfil */}
        <ScrollView style={styles.pageContainer} contentContainerStyle={styles.scrollContent}>
          <View style={styles.widget}>
            <Text style={styles.wTitle}>Perfil de Atleta</Text>
            <View style={styles.blockCard}><Text style={styles.bLabel}>Nombre</Text><Text style={styles.bVal}>{userProfile.name}</Text></View>
            <View style={styles.blockCard}><Text style={styles.bLabel}>Edad</Text><Text style={styles.bVal}>{userProfile.age} años</Text></View>
            <View style={styles.blockCard}><Text style={styles.bLabel}>Sexo</Text><Text style={styles.bVal}>{userProfile.sex === 'male' ? 'Masculino' : 'Femenino'}</Text></View>
            <View style={styles.blockCard}><Text style={styles.bLabel}>Peso Corporal</Text><Text style={styles.bVal}>{userProfile.bodyWeightKg} kg</Text></View>
            <View style={styles.blockCard}><Text style={styles.bLabel}>Nivel</Text><Text style={styles.bVal}>{userProfile.experienceLevel.toUpperCase()}</Text></View>
          </View>

          <View style={styles.widget}>
            <Text style={[styles.wTitle, { color: colors.primary }]}>Estadísticas & Récords</Text>
            <View style={styles.blockCard}><Text style={styles.bLabel}>Volumen Acumulado</Text><Text style={[styles.bVal, { color: colors.secondary }]}>{stats.totalVolumeKg.toLocaleString()} kg</Text></View>
            <View style={styles.blockCard}><Text style={styles.bLabel}>1RM Máximo</Text><Text style={[styles.bVal, { color: colors.primary }]}>{stats.max1RM > 0 ? `${stats.max1RM} kg` : 'Sin registro'}</Text></View>
            <View style={styles.blockCard}><Text style={styles.bLabel}>Racha Actual</Text><Text style={[styles.bVal, { color: colors.cyan }]}>{stats.currentStreakDays} {stats.currentStreakDays === 1 ? 'día' : 'días'}</Text></View>
          </View>

          <View style={styles.widget}>
            <Text style={styles.wTitle}>Mejores Marcas</Text>
            {stats.exercisePRs.length > 0 ? stats.exercisePRs.map(pr => (
              <View key={pr.exerciseId} style={styles.blockCard}>
                <Text style={styles.bVal}>{pr.exerciseName}</Text>
                <Text style={styles.bLabel}>Max: {pr.maxWeightKg} kg · 1RM: {pr.maxEstimated1RM} kg</Text>
                <Text style={[styles.bLabel, { color: colors.primary, marginTop: 4 }]}>{pr.rankEmoji} {pr.rankLabel}</Text>
              </View>
            )) : (
              <Text style={styles.wSub}>Aún no has registrado series. Tus marcas aparecerán aquí.</Text>
            )}
          </View>
        </ScrollView>
      </ScrollView>

      {/* Modal Estadísticas */}
      <Modal visible={showStatsModal} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setShowStatsModal(false)}>
        <View style={styles.modalOverlay}>
          <BlurView intensity={Platform.OS === 'ios' ? 95 : 100} tint="dark" style={styles.modalBox}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Informe de Atleta</Text>
              <TouchableOpacity onPress={() => setShowStatsModal(false)} style={styles.closeBtn}><Ionicons name="close" size={20} color={colors.textPrimary} /></TouchableOpacity>
            </View>
            <ScrollView style={{ marginBottom: 10 }} showsVerticalScrollIndicator={false}>
              <View style={styles.blockCard}><Text style={styles.bLabel}>1RM Máximo</Text><Text style={[styles.bVal, { color: colors.primary }]}>{stats.max1RM > 0 ? `${stats.max1RM} KG` : 'Sin registro'}</Text></View>
              <View style={styles.blockCard}><Text style={styles.bLabel}>Vol. Promedio/Sesión</Text><Text style={[styles.bVal, { color: colors.cyan }]}>{stats.avgVolumePerSession > 0 ? `${stats.avgVolumePerSession.toLocaleString()} KG` : '0 KG'}</Text></View>
              <View style={styles.blockCard}><Text style={styles.bLabel}>Racha Más Larga</Text><Text style={[styles.bVal, { color: colors.purple }]}>{stats.bestStreakDays} Días</Text></View>
              <View style={styles.blockCard}><Text style={styles.bLabel}>RPE Medio</Text><Text style={[styles.bVal, { color: colors.secondary }]}>{stats.avgRpe > 0 ? `${stats.avgRpe}` : '0.0'}</Text></View>
              <Text style={[styles.wTitle, { marginTop: 16 }]}>Marcas Personales</Text>
              {stats.exercisePRs.length > 0 ? stats.exercisePRs.map(pr => (
                <View key={`m_${pr.exerciseId}`} style={styles.blockCard}>
                  <Text style={styles.bVal}>{pr.exerciseName}</Text>
                  <Text style={styles.bLabel}>Max: {pr.maxWeightKg} kg · 1RM: {pr.maxEstimated1RM} kg</Text>
                </View>
              )) : <Text style={styles.wSub}>Completa tu primera sesión para ver tus marcas.</Text>}
            </ScrollView>
          </BlurView>
        </View>
      </Modal>

      {/* Nav Bar */}
      <View style={[styles.floatingNav, { bottom: bottomInset }]}>
        <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} tint="dark" style={styles.glassBar}>
          {(['home','routines','catalog','profile'] as const).map((tab, idx) => {
            const icons: Record<string, [string, string]> = { home: ['grid','grid-outline'], routines: ['flame','flame-outline'], catalog: ['barbell','barbell-outline'], profile: ['person','person-outline'] };
            const labels: Record<string, string> = { home: 'Inicio', routines: 'Rutinas', catalog: 'Ejercicios', profile: 'Perfil' };
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
  wSub: { color: colors.textSecondary, fontFamily: fonts.bodyRegular, fontSize: 13, textAlign: 'center', lineHeight: 20, includeFontPadding: false },

  // Pill button (Stats)
  pillBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '20', borderColor: colors.primary, borderWidth: 1, borderRadius: radii.full, paddingVertical: 6, paddingHorizontal: 14, marginBottom: 12 },
  pillBtnText: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 13, marginLeft: 6, includeFontPadding: false },

  // Streak badge
  streakRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '20', borderColor: colors.primary, borderWidth: 1, borderRadius: radii.full, paddingVertical: 5, paddingHorizontal: 12, marginBottom: 12 },
  streakTxt: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 13, marginLeft: 6, includeFontPadding: false },

  // Month navigation - icon buttons only, no text that can clip
  monthNav: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceLight, borderRadius: radii.md, paddingVertical: 6, paddingHorizontal: 8, marginBottom: 14, alignSelf: 'stretch' },
  monthIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  monthCenter: { flex: 1, color: colors.textPrimary, fontFamily: fonts.bodyBold, fontSize: 14, textAlign: 'center', includeFontPadding: false },

  // Rings & metrics
  ringsRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  ringsVisualContainer: { width: 90, height: 90, justifyContent: 'center', alignItems: 'center' },
  ringOuter: { width: 86, height: 86, borderRadius: 43, borderWidth: 7, justifyContent: 'center', alignItems: 'center' },
  ringMiddle: { width: 66, height: 66, borderRadius: 33, borderWidth: 7, justifyContent: 'center', alignItems: 'center' },
  ringInner: { width: 46, height: 46, borderRadius: 23, borderWidth: 7 },
  metricsList: { flex: 1, marginLeft: 14 },
  mItem: { marginBottom: 8, alignItems: 'center' },
  mLabel: { color: colors.textSecondary, fontFamily: fonts.bodyRegular, fontSize: 11, textAlign: 'center', includeFontPadding: false },
  mVal: { fontFamily: fonts.headingBold, fontSize: 16, textAlign: 'center', includeFontPadding: false },

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
  modalBox: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingHorizontal: 20, paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 44 : 32, maxHeight: '90%', borderColor: colors.border, borderWidth: 1 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: colors.textPrimary, fontFamily: fonts.headingBold, fontSize: 20, includeFontPadding: false },
  closeBtn: { padding: 8, backgroundColor: colors.surfaceLight, borderRadius: radii.full },

  // Floating Nav
  floatingNav: { position: 'absolute', left: 14, right: 14, borderRadius: 32, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(28,28,30,0.94)', zIndex: 9999, elevation: 10 },
  glassBar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 6, paddingHorizontal: 4, backgroundColor: 'transparent' },
  navItem: { flex: 1, paddingVertical: 8, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  navItemActive: { backgroundColor: '#3A3A3C' },
  navLabel: { color: '#8E8E93', fontFamily: fonts.bodySemiBold, fontSize: 10, marginTop: 2, textAlign: 'center', includeFontPadding: false },
  navLabelActive: { color: colors.primary, fontFamily: fonts.bodyBold }
});

