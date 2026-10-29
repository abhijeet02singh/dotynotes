import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

/**
 * SettingsIcon
 * 
 * Crisp, monochrome vector icons designed specifically for the DotyNotes Settings screen.
 * Built with pure React Native primitives for 100% reliability, zero extra dependencies,
 * zero asynchronous font loading delay, and pixel-perfect rendering across all Android devices.
 */
export default function SettingsIcon({ name, size = 18, color: explicitColor }) {
  let themeContext = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    themeContext = useTheme();
  } catch (_) {}
  const color = explicitColor || themeContext?.theme?.colors?.textSecondary || (themeContext?.isDark ? '#A7ADBA' : '#6B7280');

  switch (name) {
    case 'theme':
      // Palette / color brush icon
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          <View
            style={{
              width: size - 2,
              height: size - 2,
              borderRadius: (size - 2) / 2,
              borderWidth: 1.6,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Color wells / dots */}
            <View
              style={{
                width: 3,
                height: 3,
                borderRadius: 1.5,
                backgroundColor: color,
                position: 'absolute',
                top: 2.5,
                left: 3.5,
              }}
            />
            <View
              style={{
                width: 3,
                height: 3,
                borderRadius: 1.5,
                backgroundColor: color,
                position: 'absolute',
                top: 2.5,
                right: 3.5,
              }}
            />
            <View
              style={{
                width: 3,
                height: 3,
                borderRadius: 1.5,
                backgroundColor: color,
                position: 'absolute',
                bottom: 3,
                left: 5,
              }}
            />
          </View>
        </View>
      );

    case 'color':
      // Swatch / sticky note icon
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          <View
            style={{
              width: size - 3,
              height: size - 3,
              borderRadius: 3.5,
              borderWidth: 1.6,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: size - 9,
                height: size - 9,
                borderRadius: 2,
                backgroundColor: color,
                opacity: 0.25,
              }}
            />
          </View>
        </View>
      );

    case 'haptic':
      // Phone vibrating icon
      return (
        <View style={[styles.center, { width: size, height: size, flexDirection: 'row' }]}>
          {/* Left vibration waves */}
          <View
            style={{
              width: 1.5,
              height: 8,
              borderRadius: 1,
              backgroundColor: color,
              marginRight: 2.5,
            }}
          />
          {/* Phone body */}
          <View
            style={{
              width: 9,
              height: 15,
              borderRadius: 2.5,
              borderWidth: 1.5,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 1.5,
            }}
          >
            <View
              style={{
                width: 3,
                height: 1,
                backgroundColor: color,
                borderRadius: 0.5,
              }}
            />
            <View
              style={{
                width: 2,
                height: 2,
                borderRadius: 1,
                backgroundColor: color,
              }}
            />
          </View>
          {/* Right vibration waves */}
          <View
            style={{
              width: 1.5,
              height: 8,
              borderRadius: 1,
              backgroundColor: color,
              marginLeft: 2.5,
            }}
          />
        </View>
      );

    case 'format':
      // Rich text 'T' typography icon
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          {/* Top crossbar */}
          <View
            style={{
              width: 12,
              height: 2,
              borderRadius: 1,
              backgroundColor: color,
            }}
          />
          {/* Vertical stem */}
          <View
            style={{
              width: 2,
              height: 9,
              borderRadius: 1,
              backgroundColor: color,
              marginTop: -0.5,
            }}
          />
          {/* Bottom serif line */}
          <View
            style={{
              width: 6,
              height: 1.5,
              borderRadius: 0.75,
              backgroundColor: color,
              marginTop: -0.5,
            }}
          />
        </View>
      );

    case 'checklist':
      // Checkbox with check icon
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          <View
            style={{
              width: size - 3,
              height: size - 3,
              borderRadius: 3.5,
              borderWidth: 1.6,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Checkmark mark */}
            <View
              style={{
                width: 6,
                height: 3.5,
                borderBottomWidth: 1.6,
                borderLeftWidth: 1.6,
                borderColor: color,
                transform: [{ rotate: '-45deg' }],
                marginBottom: 1,
              }}
            />
          </View>
        </View>
      );

    case 'autosave':
      // Lightning / quick save bolt icon
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          <View style={{ width: 10, height: 14 }}>
            {/* Top angled diagonal */}
            <View
              style={{
                width: 6,
                height: 7,
                borderLeftWidth: 2,
                borderTopWidth: 2,
                borderColor: color,
                transform: [{ skewX: '-25deg' }],
                position: 'absolute',
                top: 0,
                right: 2,
              }}
            />
            {/* Bottom angled point */}
            <View
              style={{
                width: 6,
                height: 7,
                borderRightWidth: 2,
                borderBottomWidth: 2,
                borderColor: color,
                transform: [{ skewX: '-25deg' }],
                position: 'absolute',
                bottom: 0,
                left: 2,
              }}
            />
          </View>
        </View>
      );

    case 'bell':
      // Bell notification icon
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          {/* Top knob */}
          <View
            style={{
              width: 2.5,
              height: 2,
              backgroundColor: color,
              borderTopLeftRadius: 1,
              borderTopRightRadius: 1,
            }}
          />
          {/* Bell dome */}
          <View
            style={{
              width: 11,
              height: 9,
              borderWidth: 1.5,
              borderColor: color,
              borderTopLeftRadius: 5.5,
              borderTopRightRadius: 5.5,
              borderBottomWidth: 0,
            }}
          />
          {/* Bell rim */}
          <View
            style={{
              width: 14,
              height: 1.6,
              backgroundColor: color,
              borderRadius: 0.8,
            }}
          />
          {/* Clapper dot */}
          <View
            style={{
              width: 3,
              height: 2,
              backgroundColor: color,
              borderBottomLeftRadius: 1.5,
              borderBottomRightRadius: 1.5,
              marginTop: 0.5,
            }}
          />
        </View>
      );

    case 'clock':
      // Analog clock icon
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          <View
            style={{
              width: size - 2,
              height: size - 2,
              borderRadius: (size - 2) / 2,
              borderWidth: 1.6,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Center dot */}
            <View
              style={{
                width: 2,
                height: 2,
                borderRadius: 1,
                backgroundColor: color,
                position: 'absolute',
              }}
            />
            {/* Hour hand (vertical up) */}
            <View
              style={{
                width: 1.5,
                height: 4.5,
                backgroundColor: color,
                borderRadius: 0.75,
                position: 'absolute',
                top: 2.5,
              }}
            />
            {/* Minute hand (horizontal right) */}
            <View
              style={{
                width: 4,
                height: 1.5,
                backgroundColor: color,
                borderRadius: 0.75,
                position: 'absolute',
                right: 2.5,
              }}
            />
          </View>
        </View>
      );

    case 'info':
      // Information circle icon
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          <View
            style={{
              width: size - 2,
              height: size - 2,
              borderRadius: (size - 2) / 2,
              borderWidth: 1.6,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 1.8,
                height: 2,
                borderRadius: 0.9,
                backgroundColor: color,
                marginBottom: 1.5,
              }}
            />
            <View
              style={{
                width: 1.8,
                height: 5,
                borderRadius: 0.9,
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );

    case 'overlay':
      // Display over other apps / overlapping windows icon
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          {/* Back window */}
          <View
            style={{
              width: 11,
              height: 10,
              borderRadius: 2.5,
              borderWidth: 1.4,
              borderColor: color,
              opacity: 0.5,
              position: 'absolute',
              top: 1,
              left: 1,
            }}
          />
          {/* Front window */}
          <View
            style={{
              width: 11,
              height: 10,
              borderRadius: 2.5,
              borderWidth: 1.6,
              borderColor: color,
              backgroundColor: '#FFFFFF',
              position: 'absolute',
              bottom: 1,
              right: 1,
            }}
          />
        </View>
      );

    case 'dot':
      // Floating Dot / target service icon
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          <View
            style={{
              width: size - 2,
              height: size - 2,
              borderRadius: (size - 2) / 2,
              borderWidth: 1.6,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );

    case 'controls':
      // Sliders / equalizer icon
      return (
        <View
          style={[
            styles.center,
            { width: size, height: size, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
          ]}
        >
          {/* Slider 1 */}
          <View style={{ alignItems: 'center', width: 3 }}>
            <View style={{ width: 1.5, height: 14, backgroundColor: color, borderRadius: 0.75 }} />
            <View
              style={{
                position: 'absolute',
                top: 2,
                width: 4,
                height: 3,
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
          </View>
          {/* Slider 2 */}
          <View style={{ alignItems: 'center', width: 3 }}>
            <View style={{ width: 1.5, height: 14, backgroundColor: color, borderRadius: 0.75 }} />
            <View
              style={{
                position: 'absolute',
                bottom: 3,
                width: 4,
                height: 3,
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
          </View>
          {/* Slider 3 */}
          <View style={{ alignItems: 'center', width: 3 }}>
            <View style={{ width: 1.5, height: 14, backgroundColor: color, borderRadius: 0.75 }} />
            <View
              style={{
                position: 'absolute',
                top: 5,
                width: 4,
                height: 3,
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
          </View>
        </View>
      );

    case 'database':
      // Database storage / stacked cylinders icon
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          {/* Top disc */}
          <View
            style={{
              width: 14,
              height: 4,
              borderRadius: 2,
              borderWidth: 1.5,
              borderColor: color,
              marginBottom: 1,
            }}
          />
          {/* Middle disc */}
          <View
            style={{
              width: 14,
              height: 4,
              borderRadius: 2,
              borderWidth: 1.5,
              borderColor: color,
              marginBottom: 1,
            }}
          />
          {/* Bottom disc */}
          <View
            style={{
              width: 14,
              height: 4,
              borderRadius: 2,
              borderWidth: 1.5,
              borderColor: color,
            }}
          />
        </View>
      );

    case 'chart':
      // Bar chart / stats overview icon
      return (
        <View
          style={[
            styles.center,
            { width: size, height: size, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 2 },
          ]}
        >
          <View style={{ width: 2.8, height: 7, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ width: 2.8, height: 14, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ width: 2.8, height: 10, backgroundColor: color, borderRadius: 1 }} />
        </View>
      );

    case 'privacy':
    case 'lock':
      // Padlock / privacy icon
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          {/* Shackle */}
          <View
            style={{
              width: 8,
              height: 6,
              borderWidth: 1.6,
              borderColor: color,
              borderTopLeftRadius: 4,
              borderTopRightRadius: 4,
              borderBottomWidth: 0,
            }}
          />
          {/* Lock body */}
          <View
            style={{
              width: 13,
              height: 9,
              borderRadius: 2.5,
              borderWidth: 1.6,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 2,
                height: 2.5,
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
          </View>
        </View>
      );

    case 'export':
      // Export tray with up arrow icon
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          {/* Arrow pointing up */}
          <View style={{ alignItems: 'center', marginBottom: 2 }}>
            <View
              style={{
                width: 5,
                height: 5,
                borderLeftWidth: 1.6,
                borderTopWidth: 1.6,
                borderColor: color,
                transform: [{ rotate: '45deg' }],
                marginBottom: -2,
              }}
            />
            <View
              style={{
                width: 1.6,
                height: 7,
                backgroundColor: color,
                borderRadius: 0.8,
              }}
            />
          </View>
          {/* Base tray */}
          <View
            style={{
              width: 13,
              height: 4,
              borderLeftWidth: 1.6,
              borderRightWidth: 1.6,
              borderBottomWidth: 1.6,
              borderColor: color,
              borderBottomLeftRadius: 2,
              borderBottomRightRadius: 2,
            }}
          />
        </View>
      );

    case 'restore':
      // Restore tray with down arrow icon
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          {/* Arrow pointing down */}
          <View style={{ alignItems: 'center', marginBottom: 1 }}>
            <View
              style={{
                width: 1.6,
                height: 7,
                backgroundColor: color,
                borderRadius: 0.8,
              }}
            />
            <View
              style={{
                width: 5,
                height: 5,
                borderRightWidth: 1.6,
                borderBottomWidth: 1.6,
                borderColor: color,
                transform: [{ rotate: '45deg' }],
                marginTop: -2,
              }}
            />
          </View>
          {/* Base tray */}
          <View
            style={{
              width: 13,
              height: 4,
              borderLeftWidth: 1.6,
              borderRightWidth: 1.6,
              borderBottomWidth: 1.6,
              borderColor: color,
              borderBottomLeftRadius: 2,
              borderBottomRightRadius: 2,
            }}
          />
        </View>
      );

    case 'app':
      // Phone / app device icon
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          <View
            style={{
              width: 11,
              height: 15,
              borderRadius: 3,
              borderWidth: 1.6,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 1.5,
            }}
          >
            <View
              style={{
                width: 3,
                height: 1,
                backgroundColor: color,
                borderRadius: 0.5,
              }}
            />
            <View
              style={{
                width: 2.5,
                height: 2.5,
                borderRadius: 1.25,
                borderWidth: 0.8,
                borderColor: color,
              }}
            />
          </View>
        </View>
      );

    case 'version':
      // Version tag / release label icon
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              borderWidth: 1.6,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ rotate: '45deg' }],
            }}
          >
            <View
              style={{
                width: 2.5,
                height: 2.5,
                borderRadius: 1.25,
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );

    case 'package':
      // Package box icon
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          <View
            style={{
              width: 13,
              height: 13,
              borderRadius: 2,
              borderWidth: 1.6,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 5,
                height: 1.5,
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );

    case 'cpu':
      // Architecture / microchip icon
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          {/* Center chip body */}
          <View
            style={{
              width: 9,
              height: 9,
              borderRadius: 2,
              borderWidth: 1.6,
              borderColor: color,
            }}
          />
          {/* Top & Bottom pins */}
          <View
            style={{
              position: 'absolute',
              width: 5,
              height: 15,
              borderTopWidth: 1.5,
              borderBottomWidth: 1.5,
              borderColor: color,
            }}
          />
          {/* Left & Right pins */}
          <View
            style={{
              position: 'absolute',
              width: 15,
              height: 5,
              borderLeftWidth: 1.5,
              borderRightWidth: 1.5,
              borderColor: color,
            }}
          />
        </View>
      );

    case 'chevron-right':
      // Right chevron ›
      return (
        <View style={[styles.center, { width: 8, height: 12 }]}>
          <View
            style={{
              width: 6,
              height: 6,
              borderTopWidth: 1.8,
              borderRightWidth: 1.8,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
              marginLeft: -2,
            }}
          />
        </View>
      );

    case 'chevron-left':
      // Left chevron ‹
      return (
        <View style={[styles.center, { width: 12, height: 16 }]}>
          <View
            style={{
              width: 8,
              height: 8,
              borderLeftWidth: 2,
              borderBottomWidth: 2,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
              marginRight: -3,
            }}
          />
        </View>
      );

    case 'check':
      // Clean checkmark ✓
      return (
        <View style={[styles.center, { width: 12, height: 12 }]}>
          <View
            style={{
              width: 7,
              height: 4,
              borderBottomWidth: 1.8,
              borderLeftWidth: 1.8,
              borderColor: color,
              transform: [{ rotate: '-45deg' }],
              marginBottom: 1,
            }}
          />
        </View>
      );

    case 'shield':
      // Shield outline icon with inner notch
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          <View
            style={{
              width: size - 4,
              height: size - 2,
              borderWidth: 1.6,
              borderColor: color,
              borderTopLeftRadius: (size - 4) * 0.45,
              borderTopRightRadius: (size - 4) * 0.45,
              borderBottomLeftRadius: (size - 4) * 0.65,
              borderBottomRightRadius: (size - 4) * 0.65,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 4.5,
                height: 2.8,
                borderLeftWidth: 1.5,
                borderBottomWidth: 1.5,
                borderColor: color,
                transform: [{ rotate: '-45deg' }],
                marginTop: -1,
              }}
            />
          </View>
        </View>
      );

    case 'notes':
    case 'document':
      // Clean document with horizontal lines
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          <View
            style={{
              width: 12,
              height: 15,
              borderRadius: 2.5,
              borderWidth: 1.6,
              borderColor: color,
              padding: 2.2,
              justifyContent: 'space-between',
            }}
          >
            <View style={{ width: 5, height: 1.5, backgroundColor: color, borderRadius: 0.75 }} />
            <View style={{ width: 7, height: 1.5, backgroundColor: color, borderRadius: 0.75 }} />
            <View style={{ width: 4, height: 1.5, backgroundColor: color, borderRadius: 0.75 }} />
          </View>
        </View>
      );

    case 'trash':
      // Minimal trash bin icon
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          <View style={{ width: 5, height: 1.5, backgroundColor: color, borderRadius: 0.75, marginBottom: 1 }} />
          <View style={{ width: 13, height: 1.5, backgroundColor: color, borderRadius: 0.75, marginBottom: 1 }} />
          <View
            style={{
              width: 10,
              height: 10,
              borderWidth: 1.5,
              borderTopWidth: 0,
              borderColor: color,
              borderBottomLeftRadius: 2.5,
              borderBottomRightRadius: 2.5,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ width: 1.2, height: 5.5, backgroundColor: color, borderRadius: 0.6 }} />
          </View>
        </View>
      );

    case 'user':
    case 'account':
      // Person avatar icon
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              borderWidth: 1.5,
              borderColor: color,
              marginBottom: 1.5,
            }}
          />
          <View
            style={{
              width: 13,
              height: 6,
              borderTopLeftRadius: 6.5,
              borderTopRightRadius: 6.5,
              borderWidth: 1.5,
              borderBottomWidth: 0,
              borderColor: color,
            }}
          />
        </View>
      );

    case 'refresh':
    case 'update':
      // Circular reload icon
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          <View
            style={{
              width: 13,
              height: 13,
              borderRadius: 6.5,
              borderWidth: 1.6,
              borderColor: color,
              borderTopColor: 'transparent',
              alignItems: 'flex-end',
            }}
          >
            <View
              style={{
                width: 3.5,
                height: 3.5,
                borderTopWidth: 1.8,
                borderRightWidth: 1.8,
                borderColor: color,
                transform: [{ rotate: '30deg' }],
                marginTop: -1,
                marginRight: 0.5,
              }}
            />
          </View>
        </View>
      );

    case 'close':
    case 'x':
      // Clean '✕' cross icon
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          <View
            style={{
              width: 10,
              height: 10,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                position: 'absolute',
                width: 11,
                height: 1.8,
                backgroundColor: color,
                borderRadius: 1,
                transform: [{ rotate: '45deg' }],
              }}
            />
            <View
              style={{
                position: 'absolute',
                width: 11,
                height: 1.8,
                backgroundColor: color,
                borderRadius: 1,
                transform: [{ rotate: '-45deg' }],
              }}
            />
          </View>
        </View>
      );

    case 'alert':
    case 'warning':
      // Alert triangle / exclamation icon
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          <View
            style={{
              width: size - 2,
              height: size - 2,
              borderRadius: (size - 2) / 2,
              borderWidth: 1.6,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 1.8,
                height: 5,
                backgroundColor: color,
                borderRadius: 0.9,
                marginBottom: 1.5,
              }}
            />
            <View
              style={{
                width: 2,
                height: 2,
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
          </View>
        </View>
      );

    case 'settings':
    case 'gear':
      // Apple-style gear / cog icon
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          <View
            style={{
              position: 'absolute',
              width: 3.2,
              height: size - 1,
              backgroundColor: color,
              borderRadius: 1,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: size - 1,
              height: 3.2,
              backgroundColor: color,
              borderRadius: 1,
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: 3.2,
              height: size - 1,
              backgroundColor: color,
              borderRadius: 1,
              transform: [{ rotate: '45deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: size - 1,
              height: 3.2,
              backgroundColor: color,
              borderRadius: 1,
              transform: [{ rotate: '45deg' }],
            }}
          />
          <View
            style={{
              width: size - 4,
              height: size - 4,
              borderRadius: (size - 4) / 2,
              borderWidth: 2,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FFFFFF',
            }}
          >
            <View
              style={{
                width: (size - 4) * 0.35,
                height: (size - 4) * 0.35,
                borderRadius: ((size - 4) * 0.35) / 2,
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );

    case 'pin':
      // Apple-style pushpin icon
      return (
        <View style={[styles.center, { width: size, height: size, transform: [{ rotate: '-25deg' }] }]}>
          <View
            style={{
              width: 7,
              height: 3,
              borderTopLeftRadius: 2.5,
              borderTopRightRadius: 2.5,
              backgroundColor: color,
            }}
          />
          <View
            style={{
              width: 4.5,
              height: 4.5,
              backgroundColor: color,
              marginTop: -0.5,
            }}
          />
          <View
            style={{
              width: 9,
              height: 1.6,
              borderRadius: 0.8,
              backgroundColor: color,
              marginTop: -0.5,
            }}
          />
          <View
            style={{
              width: 1.5,
              height: 5.5,
              backgroundColor: color,
              borderRadius: 0.75,
            }}
          />
        </View>
      );

    case 'search':
      // Sleek magnifying glass icon
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          <View
            style={{
              width: size * 0.65,
              height: size * 0.65,
              borderRadius: (size * 0.65) / 2,
              borderWidth: 1.8,
              borderColor: color,
              position: 'absolute',
              top: 1,
              left: 1,
            }}
          />
          <View
            style={{
              width: size * 0.38,
              height: 2,
              backgroundColor: color,
              borderRadius: 1,
              position: 'absolute',
              bottom: 2.5,
              right: 1.5,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'plus':
    case 'add':
      // Refined plus icon
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          <View style={{ width: size - 4, height: 2, backgroundColor: color, borderRadius: 1 }} />
          <View style={{ position: 'absolute', width: 2, height: size - 4, backgroundColor: color, borderRadius: 1 }} />
        </View>
      );

    case 'archive':
      // Box archive drawer icon
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          <View style={{ width: size - 2, height: 4, backgroundColor: color, borderRadius: 1.5, marginBottom: 1 }} />
          <View
            style={{
              width: size - 4,
              height: size * 0.55,
              borderWidth: 1.5,
              borderColor: color,
              borderBottomLeftRadius: 3,
              borderBottomRightRadius: 3,
              alignItems: 'center',
              paddingTop: 2,
            }}
          >
            <View style={{ width: 5, height: 1.5, backgroundColor: color, borderRadius: 0.75 }} />
          </View>
        </View>
      );

    case 'floating':
    case 'floating-dot':
      // Clean signature dot with orbit ring
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          <View
            style={{
              width: size - 2,
              height: size - 2,
              borderRadius: (size - 2) / 2,
              borderWidth: 1.6,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );

    case 'reminders':
      // Re-use clock for reminders
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          <View
            style={{
              width: size - 2,
              height: size - 2,
              borderRadius: (size - 2) / 2,
              borderWidth: 1.6,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 2,
                height: 2,
                borderRadius: 1,
                backgroundColor: color,
                position: 'absolute',
              }}
            />
            <View
              style={{
                width: 1.6,
                height: 4.5,
                backgroundColor: color,
                borderRadius: 0.8,
                position: 'absolute',
                top: 2.5,
              }}
            />
            <View
              style={{
                width: 4,
                height: 1.6,
                backgroundColor: color,
                borderRadius: 0.8,
                position: 'absolute',
                right: 2.5,
              }}
            />
          </View>
        </View>
      );

    case 'play':
    case 'play-circle':
    case 'walkthrough':
      // Play circle / walkthrough icon
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          <View
            style={{
              width: size - 2,
              height: size - 2,
              borderRadius: (size - 2) / 2,
              borderWidth: 1.6,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
              paddingLeft: 1.5,
            }}
          >
            <View
              style={{
                width: 0,
                height: 0,
                borderLeftWidth: 6,
                borderTopWidth: 4,
                borderBottomWidth: 4,
                borderLeftColor: color,
                borderTopColor: 'transparent',
                borderBottomColor: 'transparent',
              }}
            />
          </View>
        </View>
      );


    case 'download':
      // Download arrow pointing down into tray
      return (
        <View style={[styles.center, { width: size, height: size }]}>
          <View style={{ width: 1.8, height: size - 8, backgroundColor: color, marginBottom: 2 }} />
          <View
            style={{
              width: 5,
              height: 5,
              borderBottomWidth: 1.8,
              borderRightWidth: 1.8,
              borderColor: color,
              transform: [{ rotate: '45deg' }],
              marginTop: -6,
              marginBottom: 3,
            }}
          />
          <View style={{ width: size - 4, height: 1.8, backgroundColor: color }} />
        </View>
      );

    default:
      return null;
  }
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
