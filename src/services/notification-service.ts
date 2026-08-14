import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configurar el comportamiento de notificaciones locales en primer/segundo plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('workout-session', {
        name: 'Entrenamiento Activo',
        importance: Notifications.AndroidImportance.LOW,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF2366'
      });
    }

    return true;
  } catch (error) {
    console.error('Error solicitando permisos de notificación:', error);
    return false;
  }
}

export async function sendWorkoutNotification(
  workoutTitle: string,
  currentExerciseName: string,
  elapsedFormatted: string,
  restFormatted?: string
): Promise<string | null> {
  try {
    const bodyText = restFormatted
      ? `🏋️ ${currentExerciseName} · ⏱️ Tiempo: ${elapsedFormatted} · ⌛ Descanso: ${restFormatted}`
      : `🏋️ ${currentExerciseName} · ⏱️ Tiempo: ${elapsedFormatted}`;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏱️ Sesión en Curso: ${workoutTitle}`,
        body: bodyText,
        data: { active: true },
        sound: false
      },
      trigger: null // Envío inmediato / actualización continua
    });

    return id;
  } catch (error) {
    console.error('Error enviando notificación de entrenamiento:', error);
    return null;
  }
}

export async function cancelWorkoutNotifications(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch (error) {
    console.error('Error cancelando notificaciones:', error);
  }
}
