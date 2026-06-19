import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { supportedLanguages, useI18n, type AppLanguage } from '@/lib/i18n';

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();
  const [open, setOpen] = useState(false);

  function chooseLanguage(nextLanguage: AppLanguage) {
    setLanguage(nextLanguage);
    setOpen(false);
  }

  return (
    <View style={styles.wrapper}>
      {open && (
        <View style={styles.menu}>
          {supportedLanguages.map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityLabel={labelForLanguage(item, t)}
              accessibilityState={language === item ? { selected: true } : undefined}
              onPress={() => chooseLanguage(item)}
              style={[styles.option, language === item && styles.optionActive]}>
              <LanguageFlag language={item} />
            </Pressable>
          ))}
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={labelForLanguage(language, t)}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={styles.trigger}>
        <LanguageFlag language={language} />
      </Pressable>
    </View>
  );
}

type LanguageFlagProps = {
  language: AppLanguage;
};

function LanguageFlag({ language }: LanguageFlagProps) {
  if (language === 'no') {
    return (
      <View style={[styles.flag, styles.flagNorway]}>
        <View style={[styles.flagVertical, styles.norwayWhiteVertical]} />
        <View style={[styles.flagHorizontal, styles.norwayWhiteHorizontal]} />
        <View style={[styles.flagVertical, styles.norwayBlueVertical]} />
        <View style={[styles.flagHorizontal, styles.norwayBlueHorizontal]} />
      </View>
    );
  }

  if (language === 'sv') {
    return (
      <View style={[styles.flag, styles.flagSweden]}>
        <View style={[styles.flagVertical, styles.swedenCrossVertical]} />
        <View style={[styles.flagHorizontal, styles.swedenCrossHorizontal]} />
      </View>
    );
  }

  return (
    <View style={[styles.flag, styles.flagDenmark]}>
      <View style={[styles.flagVertical, styles.denmarkCrossVertical]} />
      <View style={[styles.flagHorizontal, styles.denmarkCrossHorizontal]} />
    </View>
  );
}

function labelForLanguage(language: AppLanguage, t: ReturnType<typeof useI18n>['t']) {
  if (language === 'no') return t('language.no');
  if (language === 'sv') return t('language.sv');
  return t('language.da');
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'center',
    alignItems: 'center',
    position: 'relative',
    zIndex: 20,
  },
  trigger: {
    minWidth: 46,
    height: 30,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'rgba(31, 34, 38, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  menu: {
    flexDirection: 'row',
    gap: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'rgba(31, 34, 38, 0.9)',
    padding: 4,
    marginBottom: 6,
  },
  option: {
    width: 32,
    height: 28,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActive: {
    backgroundColor: Colors.accent,
  },
  flag: {
    width: 24,
    height: 17,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.36)',
    overflow: 'hidden',
  },
  flagNorway: {
    backgroundColor: '#BA0C2F',
  },
  flagSweden: {
    backgroundColor: '#006AA7',
  },
  flagDenmark: {
    backgroundColor: '#C8102E',
  },
  flagHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  flagVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  norwayWhiteHorizontal: {
    top: 6,
    height: 5,
    backgroundColor: '#FFFFFF',
  },
  norwayWhiteVertical: {
    left: 7,
    width: 6,
    backgroundColor: '#FFFFFF',
  },
  norwayBlueHorizontal: {
    top: 7,
    height: 3,
    backgroundColor: '#00205B',
  },
  norwayBlueVertical: {
    left: 8.5,
    width: 3,
    backgroundColor: '#00205B',
  },
  swedenCrossHorizontal: {
    top: 7,
    height: 4,
    backgroundColor: '#FECC00',
  },
  swedenCrossVertical: {
    left: 8,
    width: 4,
    backgroundColor: '#FECC00',
  },
  denmarkCrossHorizontal: {
    top: 7,
    height: 4,
    backgroundColor: '#FFFFFF',
  },
  denmarkCrossVertical: {
    left: 8,
    width: 4,
    backgroundColor: '#FFFFFF',
  },
});
