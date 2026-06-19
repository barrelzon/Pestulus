import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
              <Text style={styles.flag}>{flagForLanguage(item)}</Text>
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
        <Text style={styles.flag}>{flagForLanguage(language)}</Text>
      </Pressable>
    </View>
  );
}

function flagForLanguage(language: AppLanguage) {
  if (language === 'no') return '🇳🇴';
  if (language === 'sv') return '🇸🇪';
  return '🇩🇰';
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
    position: 'absolute',
    bottom: 36,
    flexDirection: 'row',
    gap: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'rgba(31, 34, 38, 0.9)',
    padding: 4,
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
    fontSize: 18,
    lineHeight: 22,
  },
});
