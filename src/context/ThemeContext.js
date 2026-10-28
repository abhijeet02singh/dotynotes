import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useColorScheme } from 'react-native';
import {
  LIGHT_THEME_TOKENS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  PASTEL_NOTE_COLORS,
  COLOR_THEME_DEFINITIONS,
  getPastelColor,
  getThemeTokens,
} from '../constants/theme';
import { getSettingAsync, setSettingAsync } from '../services/notesDb';
import { setOverlayThemeAsync } from '../../modules/floating-dot-overlay';

const VALID_MODES = ['light', 'dark', 'system'];
const VALID_COLOR_THEMES = ['purple', 'sky', 'orange', 'mint', 'pink', 'periwinkle', 'green'];

export function buildOverlayThemePayload(mode, colorThemeId, systemColorScheme) {
  const isDarkTheme = mode === 'dark'
    ? true
    : mode === 'light'
    ? false
    : (systemColorScheme === 'dark');
  const resolved = isDarkTheme ? 'dark' : 'light';
  const tokens = getThemeTokens(colorThemeId, isDarkTheme);
  return {
    appearanceMode: mode,
    resolvedTheme: resolved,
    colorTheme: colorThemeId,
    isDark: isDarkTheme,
    colors: {
      background: tokens.colors.background,
      surface: tokens.colors.surface,
      surfaceSecondary: tokens.colors.surfaceSecondary,
      surfaceElevated: tokens.colors.surfaceElevated,
      textPrimary: tokens.colors.textPrimary,
      textSecondary: tokens.colors.textSecondary,
      textMuted: tokens.colors.textMuted,
      border: tokens.colors.border,
      divider: tokens.colors.divider,
      primary: tokens.colors.primary,
      primaryLight: tokens.colors.primaryLight,
      primaryDark: tokens.colors.primaryDark,
      primarySoft: tokens.colors.primarySoft,
      accent: tokens.colors.accent,
    },
  };
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Device system appearance: 'light' | 'dark' | null
  const systemColorScheme = useColorScheme();

  // User persistent theme appearance mode: 'system' | 'light' | 'dark'
  const [themeModeState, setThemeModeState] = useState('system');

  // User persistent UI color theme: 'purple' | 'sky' | 'orange' | 'mint' | 'pink' | 'periwinkle' | 'green'
  const [colorThemeState, setColorThemeState] = useState('purple');

  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  // User persistent default note color preference (defaults to 'lavender', canonical purple)
  const [defaultStickyColor, setDefaultStickyColorState] = useState('lavender');

  // Synchronize theme payload to native overlay immediately
  const syncThemeToOverlay = useCallback((mode, colorThemeId) => {
    try {
      const payload = buildOverlayThemePayload(mode, colorThemeId, systemColorScheme);
      setOverlayThemeAsync(payload);
    } catch (_) {}
  }, [systemColorScheme]);

  // Load persistent theme preference, color theme, and default note color from SQLite app_metadata
  useEffect(() => {
    let isMounted = true;
    async function loadPreferences() {
      try {
        const [savedThemeMode, savedColorTheme, savedDefaultColor] = await Promise.all([
          getSettingAsync('app_theme_preference', 'system'),
          getSettingAsync('app_color_theme', 'purple'),
          getSettingAsync('default_note_color', 'lavender'),
        ]);

        if (isMounted) {
          let effectiveMode = 'system';
          let effectiveColor = 'purple';

          // Backward compatibility check:
          // If app_theme_preference stored a color theme ID, migrate it cleanly
          if (savedThemeMode && VALID_COLOR_THEMES.includes(savedThemeMode)) {
            effectiveColor = savedThemeMode;
            setColorThemeState(savedThemeMode);
            setThemeModeState('system');
          } else if (savedThemeMode && VALID_MODES.includes(savedThemeMode)) {
            effectiveMode = savedThemeMode;
            setThemeModeState(savedThemeMode);
          }

          if (savedColorTheme && VALID_COLOR_THEMES.includes(savedColorTheme)) {
            effectiveColor = savedColorTheme;
            setColorThemeState(savedColorTheme);
          }

          if (savedDefaultColor) {
            setDefaultStickyColorState(savedDefaultColor);
          }

          syncThemeToOverlay(effectiveMode, effectiveColor);
          setIsThemeLoaded(true);
        }
      } catch (err) {
        console.warn('[ThemeContext] loadPreferences notice:', err?.message);
        if (isMounted) setIsThemeLoaded(true);
      }
    }

    loadPreferences();
    return () => {
      isMounted = false;
    };
  }, [syncThemeToOverlay]);

  // Compute resolved appearance: 'light' or 'dark'
  const resolvedTheme = useMemo(() => {
    if (themeModeState === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return themeModeState === 'dark' ? 'dark' : 'light';
  }, [themeModeState, systemColorScheme]);

  const isDark = resolvedTheme === 'dark';

  // Assemble full theme object with semantic color tokens tailored to colorTheme and mode
  const theme = useMemo(() => {
    const tokens = getThemeTokens(colorThemeState, isDark);
    return {
      mode: resolvedTheme,
      appearanceMode: themeModeState,
      colorTheme: colorThemeState,
      isDark,
      colors: tokens.colors,
      typography: TYPOGRAPHY,
      spacing: SPACING,
      borderRadius: BORDER_RADIUS,
      shadows: SHADOWS,
      pastels: PASTEL_NOTE_COLORS,
    };
  }, [isDark, resolvedTheme, themeModeState, colorThemeState]);

  // Sync resolved theme and color palette with native Floating Dot overlay whenever it changes
  useEffect(() => {
    syncThemeToOverlay(themeModeState, colorThemeState);
  }, [themeModeState, colorThemeState, systemColorScheme, syncThemeToOverlay]);

  // Update appearance mode persistently ('light' | 'dark' | 'system')
  const setThemeMode = useCallback(async (newMode) => {
    if (!VALID_MODES.includes(newMode)) return;
    setThemeModeState(newMode);
    syncThemeToOverlay(newMode, colorThemeState);
    try {
      await setSettingAsync('app_theme_preference', newMode);
    } catch (err) {
      console.warn('[ThemeContext] Save themeMode error:', err?.message);
    }
  }, [colorThemeState, syncThemeToOverlay]);

  // Update color theme persistently ('purple' | 'sky' | 'orange' | 'mint' | 'pink' | 'periwinkle' | 'green')
  const setColorTheme = useCallback(async (newColorTheme) => {
    if (!VALID_COLOR_THEMES.includes(newColorTheme)) return;
    setColorThemeState(newColorTheme);
    syncThemeToOverlay(themeModeState, newColorTheme);
    try {
      await setSettingAsync('app_color_theme', newColorTheme);
    } catch (err) {
      console.warn('[ThemeContext] Save colorTheme error:', err?.message);
    }
  }, [themeModeState, syncThemeToOverlay]);

  // Universal theme preference setter (supports both appearance mode and color theme IDs)
  const setThemePreference = useCallback(async (newPreference) => {
    if (!newPreference) return;
    if (VALID_MODES.includes(newPreference)) {
      setThemeModeState(newPreference);
      syncThemeToOverlay(newPreference, colorThemeState);
      try {
        await setSettingAsync('app_theme_preference', newPreference);
      } catch (err) {
        console.warn('[ThemeContext] Save theme error:', err?.message);
      }
    } else if (VALID_COLOR_THEMES.includes(newPreference)) {
      setColorThemeState(newPreference);
      syncThemeToOverlay(themeModeState, newPreference);
      try {
        await setSettingAsync('app_color_theme', newPreference);
      } catch (err) {
        console.warn('[ThemeContext] Save color theme error:', err?.message);
      }
    }
  }, [themeModeState, colorThemeState, syncThemeToOverlay]);

  // Update default sticky note color persistently (CRITICAL: Independent from app UI theme!)
  const setDefaultStickyColor = useCallback(async (newColorId) => {
    if (!newColorId) return;
    const resolvedPastel = getPastelColor(newColorId);
    setDefaultStickyColorState(resolvedPastel.id);
    try {
      await setSettingAsync('default_note_color', resolvedPastel.id);
    } catch (err) {
      console.warn('[ThemeContext] Save default color error:', err?.message);
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      theme,
      resolvedTheme,
      themePreference: themeModeState,
      themeMode: themeModeState,
      colorTheme: colorThemeState,
      isDark,
      isThemeLoaded,
      setThemePreference,
      setThemeMode,
      setColorTheme,
      defaultStickyColor,
      setDefaultStickyColor,
      pastels: PASTEL_NOTE_COLORS,
      getPastelColor,
      colorThemes: COLOR_THEME_DEFINITIONS,
    }),
    [
      theme,
      resolvedTheme,
      themeModeState,
      colorThemeState,
      isDark,
      isThemeLoaded,
      setThemePreference,
      setThemeMode,
      setColorTheme,
      defaultStickyColor,
      setDefaultStickyColor,
    ]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Graceful fallback for tests or components rendered outside ThemeProvider
    return {
      theme: {
        mode: 'light',
        isDark: false,
        colors: LIGHT_THEME_TOKENS.colors,
        typography: TYPOGRAPHY,
        spacing: SPACING,
        borderRadius: BORDER_RADIUS,
        shadows: SHADOWS,
        pastels: PASTEL_NOTE_COLORS,
      },
      resolvedTheme: 'light',
      themePreference: 'system',
      isDark: false,
      isThemeLoaded: true,
      setThemePreference: async () => {},
      defaultStickyColor: 'lavender',
      setDefaultStickyColor: async () => {},
      pastels: PASTEL_NOTE_COLORS,
      getPastelColor,
    };
  }
  return context;
}
