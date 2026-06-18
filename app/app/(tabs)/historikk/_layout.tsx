import { Stack } from 'expo-router';

import { Colors, Typography } from '@/constants/theme';

export default function HistorikkLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerTitleStyle: { ...Typography.heading, color: Colors.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.background },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
