import { StyleSheet } from 'react-native';
import C, { radius, withOpacity } from '../constants/colors';
import { spacing } from '../constants/spacing';

// Shared styles for the student dashboard tab screens (home/schedule/fees/profile).
export const studentStyles = StyleSheet.create({
  // ── Month picker ───────────────────────────────────────────────────────────
  monthPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginBottom: spacing.lg,
  },

  // ── Cards ──────────────────────────────────────────────────────────────────
  summaryCard: {
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  batchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: C.outline,
  },

  // ── Fee status chip ────────────────────────────────────────────────────────
  statusChip: {
    marginLeft: 10,
  },

  // ── Profile ────────────────────────────────────────────────────────────────
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  // ── Fee due banner ─────────────────────────────────────────────────────────
  feeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: withOpacity(C.error),
    borderWidth: 1,
    borderColor: withOpacity(C.error, 'strong'),
    borderRadius: radius.md,
    padding: 14,
    marginBottom: spacing.lg,
  },

  // ── Misc ───────────────────────────────────────────────────────────────────
  sectionLabel: {
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  centeredLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
});

export default studentStyles;
