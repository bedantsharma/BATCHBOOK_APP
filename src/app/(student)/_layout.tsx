import { Stack } from 'expo-router';

// Dashboard handles its own 4-tab navigation via internal useState.
// This layout is a simple Stack wrapper with no visible header.
export default function StudentLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
