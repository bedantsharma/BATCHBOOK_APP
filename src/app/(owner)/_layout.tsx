import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { LoadingScreen } from '../../components/LoadingScreen';
import C from '../../constants/colors';

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>['name'];

function TabIcon({ name, color }: { name: MaterialIconName; color: string }) {
  return <MaterialIcons name={name} size={24} color={color} />;
}

export default function OwnerLayout() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/(auth)/landing' as any);
    }
  }, [loading, session]);

  if (loading) return <LoadingScreen />;
  if (!session) return null;

  return (
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
        name="batches"
        options={{
          title: 'Batches',
          tabBarIcon: ({ color }) => <TabIcon name="layers" color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: 'Students',
          tabBarIcon: ({ color }) => <TabIcon name="people" color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="fees"
        options={{
          title: 'Fees',
          tabBarIcon: ({ color }) => <TabIcon name="attach-money" color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          tabBarIcon: ({ color }) => <TabIcon name="check-circle" color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="tests"
        options={{
          title: 'Tests',
          tabBarIcon: ({ color }) => <TabIcon name="assignment" color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="setup"
        options={{ href: null }}
      />
    </Tabs>
  );
}
