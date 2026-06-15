import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Typography } from '@/constants/theme';

export const HERO_HEIGHT = 380;

/**
 * Fullbredde hero-bilde på artsdetaljsiden. Bildet dekker hele toppen kant til
 * kant og glir mykt over i bakgrunnsfargen i bunnen. Viser en rolig mørk
 * gradient med "Bilde kommer" når arten ikke har bilde.
 */
export function SpeciesHero({ imageUrl }: { imageUrl: string }) {
  return (
    <View style={styles.container}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <>
          <LinearGradient
            colors={[Colors.surfaceAlt, Colors.background]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.placeholderContent}>
            <View style={styles.placeholderIcon}>
              <IconSymbol name="photo.fill" size={28} color={Colors.accent} />
            </View>
            <Text style={styles.placeholderText}>Bilde kommer</Text>
          </View>
        </>
      )}

      <LinearGradient
        colors={[Colors.overlay, 'transparent']}
        style={styles.topScrim}
        pointerEvents="none"
      />

      <LinearGradient
        colors={['transparent', Colors.background]}
        style={styles.bottomFade}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: HERO_HEIGHT,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceAlt,
  },
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  placeholderContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  placeholderIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    backgroundColor: Colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
});
