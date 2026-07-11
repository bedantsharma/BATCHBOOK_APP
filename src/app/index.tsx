import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from '../components/LoadingScreen';
import api from '../services/api';
import { computeMissingFields, hasMissingFields } from '../lib/profileCompleteness';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRoute = any;

interface ParentMeChild {
  id: number;
  name: string | null;
  email: string | null;
}

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
        return;
      }
      if (role === 'student') {
        router.replace('/(student)/home' as AnyRoute);
        return;
      }

      // No cached role but a live session exists (cleared storage, new device) —
      // try to restore a student session before giving up to onboarding.
      try {
        const { data } = await api.get('/parent/me');
        const child: ParentMeChild | undefined = data.children?.[0];
        await AsyncStorage.setItem('bb_role', 'student');
        if (child) {
          await AsyncStorage.setItem('bb_student_id', String(child.id));
          await AsyncStorage.setItem('bb_student_name', child.name ?? '');
        }
        const missing = computeMissingFields(data.name, child);
        if (child && hasMissingFields(missing)) {
          router.replace({
            pathname: '/(auth)/complete-profile',
            params: {
              childId: String(child.id),
              missingParentName: missing.parentName ? '1' : '0',
              missingChildEmail: missing.childEmail ? '1' : '0',
            },
          } as AnyRoute);
        } else {
          router.replace('/(student)/home' as AnyRoute);
        }
      } catch {
        router.replace('/(auth)/onboarding' as AnyRoute);
      }
    })();
  }, [loading, session]);

  return <LoadingScreen />;
}
