/**
 * Module-level event emitter for global toast notifications.
 *
 * Usage:
 *   - Call toastEmitter.emit(message, severity) from anywhere (e.g. api.ts)
 *     to show a toast without needing React context.
 *   - ToastProvider registers itself as the listener on mount.
 */

type Severity = 'success' | 'error' | 'info' | 'warning';
type ToastFn = (message: string, severity: Severity) => void;

let listener: ToastFn | null = null;

export const toastEmitter = {
  register(fn: ToastFn) {
    listener = fn;
  },
  emit(message: string, severity: Severity = 'error') {
    listener?.(message, severity);
  },
};
