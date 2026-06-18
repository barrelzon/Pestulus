import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Image } from 'expo-image';
import { Tabs } from 'expo-router';
import Head from 'expo-router/head';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';

const WEB_NAV_HEIGHT = 76;
const WEB_NAV_ICON_SIZE = 34;
const WEB_NAV_SCAN_ICON_SIZE = 42;
const scanTabIcon = require('../../assets/images/bug-search-streamline-core.png');

const TAB_CONFIG = {
  oversikt: {
    label: 'Arter',
    icon: 'square.grid.2x2.fill',
  },
  index: {
    label: 'Scan',
    icon: 'camera.fill',
  },
  historikk: {
    label: 'Historikk',
    icon: 'clock.arrow.circlepath',
  },
} as const;

type TabRouteName = keyof typeof TAB_CONFIG;

export default function WebTabLayout() {
  return (
    <>
      <Head>
        <title>Pestulus</title>
      </Head>
      <Tabs
        initialRouteName="index"
        tabBar={(props) => <PestulusTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: styles.scene,
        }}>
        <Tabs.Screen name="oversikt" options={{ title: TAB_CONFIG.oversikt.label }} />
        <Tabs.Screen name="index" options={{ title: TAB_CONFIG.index.label }} />
        <Tabs.Screen name="historikk" options={{ title: TAB_CONFIG.historikk.label }} />
      </Tabs>
    </>
  );
}

function PestulusTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const navHeight = Math.max(0, WEB_NAV_HEIGHT - insets.bottom);

  return (
    <View style={[styles.nav, { height: navHeight }]} role="tablist">
      {state.routes.map((route, index) => {
        if (!isTabRoute(route.name)) {
          return null;
        }

        const focused = state.index === index;
        const config = TAB_CONFIG[route.name];
        const options = descriptors[route.key].options;
        const color = focused ? Colors.accent : Colors.textMuted;
        const iconSize = route.name === 'index' ? WEB_NAV_SCAN_ICON_SIZE : WEB_NAV_ICON_SIZE;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <Pressable
            key={route.key}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            accessibilityRole="tab"
            accessibilityState={focused ? { selected: true } : {}}
            onLongPress={onLongPress}
            onPress={onPress}
            style={styles.navItem}>
            {route.name === 'index' ? (
              <Image
                source={scanTabIcon}
                contentFit="contain"
                tintColor={color}
                style={[styles.navImageIcon, { width: iconSize, height: iconSize }]}
              />
            ) : (
              <IconSymbol name={config.icon} size={iconSize} color={color} />
            )}
            <Text numberOfLines={1} style={[styles.navLabel, { color }]}>
              {config.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function isTabRoute(name: string): name is TabRouteName {
  return name in TAB_CONFIG;
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: Colors.background,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'visible',
    paddingTop: 0,
  },
  navItem: {
    flex: 1,
    height: WEB_NAV_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    paddingBottom: 0,
  },
  navLabel: {
    fontSize: 10,
    lineHeight: 11,
    fontWeight: '500',
  },
  navImageIcon: {
    display: 'flex',
  },
});
