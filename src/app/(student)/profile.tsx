import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { SkeletonList } from '../../components/Skeleton';
import { StudentScreen } from '../../components/StudentScreen';
import C from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { studentStyles as s } from '../../lib/studentDashboardStyles';
import { useAuth } from '../../context/AuthContext';
import { useStudentData } from '../../context/StudentDataContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { profile, loading } = useStudentData();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/landing' as never);
  };

  if (loading) {
    return (
      <StudentScreen scroll={false}>
        <View style={{ padding: spacing.xl }}>
          <SkeletonList count={3} />
        </View>
      </StudentScreen>
    );
  }

  return (
    <StudentScreen>
      <AppText variant="heading" style={{ marginBottom: spacing.xl }}>Profile</AppText>

      {/* Avatar + Name */}
      <View style={s.avatarRow}>
        <View style={s.avatar}>
          <AppText variant="heading" color={C.onPrimary}>{profile?.initials ?? '?'}</AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="heading">{profile?.name ?? 'Student'}</AppText>
          {profile?.batch ? (
            <AppText variant="caption" color={C.text2} style={{ marginTop: 2 }}>{profile.batch}</AppText>
          ) : null}
        </View>
      </View>

      {/* Info cards */}
      <AppCard style={{ gap: spacing.lg, marginBottom: spacing.md }}>
        {profile?.phone ? (
          <View style={s.infoRow}>
            <MaterialIcons name="phone" size={18} color={C.text2} />
            <AppText variant="body" color={C.text2}>{profile.phone}</AppText>
          </View>
        ) : null}

        {profile?.subjects && profile.subjects.length > 0 ? (
          <View style={s.infoRow}>
            <MaterialIcons name="school" size={18} color={C.text2} />
            <AppText variant="body" color={C.text2}>{profile.subjects.join(', ')}</AppText>
          </View>
        ) : null}

        {profile?.enrolledYear ? (
          <View style={s.infoRow}>
            <MaterialIcons name="calendar-today" size={18} color={C.text2} />
            <AppText variant="body" color={C.text2}>Enrolled {profile.enrolledYear}</AppText>
          </View>
        ) : null}
      </AppCard>

      {/* Sign Out */}
      <AppButton label="Sign Out" onPress={handleSignOut} variant="secondary" style={{ marginTop: spacing.sm }} />
    </StudentScreen>
  );
}
