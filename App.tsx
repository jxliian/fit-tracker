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
  NativeSyntheticEvent,
  NativeScrollEvent
} from 'react-native';
import { BlurView } from 'expo-blur';
import { initDatabase } from '@database/schema/init';
import { seedExercises } from '@database/seeds/seed';
import { db } from '@database/client';
import { colors, radii } from '@core/theme/colors';
import { UserProfile, Sex, ExperienceLevel } from '@domain/entities/user-profile';
import { OnboardingScreen } from '@features/profile/ui/screens/OnboardingScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TABS = ['home', 'routines', 'catalog', 'profile'] as const;
type TabType = typeof TABS[number];

export default function App() {
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    async function prepareApp() {
      try {
        await initDatabase();
        await seedExercises();

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
      } catch (error) {
        console.error('Error al inicializar la base de datos de FitTracker:', error);
      } finally {
        setIsInitializing(false);
      }
    }

    prepareApp();
  }, []);

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

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando base de datos local...</Text>
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
  const bottomInset = Platform.OS === 'ios' ? 24 : 16;

  // Formato fecha estilo Apple Fitness ("viernes, 14 ago")
  const formattedDate = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'short'
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Cabecera Principal Estilo Apple Fitness */}
      <View style={[styles.header, { paddingTop: topInset }]}>
        <View>
          <Text style={styles.greetingTitle}>Resumen</Text>
          <Text style={styles.dateSubtitle}>{formattedDate}</Text>
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
        {/* Pantalla 1: Resumen Dashboard (Estilo Apple Fitness Widgets) */}
        <ScrollView style={styles.pageContainer} contentContainerStyle={styles.scrollContent}>
          {/* Widget Grande: Anillos / Resumen de Métricas */}
          <View style={styles.appleWidget}>
            <Text style={styles.widgetHeaderTitle}>Resumen de Entrenamiento</Text>
            
            <View style={styles.ringsRow}>
              {/* Indicador Visual Simulado */}
              <View style={styles.ringsVisualContainer}>
                <View style={[styles.ringOuter, { borderColor: colors.secondary }]}>
                  <View style={[styles.ringMiddle, { borderColor: colors.primary }]}>
                    <View style={[styles.ringInner, { borderColor: colors.cyan }]} />
                  </View>
                </View>
              </View>

              {/* Lista de Métricas Neon */}
              <View style={styles.metricsList}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Carga Levantada</Text>
                  <Text style={[styles.metricValue, { color: colors.secondary }]}>
                    4,850 <Text style={styles.metricUnit}>KCAL / KG</Text>
                  </Text>
                </View>

                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Tiempo de Sesión</Text>
                  <Text style={[styles.metricValue, { color: colors.primary }]}>
                    45/60 <Text style={styles.metricUnit}>MIN</Text>
                  </Text>
                </View>

                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel}>Series Efectivas</Text>
                  <Text style={[styles.metricValue, { color: colors.cyan }]}>
                    16/20 <Text style={styles.metricUnit}>SERIES</Text>
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Fila de 2 Widgets Secundarios */}
          <View style={styles.widgetGridRow}>
            {/* Widget Izquierda: Volumen */}
            <View style={[styles.appleWidget, styles.halfWidget]}>
              <Text style={styles.widgetGridTitle}>Conteo de Reps</Text>
              <Text style={styles.widgetSubLabel}>Hoy</Text>
              <Text style={[styles.widgetBigNumber, { color: colors.purple }]}>148</Text>
              
              {/* Gráfica de Barras Minimalista */}
              <View style={styles.miniBarChart}>
                <View style={[styles.bar, { height: '30%', backgroundColor: colors.purple + '60' }]} />
                <View style={[styles.bar, { height: '65%', backgroundColor: colors.purple + '60' }]} />
                <View style={[styles.bar, { height: '100%', backgroundColor: colors.purple }]} />
                <View style={[styles.bar, { height: '40%', backgroundColor: colors.purple + '60' }]} />
                <View style={[styles.bar, { height: '80%', backgroundColor: colors.purple }]} />
              </View>
            </View>

            {/* Widget Derecha: Intensidad RPE */}
            <View style={[styles.appleWidget, styles.halfWidget]}>
              <Text style={styles.widgetGridTitle}>Esfuerzo (RPE)</Text>
              <Text style={styles.widgetSubLabel}>Promedio</Text>
              <Text style={[styles.widgetBigNumber, { color: colors.cyan }]}>8.5</Text>

              {/* Gráfica de Barras Minimalista */}
              <View style={styles.miniBarChart}>
                <View style={[styles.bar, { height: '50%', backgroundColor: colors.cyan + '60' }]} />
                <View style={[styles.bar, { height: '90%', backgroundColor: colors.cyan }]} />
                <View style={[styles.bar, { height: '70%', backgroundColor: colors.cyan + '60' }]} />
                <View style={[styles.bar, { height: '100%', backgroundColor: colors.cyan }]} />
                <View style={[styles.bar, { height: '85%', backgroundColor: colors.cyan }]} />
              </View>
            </View>
          </View>

          {/* Widget Destacado: Rutina Recomendada */}
          <View style={styles.appleWidget}>
            <Text style={[styles.widgetHeaderTitle, { color: colors.primary }]}>Entrenamiento Sugerido</Text>
            <Text style={styles.routineTitle}>Torso / Sobrecarga Progresiva</Text>
            <Text style={styles.routineDesc}>4 Ejercicios · Recomienda +2.5kg en Press de Banca</Text>
            
            <TouchableOpacity style={styles.appleButton}>
              <Text style={styles.appleButtonText}>Iniciar Entrenamiento</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Pantalla 2: Rutinas */}
        <ScrollView style={styles.pageContainer} contentContainerStyle={styles.scrollContent}>
          <View style={styles.appleWidget}>
            <Text style={styles.widgetHeaderTitle}>Rutinas Prediseñadas</Text>
            <Text style={styles.routineDesc}>
              Rutinas Push, Pull y Legs integradas con el motor matemático de sobrecarga determinista.
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

      {/* Barra Flotante Translucida de Navegación Estilo Glassmorphism Apple con Visibilidad Alta */}
      <View style={[styles.floatingNavContainer, { bottom: bottomInset }]}>
        <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} tint="dark" style={styles.glassBar}>
          <TouchableOpacity
            style={[styles.glassNavItem, activeTab === 'home' && styles.glassNavItemActive]}
            onPress={() => handleTabPress('home', 0)}
          >
            <Text style={[styles.glassNavLabel, activeTab === 'home' && styles.glassNavLabelActive]}>
              Resumen
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.glassNavItem, activeTab === 'routines' && styles.glassNavItemActive]}
            onPress={() => handleTabPress('routines', 1)}
          >
            <Text style={[styles.glassNavLabel, activeTab === 'routines' && styles.glassNavLabelActive]}>
              Rutinas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.glassNavItem, activeTab === 'catalog' && styles.glassNavItemActive]}
            onPress={() => handleTabPress('catalog', 2)}
          >
            <Text style={[styles.glassNavLabel, activeTab === 'catalog' && styles.glassNavLabelActive]}>
              Ejercicios
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.glassNavItem, activeTab === 'profile' && styles.glassNavItemActive]}
            onPress={() => handleTabPress('profile', 3)}
          >
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
    paddingBottom: 120
  },
  appleWidget: {
    backgroundColor: colors.surface,
    borderColor: colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: 20,
    marginBottom: 16
  },
  widgetHeaderTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16
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
  routineTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4
  },
  routineDesc: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14
  },
  appleButton: {
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: radii.md,
    alignItems: 'center'
  },
  appleButtonText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.3
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
    paddingVertical: 11,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  glassNavItemActive: {
    backgroundColor: '#3A3A3C'
  },
  glassNavLabel: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '700'
  },
  glassNavLabelActive: {
    color: colors.primary,
    fontWeight: '800'
  }
});
