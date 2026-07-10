import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { StatusChip } from '../../components/StatusChip';
import { Skeleton } from '../../components/Skeleton';
import C, { withOpacity } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { toastEmitter } from '../../lib/toastEmitter';
import { haptics } from '../../lib/haptics';
import { useAuth } from '../../context/AuthContext';
import {
  getRazorpayPayoutStatus,
  saveRazorpayCredentials,
  type RazorpayPayoutStatus,
} from '../../services/ownerService';

function statusChipProps(status: RazorpayPayoutStatus['status']) {
  if (status === 'CONNECTED') return { label: 'Connected', color: C.success };
  if (status === 'NEEDS_RECONNECT') return { label: 'Needs Reconnect', color: C.warning };
  return { label: 'Not Connected', color: C.text2 };
}

/**
 * Settings > Payouts — owner pastes their own Razorpay Key ID/Secret so fee
 * payments settle directly into their own account (BYO-Razorpay).
 */
export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [status, setStatus] = useState<RazorpayPayoutStatus['status']>('NOT_CONNECTED');
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRazorpayPayoutStatus();
      setStatus(data.status);
      setKeyId(data.key_id ?? '');
    } catch {
      setError('Failed to load payout settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const data = await saveRazorpayCredentials(keyId, keySecret);
      setStatus(data.status);
      setKeyId(data.key_id ?? '');
      setKeySecret('');
      haptics.success();
      toastEmitter.emit('Razorpay credentials saved.', 'success');
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { detail?: string } } };
      setError(axErr?.response?.data?.detail ?? 'Failed to save Razorpay credentials.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'You’ll need to sign in again to access your batches.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            haptics.tap();
            try {
              await signOut();
              router.replace('/(auth)/landing' as never);
            } catch {
              toastEmitter.emit('Failed to sign out. Please try again.', 'error');
            }
          },
        },
      ],
    );
  };

  const chip = statusChipProps(status);
  const canSave = keyId.trim().length > 0 && keySecret.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText variant="heading" style={{ marginBottom: spacing.lg }}>Settings</AppText>

        <AppCard>
          <View style={styles.titleRow}>
            <View style={[styles.iconBadge, { backgroundColor: withOpacity(C.primary, 'medium') }]}>
              <MaterialIcons name="lock" size={18} color={C.primary} />
            </View>
            <AppText variant="body" weight="600" style={{ flex: 1 }}>Payouts</AppText>
            {loading ? (
              <Skeleton width={90} height={22} borderRadius={8} />
            ) : (
              <StatusChip label={chip.label} color={chip.color} />
            )}
          </View>

          <AppText variant="caption" color={C.text2} style={styles.description}>
            You&apos;ll need your own Razorpay account to collect fees online — sign up at{' '}
            <AppText variant="caption" weight="700" color={C.text2}>razorpay.com</AppText>, complete
            your own KYC, then paste your Key ID and Key Secret below. Payments will settle directly
            into your Razorpay account; BatchBook never holds or moves your money.
          </AppText>

          {error ? (
            <AppText variant="caption" color={C.error} style={{ marginBottom: spacing.md }}>
              {error}
            </AppText>
          ) : null}

          {loading ? (
            <Skeleton height={96} borderRadius={12} />
          ) : (
            <View style={{ gap: spacing.md }}>
              <AppInput
                label="Key ID"
                value={keyId}
                onChangeText={setKeyId}
                placeholder="rzp_live_..."
                autoCapitalize="none"
                autoCorrect={false}
              />
              <AppInput
                label="Key Secret"
                value={keySecret}
                onChangeText={setKeySecret}
                placeholder={status === 'CONNECTED' ? 'Enter secret again to update' : ''}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              {status === 'CONNECTED' ? (
                <AppText variant="micro" color={C.text2} style={{ marginTop: -spacing.sm }}>
                  For security we never show your saved secret — re-enter it to change your credentials.
                </AppText>
              ) : null}
              <AppButton
                label={saving ? 'Saving…' : 'Save'}
                onPress={handleSave}
                loading={saving}
                disabled={!canSave}
                style={{ alignSelf: 'flex-start', minWidth: 120 }}
              />
            </View>
          )}
        </AppCard>

        <AppCard style={{ marginTop: spacing.lg }}>
          <View style={styles.titleRow}>
            <View
              style={[styles.iconBadge, { backgroundColor: withOpacity(C.error, 'medium') }]}
              importantForAccessibility="no"
              accessibilityElementsHidden
            >
              <MaterialIcons name="logout" size={18} color={C.error} />
            </View>
            <AppText variant="body" weight="600" style={{ flex: 1 }}>Account</AppText>
          </View>

          <AppButton
            label="Sign Out"
            onPress={handleSignOut}
            variant="secondary"
            accessibilityLabel="Sign out of your account"
            accessibilityHint="Asks for confirmation, then signs you out and returns you to the sign-in screen"
          />
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    marginBottom: spacing.lg,
    lineHeight: 19,
  },
});
