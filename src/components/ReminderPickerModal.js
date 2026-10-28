import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { formatReminderDate } from '../services/notificationService';
import { getSettingAsync } from '../services/notesDb';
import { useTheme } from '../context/ThemeContext';

export default function ReminderPickerModal({
  visible,
  initialReminderAt = null,
  onConfirm,
  onRemove,
  onClose,
}) {
  const { theme, isDark } = useTheme();
  const styles = React.useMemo(() => createReminderPickerStyles(theme, isDark), [theme, isDark]);
  const [hour12, setHour12] = useState(9);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState('AM'); // 'AM' | 'PM'
  const [currentTimestamp, setCurrentTimestamp] = useState(0);

  // Generate the next 7 days for quick day picking
  const availableDays = React.useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const isToday = i === 0;
      const isTomorrow = i === 1;
      let label = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      days.push({
        date: d,
        index: i,
        label,
        subLabel: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      });
    }
    return days;
  }, []);

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  // Initialize or reset picker state
  useEffect(() => {
    if (visible) {
      setCurrentTimestamp(Date.now());
      if (initialReminderAt && initialReminderAt > Date.now()) {
        const d = new Date(initialReminderAt);
        // Find matching day index if within 7 days
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        const diffDays = Math.round((startOfTarget - startOfToday) / 86400000);
        setSelectedDayIndex(diffDays >= 0 && diffDays < 7 ? diffDays : 0);

        let h = d.getHours();
        const p = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        setHour12(h);
        setMinute(Math.round(d.getMinutes() / 5) * 5 % 60);
        setPeriod(p);
      } else {
        // Default to saved reminder time preference or upcoming hour
        getSettingAsync('default_reminder_time', '09:00 AM').then((savedPreset) => {
          if (savedPreset && typeof savedPreset === 'string') {
            const parts = savedPreset.trim().split(' ');
            if (parts.length === 2) {
              const timeParts = parts[0].split(':');
              const h = parseInt(timeParts[0], 10);
              const m = parseInt(timeParts[1], 10) || 0;
              const p = parts[1].toUpperCase();
              if (!isNaN(h) && (p === 'AM' || p === 'PM')) {
                setHour12(h);
                setMinute(m);
                setPeriod(p);
                return;
              }
            }
          }
        }).catch(() => {});

        const now = new Date();
        if (now.getHours() < 20) {
          // Default to today evening or +2 hours
          setSelectedDayIndex(0);
          const nextHour = now.getHours() + 2;
          const p = nextHour >= 12 ? 'PM' : 'AM';
          setHour12(nextHour % 12 || 12);
          setMinute(0);
          setPeriod(p);
        } else {
          // Late night: default to tomorrow at 9:00 AM
          setSelectedDayIndex(1);
          setHour12(9);
          setMinute(0);
          setPeriod('AM');
        }
      }
    }
  }, [visible, initialReminderAt]);

  // Compute calculated target timestamp
  const computedTimestamp = React.useMemo(() => {
    const dayObj = availableDays[selectedDayIndex] || availableDays[0];
    const target = new Date(dayObj.date);
    let h24 = hour12 % 12;
    if (period === 'PM') h24 += 12;
    target.setHours(h24, minute, 0, 0);
    return target.getTime();
  }, [selectedDayIndex, hour12, minute, period, availableDays]);

  const isPast = currentTimestamp > 0 && computedTimestamp <= currentTimestamp;

  // Apply Quick Presets
  const applyPreset = (type) => {
    if (type === '1h') {
      const target = new Date(Date.now() + 3600000);
      target.setMinutes(Math.ceil(target.getMinutes() / 5) * 5, 0, 0);
      onConfirm(target.getTime());
      onClose();
    } else if (type === 'evening') {
      const target = new Date();
      target.setHours(18, 0, 0, 0);
      if (target.getTime() <= Date.now()) {
        target.setDate(target.getDate() + 1);
      }
      onConfirm(target.getTime());
      onClose();
    } else if (type === 'tomorrow_morning') {
      const target = new Date();
      target.setDate(target.getDate() + 1);
      target.setHours(9, 0, 0, 0);
      onConfirm(target.getTime());
      onClose();
    } else if (type === 'tomorrow_evening') {
      const target = new Date();
      target.setDate(target.getDate() + 1);
      target.setHours(18, 0, 0, 0);
      onConfirm(target.getTime());
      onClose();
    }
  };

  const handleConfirm = () => {
    if (isPast) return;
    onConfirm(computedTimestamp);
    onClose();
  };

  const handleHourStep = (delta) => {
    let next = hour12 + delta;
    if (next < 1) next = 12;
    if (next > 12) next = 1;
    setHour12(next);
  };

  const handleMinuteStep = (delta) => {
    let next = minute + delta;
    if (next < 0) next = 55;
    if (next >= 60) next = 0;
    setMinute(next);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Set Reminder</Text>
              <Text style={styles.subtitle}>Select when you want to be reminded</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Quick Presets */}
            <Text style={styles.sectionHeading}>QUICK PRESETS</Text>
            <View style={styles.presetsGrid}>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => applyPreset('1h')}
                activeOpacity={0.7}
              >
                <Text style={styles.presetText}>In 1 Hour</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => applyPreset('evening')}
                activeOpacity={0.7}
              >
                <Text style={styles.presetText}>Today 6 PM</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => applyPreset('tomorrow_morning')}
                activeOpacity={0.7}
              >
                <Text style={styles.presetText}>Tomorrow 9 AM</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => applyPreset('tomorrow_evening')}
                activeOpacity={0.7}
              >
                <Text style={styles.presetText}>Tomorrow 6 PM</Text>
              </TouchableOpacity>
            </View>

            {/* Custom Day Selector */}
            <Text style={styles.sectionHeading}>SELECT DAY</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.daysRow}
            >
              {availableDays.map((item) => {
                const isSelected = selectedDayIndex === item.index;
                return (
                  <TouchableOpacity
                    key={item.index}
                    style={[styles.dayChip, isSelected && styles.dayChipSelected]}
                    onPress={() => setSelectedDayIndex(item.index)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dayChipTitle,
                        isSelected && styles.dayChipTitleSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={[
                        styles.dayChipSub,
                        isSelected && styles.dayChipSubSelected,
                      ]}
                    >
                      {item.subLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Custom Time Selector */}
            <Text style={styles.sectionHeading}>SELECT TIME</Text>
            <View style={styles.timeStepperRow}>
              {/* Hour Stepper */}
              <View style={styles.stepperContainer}>
                <Text style={styles.stepperLabel}>HOUR</Text>
                <View style={styles.stepperControls}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => handleHourStep(-1)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.stepBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepperVal}>
                    {hour12 < 10 ? `0${hour12}` : hour12}
                  </Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => handleHourStep(1)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.timeColon}>:</Text>

              {/* Minute Stepper */}
              <View style={styles.stepperContainer}>
                <Text style={styles.stepperLabel}>MINUTE</Text>
                <View style={styles.stepperControls}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => handleMinuteStep(-5)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.stepBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepperVal}>
                    {minute < 10 ? `0${minute}` : minute}
                  </Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => handleMinuteStep(5)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* AM / PM Toggle */}
              <View style={styles.amPmContainer}>
                <TouchableOpacity
                  style={[styles.amPmBtn, period === 'AM' && styles.amPmBtnActive]}
                  onPress={() => setPeriod('AM')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.amPmBtnText,
                      period === 'AM' && styles.amPmBtnTextActive,
                    ]}
                  >
                    AM
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.amPmBtn, period === 'PM' && styles.amPmBtnActive]}
                  onPress={() => setPeriod('PM')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.amPmBtnText,
                      period === 'PM' && styles.amPmBtnTextActive,
                    ]}
                  >
                    PM
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Live Preview Box */}
            <View
              style={[
                styles.previewBox,
                isPast && styles.previewBoxError,
              ]}
            >
              <Text
                style={[
                  styles.previewText,
                  isPast && styles.previewTextError,
                ]}
              >
                {isPast
                  ? 'Selected time is in the past. Please choose a future time.'
                  : `Scheduled for ${formatReminderDate(computedTimestamp)}`}
              </Text>
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footer}>
            {initialReminderAt && onRemove && (
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => {
                  onRemove();
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.removeBtnText}>Clear</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, isPast && styles.confirmBtnDisabled]}
              disabled={isPast}
              onPress={handleConfirm}
              activeOpacity={0.7}
            >
              <Text style={styles.confirmBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createReminderPickerStyles = (theme, isDark) =>
  StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: theme.colors.modalBackground,
    borderRadius: 18,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.modalBorder,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.35 : 0.08,
    shadowRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primaryText,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12.5,
    color: theme.colors.secondaryText,
    marginTop: 2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 12,
    color: theme.colors.secondaryText,
    fontWeight: '600',
  },
  scroll: {
    marginVertical: 4,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.secondaryText,
    marginTop: 12,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  presetChip: {
    backgroundColor: isDark ? theme.colors.surfaceSecondary : '#F7F7F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.primaryText,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
    marginBottom: 8,
  },
  dayChip: {
    backgroundColor: isDark ? theme.colors.surfaceSecondary : '#F7F7F9',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 72,
  },
  dayChipSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  dayChipTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primaryText,
  },
  dayChipTitleSelected: {
    color: '#FFFFFF',
  },
  dayChipSub: {
    fontSize: 10,
    color: theme.colors.secondaryText,
    marginTop: 2,
  },
  dayChipSubSelected: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  timeStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? theme.colors.surfaceSecondary : '#F7F7F9',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 14,
  },
  stepperContainer: {
    alignItems: 'center',
  },
  stepperLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: theme.colors.secondaryText,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primaryText,
    lineHeight: 18,
  },
  stepperVal: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primaryText,
    minWidth: 38,
    textAlign: 'center',
    marginHorizontal: 4,
  },
  timeColon: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.secondaryText,
    marginHorizontal: 8,
    marginTop: 14,
  },
  amPmContainer: {
    marginLeft: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  amPmBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
  },
  amPmBtnActive: {
    backgroundColor: theme.colors.accent,
  },
  amPmBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.secondaryText,
  },
  amPmBtnTextActive: {
    color: '#FFFFFF',
  },
  previewBox: {
    backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#F1EAFE',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(109, 40, 217, 0.15)',
    padding: 10,
    marginBottom: 8,
  },
  previewBoxError: {
    backgroundColor: isDark ? 'rgba(248, 113, 113, 0.15)' : '#FDF0F2',
    borderColor: isDark ? 'rgba(248, 113, 113, 0.3)' : '#F8B4BD',
  },
  previewText: {
    fontSize: 12,
    fontWeight: '500',
    color: isDark ? '#A78BFA' : '#6D28D9',
    textAlign: 'center',
  },
  previewTextError: {
    color: isDark ? '#F87171' : '#D9485F',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  removeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: isDark ? 'rgba(248, 113, 113, 0.15)' : '#FDF0F2',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(248, 113, 113, 0.3)' : '#F8B4BD',
    marginRight: 'auto',
  },
  removeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: isDark ? '#F87171' : '#D9485F',
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.secondaryText,
  },
  confirmBtn: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  confirmBtnDisabled: {
    opacity: 0.45,
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
