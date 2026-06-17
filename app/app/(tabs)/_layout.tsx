import { router, Slot, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';

const WEB_NAV_HEIGHT = 52;
const WEB_NAV_BOTTOM_OFFSET = 40;
const WEB_NAV_ICON_SIZE = 34;
const WEB_NAV_ACTIVE_ICON_SIZE = 38;

const navItems = [
  {
    href: '/oversikt',
    match: '/oversikt',
    label: 'Oversikt',
    icon: 'square.grid.2x2.fill',
  },
  {
    href: '/',
    match: '/',
    label: 'Scan',
    icon: 'camera.fill',
  },
  {
    href: '/historikk',
    match: '/historikk',
    label: 'Historikk',
    icon: 'clock.arrow.circlepath',
  },
] as const;

export default function WebTabLayout() {
  const pathname = usePathname();

  return (
    <View style={styles.layout}>
      <View style={styles.scene}>
        <Slot />
      </View>
      <View style={styles.nav} role="navigation">
        {navItems.map((item) => {
          const focused =
            item.match === '/'
              ? pathname === '/'
              : pathname === item.match || pathname.startsWith(`${item.match}/`);
          const color = focused ? Colors.accent : Colors.textMuted;
          const iconSize = focused ? WEB_NAV_ACTIVE_ICON_SIZE : WEB_NAV_ICON_SIZE;

          return (
            <Pressable
              key={item.href}
              accessibilityRole="link"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={() => {
                if (!focused) router.push(item.href);
              }}
              style={styles.navItem}>
              <IconSymbol name={item.icon} size={iconSize} color={color} />
              <Text numberOfLines={1} style={[styles.navLabel, { color }]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scene: {
    flex: 1,
    paddingBottom: WEB_NAV_HEIGHT + WEB_NAV_BOTTOM_OFFSET,
  },
  nav: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: WEB_NAV_BOTTOM_OFFSET,
    height: WEB_NAV_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.background,
    borderTopColor: Colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 20,
  },
  navItem: {
    flex: 1,
    height: WEB_NAV_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 0,
  },
  navLabel: {
    fontSize: 10,
    lineHeight: 11,
    fontWeight: '500',
  },
});
