import { Pressable, StyleSheet } from 'react-native';
import { router, Stack } from 'expo-router';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing, Typography } from '@/constants/theme';

function BackButton() {
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/oversikt'))}
      hitSlop={8}
      style={styles.backButton}>
      <IconSymbol name="chevron.left" size={26} color={Colors.text} />
    </Pressable>
  );
}

export default function OversiktLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerTitleStyle: { ...Typography.heading, color: Colors.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: Colors.background },
      }}>
      <Stack.Screen name="index" options={{ title: 'Oversikt' }} />
      <Stack.Screen name="[kategori]" />
      <Stack.Screen name="art/[id]" options={{ headerLeft: () => <BackButton /> }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  backButton: {
    paddingHorizontal: Spacing.xs,
  },
});
