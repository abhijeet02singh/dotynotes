package com.dotynotes.overlay

import android.graphics.Color
import org.json.JSONObject

/**
 * Native Android Theme System for the DotyNotes Floating Quick Pad.
 *
 * Implements centralized color tokens matching DotyNotes' multi-theme architecture:
 * - 3 Appearance Modes: System Default, Light Theme, Dark Theme
 * - 7 Brand Color Themes: Doty Purple, Sky Blue, Sunset Orange, Mint, Rose Pink, Periwinkle, Forest Green
 *
 * Provides safe JSON parsing with built-in fallback palettes for offline/background resilience.
 */
data class OverlayColors(
    val background: Int,
    val surface: Int,
    val surfaceSecondary: Int,
    val surfaceElevated: Int,
    val textPrimary: Int,
    val textSecondary: Int,
    val textMuted: Int,
    val border: Int,
    val divider: Int,
    val primary: Int,
    val primaryLight: Int,
    val primaryDark: Int,
    val primarySoft: Int,
    val accent: Int
)

data class OverlayTheme(
    val appearanceMode: String, // "system" | "light" | "dark"
    val colorTheme: String,    // "purple" | "sky" | "orange" | "mint" | "pink" | "periwinkle" | "green"
    val isDark: Boolean,
    val colors: OverlayColors
) {
    companion object {
        private const val DEFAULT_APPEARANCE = "system"
        private const val DEFAULT_COLOR_THEME = "purple"

        /**
         * Safely parses hex (#RRGGBB, #AARRGGBB) or rgba(r, g, b, a) into an Android Color int.
         */
        fun parseColorSafe(value: String?, fallback: Int): Int {
            if (value.isNullOrBlank()) return fallback
            val trimmed = value.trim()
            try {
                if (trimmed.startsWith("#")) {
                    return Color.parseColor(trimmed)
                }
                if (trimmed.startsWith("rgba", ignoreCase = true)) {
                    val content = trimmed.substringAfter("(").substringBefore(")")
                    val parts = content.split(",").map { it.trim() }
                    if (parts.size == 4) {
                        val r = parts[0].toInt().coerceIn(0, 255)
                        val g = parts[1].toInt().coerceIn(0, 255)
                        val b = parts[2].toInt().coerceIn(0, 255)
                        val a = (parts[3].toFloat().coerceIn(0f, 1f) * 255).toInt().coerceIn(0, 255)
                        return Color.argb(a, r, g, b)
                    }
                }
                if (trimmed.startsWith("rgb", ignoreCase = true)) {
                    val content = trimmed.substringAfter("(").substringBefore(")")
                    val parts = content.split(",").map { it.trim() }
                    if (parts.size >= 3) {
                        val r = parts[0].toInt().coerceIn(0, 255)
                        val g = parts[1].toInt().coerceIn(0, 255)
                        val b = parts[2].toInt().coerceIn(0, 255)
                        return Color.rgb(r, g, b)
                    }
                }
            } catch (_: Exception) {}
            return fallback
        }

        // ====================================================================
        // Built-in Palettes (Matching src/constants/theme.js THEME_PALETTES)
        // ====================================================================

        fun getBuiltinColors(colorTheme: String, isDark: Boolean): OverlayColors {
            val key = colorTheme.lowercase().trim()
            return when (key) {
                "sky" -> if (isDark) {
                    OverlayColors(
                        background = Color.parseColor("#0B111A"),
                        surface = Color.parseColor("#131C27"),
                        surfaceSecondary = Color.parseColor("#1A2634"),
                        surfaceElevated = Color.parseColor("#223042"),
                        textPrimary = Color.parseColor("#F0F6FC"),
                        textSecondary = Color.parseColor("#9BB0C7"),
                        textMuted = Color.parseColor("#70859E"),
                        border = Color.parseColor("#243447"),
                        divider = Color.parseColor("#1F2D3E"),
                        primary = Color.parseColor("#38BDF8"),
                        primaryLight = Color.parseColor("#7DD3FC"),
                        primaryDark = Color.parseColor("#0EA5E9"),
                        primarySoft = Color.argb(38, 56, 189, 248),
                        accent = Color.parseColor("#38BDF8")
                    )
                } else {
                    OverlayColors(
                        background = Color.parseColor("#F0F6FD"),
                        surface = Color.parseColor("#FFFFFF"),
                        surfaceSecondary = Color.parseColor("#E1EDFA"),
                        surfaceElevated = Color.parseColor("#FFFFFF"),
                        textPrimary = Color.parseColor("#0C2340"),
                        textSecondary = Color.parseColor("#334E68"),
                        textMuted = Color.parseColor("#627D98"),
                        border = Color.parseColor("#D2E3F7"),
                        divider = Color.parseColor("#E6F0FC"),
                        primary = Color.parseColor("#0284C7"),
                        primaryLight = Color.parseColor("#38BDF8"),
                        primaryDark = Color.parseColor("#0369A1"),
                        primarySoft = Color.parseColor("#E0F2FE"),
                        accent = Color.parseColor("#0284C7")
                    )
                }

                "orange" -> if (isDark) {
                    OverlayColors(
                        background = Color.parseColor("#14100E"),
                        surface = Color.parseColor("#201A16"),
                        surfaceSecondary = Color.parseColor("#2A221D"),
                        surfaceElevated = Color.parseColor("#352B24"),
                        textPrimary = Color.parseColor("#FDF6F0"),
                        textSecondary = Color.parseColor("#B5A599"),
                        textMuted = Color.parseColor("#8C7C71"),
                        border = Color.parseColor("#3A2E26"),
                        divider = Color.parseColor("#322720"),
                        primary = Color.parseColor("#FB923C"),
                        primaryLight = Color.parseColor("#FDBA74"),
                        primaryDark = Color.parseColor("#F97316"),
                        primarySoft = Color.argb(38, 251, 146, 60),
                        accent = Color.parseColor("#FB923C")
                    )
                } else {
                    OverlayColors(
                        background = Color.parseColor("#FFF9F5"),
                        surface = Color.parseColor("#FFFFFF"),
                        surfaceSecondary = Color.parseColor("#FDEEE3"),
                        surfaceElevated = Color.parseColor("#FFFFFF"),
                        textPrimary = Color.parseColor("#382012"),
                        textSecondary = Color.parseColor("#6B4F3B"),
                        textMuted = Color.parseColor("#8F6E56"),
                        border = Color.parseColor("#F5D5C0"),
                        divider = Color.parseColor("#FBE9DC"),
                        primary = Color.parseColor("#EA580C"),
                        primaryLight = Color.parseColor("#FB923C"),
                        primaryDark = Color.parseColor("#C2410C"),
                        primarySoft = Color.parseColor("#FFEDD5"),
                        accent = Color.parseColor("#EA580C")
                    )
                }

                "mint" -> if (isDark) {
                    OverlayColors(
                        background = Color.parseColor("#0A1312"),
                        surface = Color.parseColor("#121E1C"),
                        surfaceSecondary = Color.parseColor("#182926"),
                        surfaceElevated = Color.parseColor("#203431"),
                        textPrimary = Color.parseColor("#F0FDFB"),
                        textSecondary = Color.parseColor("#96B8B2"),
                        textMuted = Color.parseColor("#6D8F88"),
                        border = Color.parseColor("#233935"),
                        divider = Color.parseColor("#1D302D"),
                        primary = Color.parseColor("#2DD4BF"),
                        primaryLight = Color.parseColor("#5EEAD4"),
                        primaryDark = Color.parseColor("#14B8A6"),
                        primarySoft = Color.argb(38, 45, 212, 191),
                        accent = Color.parseColor("#2DD4BF")
                    )
                } else {
                    OverlayColors(
                        background = Color.parseColor("#F0FDF9"),
                        surface = Color.parseColor("#FFFFFF"),
                        surfaceSecondary = Color.parseColor("#E1F8F2"),
                        surfaceElevated = Color.parseColor("#FFFFFF"),
                        textPrimary = Color.parseColor("#0C352E"),
                        textSecondary = Color.parseColor("#255E53"),
                        textMuted = Color.parseColor("#4E7870"),
                        border = Color.parseColor("#C8F0E7"),
                        divider = Color.parseColor("#E3F7F2"),
                        primary = Color.parseColor("#0D9488"),
                        primaryLight = Color.parseColor("#2DD4BF"),
                        primaryDark = Color.parseColor("#0F766E"),
                        primarySoft = Color.parseColor("#CCFBF1"),
                        accent = Color.parseColor("#0D9488")
                    )
                }

                "pink" -> if (isDark) {
                    OverlayColors(
                        background = Color.parseColor("#140E13"),
                        surface = Color.parseColor("#20161E"),
                        surfaceSecondary = Color.parseColor("#2B1D28"),
                        surfaceElevated = Color.parseColor("#382635"),
                        textPrimary = Color.parseColor("#FDF2F8"),
                        textSecondary = Color.parseColor("#B89CAD"),
                        textMuted = Color.parseColor("#8F7385"),
                        border = Color.parseColor("#3A2434"),
                        divider = Color.parseColor("#301D2B"),
                        primary = Color.parseColor("#F472B6"),
                        primaryLight = Color.parseColor("#F9A8D4"),
                        primaryDark = Color.parseColor("#EC4899"),
                        primarySoft = Color.argb(38, 244, 114, 182),
                        accent = Color.parseColor("#F472B6")
                    )
                } else {
                    OverlayColors(
                        background = Color.parseColor("#FDF4F8"),
                        surface = Color.parseColor("#FFFFFF"),
                        surfaceSecondary = Color.parseColor("#FCE7F3"),
                        surfaceElevated = Color.parseColor("#FFFFFF"),
                        textPrimary = Color.parseColor("#3C0D26"),
                        textSecondary = Color.parseColor("#6B284E"),
                        textMuted = Color.parseColor("#8E5275"),
                        border = Color.parseColor("#F7CCE2"),
                        divider = Color.parseColor("#FDEAF3"),
                        primary = Color.parseColor("#DB2777"),
                        primaryLight = Color.parseColor("#F472B6"),
                        primaryDark = Color.parseColor("#BE185D"),
                        primarySoft = Color.parseColor("#FCE7F3"),
                        accent = Color.parseColor("#DB2777")
                    )
                }

                "periwinkle" -> if (isDark) {
                    OverlayColors(
                        background = Color.parseColor("#0F101A"),
                        surface = Color.parseColor("#191A2A"),
                        surfaceSecondary = Color.parseColor("#212338"),
                        surfaceElevated = Color.parseColor("#2A2D46"),
                        textPrimary = Color.parseColor("#EEF2FF"),
                        textSecondary = Color.parseColor("#A2A9D1"),
                        textMuted = Color.parseColor("#737BA3"),
                        border = Color.parseColor("#2B2E4A"),
                        divider = Color.parseColor("#23263E"),
                        primary = Color.parseColor("#818CF8"),
                        primaryLight = Color.parseColor("#A5B4FC"),
                        primaryDark = Color.parseColor("#6366F1"),
                        primarySoft = Color.argb(38, 129, 140, 248),
                        accent = Color.parseColor("#818CF8")
                    )
                } else {
                    OverlayColors(
                        background = Color.parseColor("#F5F6FE"),
                        surface = Color.parseColor("#FFFFFF"),
                        surfaceSecondary = Color.parseColor("#EAECFD"),
                        surfaceElevated = Color.parseColor("#FFFFFF"),
                        textPrimary = Color.parseColor("#1E1B4B"),
                        textSecondary = Color.parseColor("#3F4374"),
                        textMuted = Color.parseColor("#616694"),
                        border = Color.parseColor("#D7DCFA"),
                        divider = Color.parseColor("#ECEEFC"),
                        primary = Color.parseColor("#4F46E5"),
                        primaryLight = Color.parseColor("#818CF8"),
                        primaryDark = Color.parseColor("#4338CA"),
                        primarySoft = Color.parseColor("#E0E7FF"),
                        accent = Color.parseColor("#4F46E5")
                    )
                }

                "green" -> if (isDark) {
                    OverlayColors(
                        background = Color.parseColor("#09120F"),
                        surface = Color.parseColor("#111E19"),
                        surfaceSecondary = Color.parseColor("#182A24"),
                        surfaceElevated = Color.parseColor("#213830"),
                        textPrimary = Color.parseColor("#ECFDF5"),
                        textSecondary = Color.parseColor("#93BDB0"),
                        textMuted = Color.parseColor("#689487"),
                        border = Color.parseColor("#213931"),
                        divider = Color.parseColor("#1A2F28"),
                        primary = Color.parseColor("#10B981"),
                        primaryLight = Color.parseColor("#34D399"),
                        primaryDark = Color.parseColor("#059669"),
                        primarySoft = Color.argb(38, 16, 185, 129),
                        accent = Color.parseColor("#10B981")
                    )
                } else {
                    OverlayColors(
                        background = Color.parseColor("#F2F9F6"),
                        surface = Color.parseColor("#FFFFFF"),
                        surfaceSecondary = Color.parseColor("#E1F2EC"),
                        surfaceElevated = Color.parseColor("#FFFFFF"),
                        textPrimary = Color.parseColor("#052E22"),
                        textSecondary = Color.parseColor("#1C5343"),
                        textMuted = Color.parseColor("#446E60"),
                        border = Color.parseColor("#C4E8DC"),
                        divider = Color.parseColor("#E5F4EE"),
                        primary = Color.parseColor("#08795D"),
                        primaryLight = Color.parseColor("#10B981"),
                        primaryDark = Color.parseColor("#045642"),
                        primarySoft = Color.parseColor("#D1FAE5"),
                        accent = Color.parseColor("#08795D")
                    )
                }

                // Default: "purple" (Doty Purple canonical brand)
                else -> if (isDark) {
                    OverlayColors(
                        background = Color.parseColor("#101114"),
                        surface = Color.parseColor("#1B1D23"),
                        surfaceSecondary = Color.parseColor("#22252D"),
                        surfaceElevated = Color.parseColor("#292D36"),
                        textPrimary = Color.parseColor("#F4F5F7"),
                        textSecondary = Color.parseColor("#A7ADBA"),
                        textMuted = Color.parseColor("#858C9B"),
                        border = Color.parseColor("#30343E"),
                        divider = Color.parseColor("#2C3039"),
                        primary = Color.parseColor("#8B5CF6"),
                        primaryLight = Color.parseColor("#A78BFA"),
                        primaryDark = Color.parseColor("#7C3AED"),
                        primarySoft = Color.argb(38, 139, 92, 246),
                        accent = Color.parseColor("#8B5CF6")
                    )
                } else {
                    OverlayColors(
                        background = Color.parseColor("#F8F8FA"),
                        surface = Color.parseColor("#FFFFFF"),
                        surfaceSecondary = Color.parseColor("#F3F4F6"),
                        surfaceElevated = Color.parseColor("#FFFFFF"),
                        textPrimary = Color.parseColor("#111827"),
                        textSecondary = Color.parseColor("#6B7280"),
                        textMuted = Color.parseColor("#9CA3AF"),
                        border = Color.parseColor("#E5E7EB"),
                        divider = Color.parseColor("#E5E7EB"),
                        primary = Color.parseColor("#6D28D9"),
                        primaryLight = Color.parseColor("#8B5CF6"),
                        primaryDark = Color.parseColor("#4C1D95"),
                        primarySoft = Color.parseColor("#F5F3FF"),
                        accent = Color.parseColor("#6D28D9")
                    )
                }
            }
        }

        /**
         * Resolves an OverlayTheme from raw string/JSON input and system dark mode status.
         */
        fun resolveTheme(
            rawInput: String?,
            isSystemDark: Boolean,
            fallbackColorTheme: String = DEFAULT_COLOR_THEME
        ): OverlayTheme {
            val defaultColor = if (fallbackColorTheme.isNotBlank()) fallbackColorTheme.lowercase() else DEFAULT_COLOR_THEME

            if (rawInput.isNullOrBlank()) {
                val colors = getBuiltinColors(defaultColor, isSystemDark)
                return OverlayTheme(DEFAULT_APPEARANCE, defaultColor, isSystemDark, colors)
            }

            val trimmed = rawInput.trim()

            // 1. Try parsing JSON payload from React Native ThemeContext
            if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
                try {
                    val json = JSONObject(trimmed)
                    val appearanceMode = json.optString("appearanceMode", DEFAULT_APPEARANCE)
                    val colorTheme = json.optString("colorTheme", defaultColor)

                    val isDark = when {
                        json.has("isDark") -> json.getBoolean("isDark")
                        appearanceMode.equals("dark", ignoreCase = true) -> true
                        appearanceMode.equals("light", ignoreCase = true) -> false
                        else -> isSystemDark
                    }

                    val baseBuiltin = getBuiltinColors(colorTheme, isDark)

                    val customColors = if (json.has("colors")) {
                        val colorsObj = json.getJSONObject("colors")
                        OverlayColors(
                            background = parseColorSafe(colorsObj.optString("background"), baseBuiltin.background),
                            surface = parseColorSafe(colorsObj.optString("surface"), baseBuiltin.surface),
                            surfaceSecondary = parseColorSafe(colorsObj.optString("surfaceSecondary"), baseBuiltin.surfaceSecondary),
                            surfaceElevated = parseColorSafe(colorsObj.optString("surfaceElevated"), baseBuiltin.surfaceElevated),
                            textPrimary = parseColorSafe(colorsObj.optString("textPrimary"), baseBuiltin.textPrimary),
                            textSecondary = parseColorSafe(colorsObj.optString("textSecondary"), baseBuiltin.textSecondary),
                            textMuted = parseColorSafe(colorsObj.optString("textMuted"), baseBuiltin.textMuted),
                            border = parseColorSafe(colorsObj.optString("border"), baseBuiltin.border),
                            divider = parseColorSafe(colorsObj.optString("divider"), baseBuiltin.divider),
                            primary = parseColorSafe(colorsObj.optString("primary"), baseBuiltin.primary),
                            primaryLight = parseColorSafe(colorsObj.optString("primaryLight"), baseBuiltin.primaryLight),
                            primaryDark = parseColorSafe(colorsObj.optString("primaryDark"), baseBuiltin.primaryDark),
                            primarySoft = parseColorSafe(colorsObj.optString("primarySoft"), baseBuiltin.primarySoft),
                            accent = parseColorSafe(colorsObj.optString("accent"), baseBuiltin.accent)
                        )
                    } else {
                        baseBuiltin
                    }

                    return OverlayTheme(appearanceMode, colorTheme, isDark, customColors)
                } catch (_: Exception) {}
            }

            // 2. Fallback: Parse string format (e.g. "dark:mint", "sky", "dark", "light", "system")
            var mode = DEFAULT_APPEARANCE
            var color = defaultColor

            if (trimmed.contains(":")) {
                val parts = trimmed.split(":")
                mode = parts[0]
                color = parts[1]
            } else {
                when (trimmed.lowercase()) {
                    "dark" -> mode = "dark"
                    "light" -> mode = "light"
                    "system" -> mode = "system"
                    "purple", "sky", "orange", "mint", "pink", "periwinkle", "green" -> {
                        color = trimmed.lowercase()
                    }
                }
            }

            val isDark = when (mode.lowercase()) {
                "dark" -> true
                "light" -> false
                else -> isSystemDark
            }

            val colors = getBuiltinColors(color, isDark)
            return OverlayTheme(mode, color, isDark, colors)
        }
    }
}
