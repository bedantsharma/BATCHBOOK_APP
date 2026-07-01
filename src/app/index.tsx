import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from '../components/LoadingScreen';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRoute = any;

export default function Index() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    (async () => {
      if (!session) {
        router.replace('/(auth)/landing' as AnyRoute);
        return;
      }
      const role = await AsyncStorage.getItem('bb_role');
      if (role === 'owner') {
        router.replace('/(owner)/batches' as AnyRoute);
      } else if (role === 'student') {
        router.replace('/(student)/home' as AnyRoute);
      } else {
        router.replace('/(auth)/onboarding' as AnyRoute);
      }
    })();
  }, [loading, session]);

  return <LoadingScreen />;
}
