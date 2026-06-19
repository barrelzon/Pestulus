import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { supportedLanguages, useI18n, type AppLanguage } from '@/lib/i18n';

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();

  return (
    <View style={styles.container}>
      {supportedLanguages.map((item) => (
        <Pressable
          key={item}
          accessibilityRole="button"
          accessibilityState={language === item ? { selected: true } : undefined}
          onPress={() => setLanguage(item)}
          style={[styles.button, language === item && styles.buttonActive]}>
          <Text style={[styles.text, language === item && styles.textActive]}>
            {labelForLanguage(item, t)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function labelForLanguage(language: AppLanguage, t: ReturnType<typeof useI18n>['t']) {
  if (language === 'no') return t('language.no');
  if (language === 'sv') return t('language.sv');
  return t('language.da');
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 3,
  },
  button: {
    minWidth: 64,
    borderRadius: Radius.pill,
    paddingVertical: 5,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: Colors.accent,
  },
  text: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  textActive: {
    color: Colors.accentText,
  },
});
