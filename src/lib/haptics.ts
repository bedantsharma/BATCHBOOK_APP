/**
 * Thin wrapper around expo-haptics so screens fire feedback through one place
 * (and so haptics stay subtle + consistent). All calls are fire-and-forget and
 * never throw — on platforms/devices without a haptics engine they no-op.
 *
 * Guidance (keep it subtle — see UX_ROADMAP Step 2.3):
 *   - `tap()`      → light impact for primary button presses / selections.
 *   - `toggle()`   → light impact when flipping a row (e.g. present/absent).
 *   - `success()`  → notification on a completed write (save score, record payment).
 *   - `warning()`  → notification for a soft failure the user should notice.
 */
import * as Haptics from 'expo-haptics';

function safe(fn: () => Promise<unknown>) {
  try {
    fn();
  } catch {
    // Haptics are non-essential; never let them break a flow.
  }
}

export const haptics = {
  tap() {
    safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  toggle() {
    safe(() => Haptics.selectionAsync());
  },
  success() {
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  warning() {
    safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },
};
