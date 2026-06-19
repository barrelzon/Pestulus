import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Image } from 'expo-image';
import { Tabs } from 'expo-router';
import Head from 'expo-router/head';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useI18n } from '@/lib/i18n';

const WEB_NAV_HEIGHT = 76;
const WEB_NAV_ICON_SIZE = 34;
const WEB_NAV_SCAN_ICON_SIZE = 42;
const scanTabIcon = require('../../assets/images/bug-search-streamline-core.png');
const speciesTabIcon = require('../../assets/images/species-tab-icon.png');
const historyTabIcon = require('../../assets/images/history-tab-icon.png');

const TAB_CONFIG = {
  oversikt: 'tabs.species',
  index: 'tabs.scan',
  historikk: 'tabs.history',
} as const;

type TabRouteName = keyof typeof TAB_CONFIG;

export default function WebTabLayout() {
  const { t } = useI18n();

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
        <Tabs.Screen name="oversikt" options={{ title: t(TAB_CONFIG.oversikt) }} />
        <Tabs.Screen name="index" options={{ title: t(TAB_CONFIG.index) }} />
        <Tabs.Screen name="historikk" options={{ title: t(TAB_CONFIG.historikk) }} />
      </Tabs>
    </>
  );
}

function PestulusTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const navHeight = Math.max(0, WEB_NAV_HEIGHT - insets.bottom);
  const { t } = useI18n();

  return (
    <View style={[styles.nav, { height: navHeight }]} role="tablist">
      {state.routes.map((route, index) => {
        if (!isTabRoute(route.name)) {
          return null;
        }

        const focused = state.index === index;
        const label = t(TAB_CONFIG[route.name]);
        const options = descriptors[route.key].options;
        const color = focused ? Colors.accent : Colors.textMuted;
        const iconSize = route.name === 'index' ? WEB_NAV_SCAN_ICON_SIZE : WEB_NAV_ICON_SIZE;
        const iconSource =
          route.name === 'index' ? scanTabIcon : route.name === 'oversikt' ? speciesTabIcon : historyTabIcon;

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
            <Image
              source={iconSource}
              contentFit="contain"
              tintColor={color}
              style={[styles.navImageIcon, { width: iconSize, height: iconSize }]}
            />
            <Text
              numberOfLines={1}
              style={[styles.navLabel, route.name !== 'index' && styles.navLabelLower, { color }]}>
              {label}
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
  navLabelLower: {
    transform: [{ translateY: 4 }],
  },
  navImageIcon: {
    display: 'flex',
  },
});
