import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { StudentDataProvider } from '../../context/StudentDataContext';
import { LoadingScreen } from '../../components/LoadingScreen';
import C from '../../constants/colors';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

function TabIcon({ name, color }: { name: MaterialIconName; color: string }) {
  return <MaterialIcons name={name} size={24} color={color} />;
}

export default function StudentLayout() {
  const { session, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/(auth)/landing' as never);
      return;
    }
    if (role && role !== 'student') {
      router.replace('/(auth)/onboarding' as never);
    }
  }, [loading, session, role, router]);

  if (loading) return <LoadingScreen />;
  if (!session) return null;

  return (
    <StudentDataProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: C.primary,
          tabBarInactiveTintColor: C.text2,
          tabBarStyle: {
            backgroundColor: C.surface,
            borderTopColor: C.outline,
            borderTopWidth: 1,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontFamily: 'DMSans_500Medium',
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <TabIcon name="home" color={color as string} />,
          }}
        />
        <Tabs.Screen
          name="schedule"
          options={{
            title: 'Schedule',
            tabBarIcon: ({ color }) => <TabIcon name="calendar-today" color={color as string} />,
          }}
        />
        <Tabs.Screen
          name="fees"
          options={{
            title: 'Fees',
            tabBarIcon: ({ color }) => <TabIcon name="account-balance-wallet" color={color as string} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <TabIcon name="person" color={color as string} />,
          }}
        />
      </Tabs>
    </StudentDataProvider>
  );
}
