import { Tabs } from 'expo-router';

import { GlassPanel } from '@/components/glass-panel';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopColor: Colors.border,
        },
        tabBarBackground: () => <GlassPanel variant="tabBar" style={{ flex: 1 }} />,
      }}>
      <Tabs.Screen
        name="oversikt"
        options={{
          title: 'Oversikt',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol size={size} name="square.grid.2x2.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol size={size + 4} name="camera.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="historikk"
        options={{
          title: 'Historikk',
          tabBarIcon: ({ color, size }) => (
            <IconSymbol size={size} name="clock.arrow.circlepath" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
