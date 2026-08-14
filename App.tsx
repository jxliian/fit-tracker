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
import { initDatabase } from '@database/schema/init';
import { seedExercises } from '@database/seeds/seed';
import { db } from '@database/client';
import { colors } from '@core/theme/colors';
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
  const bottomInset = Platform.OS === 'ios' ? 36 : 32;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Cabecera Principal */}
      <View style={[styles.header, { paddingTop: topInset }]}>
        <View>
          <Text style={styles.greetingText}>Hola, {userProfile.name}</Text>
          <Text style={styles.subGreetingText}>Panel de Entrenamiento</Text>
        </View>
        <View style={styles.profileBadge}>
          <Text style={styles.profileBadgeText}>{userProfile.bodyWeightKg} kg</Text>
        </View>
      </View>

      {/* Contenido Deslizable de Izquierda a Derecha (Swipe Pager) */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.pagerStyle}
      >
        {/* Pantalla 1: Inicio */}
        <View style={styles.pageContainer}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Inicio Rápido</Text>
            <Text style={styles.cardSubtitle}>
              Comienza una sesión en blanco o selecciona una rutina de tu catálogo.
            </Text>
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Empezar Entrenamiento Libre</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Pantalla 2: Rutinas */}
        <View style={styles.pageContainer}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Rutinas Prediseñadas</Text>
            <Text style={styles.cardSubtitle}>
              Rutinas Push, Pull y Legs integradas con motor de sobrecarga automática.
            </Text>
          </View>
        </View>

        {/* Pantalla 3: Ejercicios */}
        <View style={styles.pageContainer}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Catálogo de Ejercicios</Text>
            <Text style={styles.cardSubtitle}>
              Buscador con más de 1.500 ejercicios filtrables por grupo muscular y equipamiento.
            </Text>
          </View>
        </View>

        {/* Pantalla 4: Perfil */}
        <View style={styles.pageContainer}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Perfil de Atleta</Text>
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
        </View>
      </ScrollView>

      {/* Barra de Navegación Inferior con Margen de Seguridad Inferior */}
      <View style={[styles.bottomNav, { paddingBottom: bottomInset }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => handleTabPress('home', 0)}>
          <View style={[styles.navIndicator, activeTab === 'home' && styles.navIndicatorActive]} />
          <Text style={[styles.navLabel, activeTab === 'home' && styles.navLabelActive]}>
            INICIO
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => handleTabPress('routines', 1)}>
          <View style={[styles.navIndicator, activeTab === 'routines' && styles.navIndicatorActive]} />
          <Text style={[styles.navLabel, activeTab === 'routines' && styles.navLabelActive]}>
            RUTINAS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => handleTabPress('catalog', 2)}>
          <View style={[styles.navIndicator, activeTab === 'catalog' && styles.navIndicatorActive]} />
          <Text style={[styles.navLabel, activeTab === 'catalog' && styles.navLabelActive]}>
            EJERCICIOS
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => handleTabPress('profile', 3)}>
          <View style={[styles.navIndicator, activeTab === 'profile' && styles.navIndicatorActive]} />
          <Text style={[styles.navLabel, activeTab === 'profile' && styles.navLabelActive]}>
            PERFIL
          </Text>
        </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingBottom: 16
  },
  greetingText: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800'
  },
  subGreetingText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2
  },
  profileBadge: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20
  },
  profileBadgeText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13
  },
  pagerStyle: {
    flex: 1
  },
  pageContainer: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 20,
    paddingTop: 8
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 20
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6
  },
  cardSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
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
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-around'
  },
  navItem: {
    alignItems: 'center'
  },
  navIndicator: {
    width: 16,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginBottom: 4
  },
  navIndicatorActive: {
    backgroundColor: colors.primary
  },
  navLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8
  },
  navLabelActive: {
    color: colors.primary
  }
});
