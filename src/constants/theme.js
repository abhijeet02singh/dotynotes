/**
 * DotyNotes Theme Configuration
 * Purple-and-white visual identity with tasteful pastel palette for note cards.
 */

export const THEME = {
  colors: {
    // Brand Colors
    primary: '#6D28D9',       // Deep Royal Purple
    primaryLight: '#8B5CF6',  // Vibrant Purple
    primaryDark: '#4C1D95',   // Indigo Purple
    primarySoft: '#EDE9FE',   // Lilac tint
    accent: '#A78BFA',        // Soft Purple Accent
    accentDot: '#10B981',     // Active Dot Green (for future floating state indicator)
    
    // Backgrounds & Neutrals
    background: '#F8F9FD',    // Clean soft grey-white
    cardBackground: '#FFFFFF',
    surface: '#FFFFFF',
    border: '#E2E8F0',
    borderLight: '#F1F5F9',

    // Typography
    textPrimary: '#0F172A',   // Slate 900
    textSecondary: '#475569', // Slate 600
    textMuted: '#94A3B8',     // Slate 400
    textInverse: '#FFFFFF',

    // Status & Utility
    pinned: '#F59E0B',        // Amber for pinned notes
    archived: '#64748B',
    danger: '#EF4444',

    // Pastel Sticky Note Palette
    pastels: [
      { id: 'purple', bg: '#F3E8FF', border: '#DDD6FE', tagBg: '#E9D5FF', text: '#581C87' },
      { id: 'yellow', bg: '#FEF9C3', border: '#FEF08A', tagBg: '#FDE047', text: '#713F12' },
      { id: 'mint',   bg: '#DCFCE7', border: '#BBF7D0', tagBg: '#86EFAC', text: '#14532D' },
      { id: 'peach',  bg: '#FFEDD5', border: '#FED7AA', tagBg: '#FDBA74', text: '#7C2D12' },
      { id: 'blue',   bg: '#E0F2FE', border: '#BAE6FD', tagBg: '#7DD3FC', text: '#0C4A6E' },
      { id: 'rose',   bg: '#FFE4E6', border: '#FECDD3', tagBg: '#FDA4AF', text: '#881337' },
    ],
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },

  shadows: {
    subtle: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    card: {
      shadowColor: '#6D28D9',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    fab: {
      shadowColor: '#6D28D9',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 8,
    },
  },
};
