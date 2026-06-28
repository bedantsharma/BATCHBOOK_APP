import React, { useEffect } from 'react';
import Toast from 'react-native-toast-message';
import { toastEmitter } from '../lib/toastEmitter';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    toastEmitter.register((message, severity) => {
      Toast.show({
        type: severity === 'error' ? 'error' : severity === 'success' ? 'success' : 'info',
        text1: message,
        position: 'bottom',
      });
    });
  }, []);

  return (
    <>
      {children}
      <Toast />
    </>
  );
}
