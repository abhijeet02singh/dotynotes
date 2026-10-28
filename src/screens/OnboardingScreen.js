import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
  Image,
  BackHandler,
  Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import AppIcon from '../components/AppIcon';

export default function OnboardingScreen({ onComplete, onBack }) {
  const { theme, isDark } = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  const TOTAL_SLIDES = 6;

  const goToSlide = useCallback((index) => {
    if (index >= 0 && index < TOTAL_SLIDES) {
      flatListRef.current?.scrollToIndex({ index, animated: true });
      setCurrentIndex(index);
    }
  }, []);

  // Handle hardware Android back button
  useEffect(() => {
    const onBackPress = () => {
      if (currentIndex > 0) {
        goToSlide(currentIndex - 1);
        return true;
      }
      if (onBack) {
        onBack();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [currentIndex, onBack, goToSlide]);

  const handleNext = () => {
    if (currentIndex < TOTAL_SLIDES - 1) {
      goToSlide(currentIndex + 1);
    } else {
      onComplete?.();
    }
  };

  const handleSkip = () => {
    onComplete?.();
  };

  const onMomentumScrollEnd = useCallback(
    (e) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / screenWidth);
      if (index !== currentIndex && index >= 0 && index < TOTAL_SLIDES) {
        setCurrentIndex(index);
      }
    },
    [currentIndex, screenWidth]
  );

  // -------------------------------------------------------------
  // SLIDE 1: Welcome to DotyNotes
  // -------------------------------------------------------------
  const renderSlide1 = () => (
    <View style={[styles.slideContainer, { width: screenWidth }]}>
      <View style={styles.illustrationWrapper}>
        <View
          style={[
            styles.cardIllustration,
            {
              backgroundColor: isDark ? '#1F2430' : '#FFFFFF',
              borderColor: isDark ? '#2D3446' : '#E5E7EB',
            },
          ]}
        >
          {/* Header row with logo mark */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Image
                source={require('../../assets/dotynotes-mark.png')}
                style={styles.illustrationLogoMark}
                resizeMode="contain"
              />
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.brandTextDoty, { color: '#F99773' }]}>Doty</Text>
                  <Text
                    style={[
                      styles.brandTextNotes,
                      { color: isDark ? '#F3F4F6' : '#182E3A' },
                    ]}
                  >
                    Notes
                  </Text>
                </View>
                <Text style={[styles.brandSubtext, { color: theme.colors.textMuted }]}>
                  Offline & Private
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.badgePill,
                { backgroundColor: isDark ? '#2A324B' : '#F3E8FF' },
              ]}
            >
              <Text
                style={[
                  styles.badgePillText,
                  { color: theme.colors.primary || '#8B5CF6' },
                ]}
              >
                Simple & Fast
              </Text>
            </View>
          </View>

          {/* Note content mockup */}
          <View style={styles.cardBody}>
            <View
              style={[
                styles.noteLineHeading,
                { backgroundColor: isDark ? '#374151' : '#E5E7EB' },
              ]}
            />
            <View
              style={[
                styles.noteLineBody,
                { width: '92%', backgroundColor: isDark ? '#2D3748' : '#F3F4F6' },
              ]}
            />
            <View
              style={[
                styles.noteLineBody,
                { width: '78%', backgroundColor: isDark ? '#2D3748' : '#F3F4F6' },
              ]}
            />
            <View
              style={[
                styles.noteLineBody,
                { width: '60%', backgroundColor: isDark ? '#2D3748' : '#F3F4F6' },
              ]}
            />
          </View>

          {/* Floating mini note badge */}
          <View
            style={[
              styles.floatingAccentBadge,
              {
                backgroundColor: '#BFAFF8',
                borderColor: '#A792F5',
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppIcon name="pin" size={13} color="#2A1468" />
              <Text style={styles.floatingAccentText}>Pinned Idea</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.textContent}>
        <Text style={[styles.slideTitle, { color: theme.colors.primaryText }]}>
          Your thoughts, always within reach.
        </Text>
        <Text style={[styles.slideDescription, { color: theme.colors.secondaryText }]}>
          Capture ideas instantly with your private, offline-first notes companion.
        </Text>
      </View>
    </View>
  );

  // -------------------------------------------------------------
  // SLIDE 2: Your Notes, Your Way
  // -------------------------------------------------------------
  const renderSlide2 = () => (
    <View style={[styles.slideContainer, { width: screenWidth }]}>
      <View style={styles.illustrationWrapper}>
        <View
          style={[
            styles.cardIllustration,
            {
              backgroundColor: isDark ? '#1F2430' : '#FFFFFF',
              borderColor: isDark ? '#2D3446' : '#E5E7EB',
            },
          ]}
        >
          <View style={styles.deckContainer}>
            {/* Background Note (Peach) */}
            <View
              style={[
                styles.stickyCardBack,
                {
                  backgroundColor: '#F7CC78',
                  borderColor: '#EBB958',
                  transform: [{ rotate: '5deg' }],
                },
              ]}
            >
              <Text style={[styles.stickyTitle, { color: '#4E3000' }]}>Grocery List</Text>
              <Text style={[styles.stickyPreview, { color: '#6A4300' }]}>
                Fresh mint, lemons, olive oil
              </Text>
            </View>

            {/* Middle Note (Mint) */}
            <View
              style={[
                styles.stickyCardMid,
                {
                  backgroundColor: '#A4E7C0',
                  borderColor: '#82D8A4',
                  transform: [{ rotate: '-4deg' }],
                },
              ]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.stickyTitle, { color: '#074820' }]}>Weekend Trip</Text>
                <AppIcon name="clock" size={13} color="#137333" />
              </View>
              <Text style={[styles.stickyPreview, { color: '#0A5C2A' }]}>
                Pack walking shoes & camera
              </Text>
            </View>

            {/* Foreground Note (Lavender) */}
            <View
              style={[
                styles.stickyCardFront,
                {
                  backgroundColor: '#BFAFF8',
                  borderColor: '#A792F5',
                },
              ]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.stickyTitle, { color: '#2A1468' }]}>Project Roadmap</Text>
                <AppIcon name="pin" size={14} color="#6D28D9" />
              </View>
              <View style={{ gap: 4, marginTop: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 11, color: '#2A1468' }}>☑</Text>
                  <Text style={{ fontSize: 12, color: '#2A1468', fontWeight: '500' }}>
                    Design system unified
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 11, color: '#2A1468' }}>☐</Text>
                  <Text style={{ fontSize: 12, color: '#2A1468', fontWeight: '500' }}>
                    Release v1.0 on Android
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.textContent}>
        <Text style={[styles.slideTitle, { color: theme.colors.primaryText }]}>
          Organize every thought.
        </Text>
        <Text style={[styles.slideDescription, { color: theme.colors.secondaryText }]}>
          Create, edit, search, pin, archive, and organize your notes with colorful sticky-note cards.
        </Text>
      </View>
    </View>
  );

  // -------------------------------------------------------------
  // SLIDE 3: Floating Dot
  // -------------------------------------------------------------
  const renderSlide3 = () => (
    <View style={[styles.slideContainer, { width: screenWidth }]}>
      <View style={styles.illustrationWrapper}>
        <View
          style={[
            styles.cardIllustration,
            {
              backgroundColor: isDark ? '#1F2430' : '#FFFFFF',
              borderColor: isDark ? '#2D3446' : '#E5E7EB',
            },
          ]}
        >
          <View style={styles.screenEdgeMockup}>
            {/* Edge handle */}
            <View
              style={[
                styles.edgeHandlePill,
                { backgroundColor: theme.colors.primary || '#6D35D4' },
              ]}
            >
              <View style={styles.edgeHandleDot} />
            </View>

            {/* Miniature Quick Pad Window */}
            <View
              style={[
                styles.quickPadWindow,
                {
                  backgroundColor: isDark ? '#171923' : '#F9FAFB',
                  borderColor: isDark ? '#374151' : '#E5E7EB',
                },
              ]}
            >
              <View style={styles.quickPadHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={styles.quickPadIndicator} />
                  <Text
                    style={[
                      styles.quickPadTitle,
                      { color: isDark ? '#FFFFFF' : '#111827' },
                    ]}
                  >
                    Quick Pad
                  </Text>
                </View>
                <View
                  style={[
                    styles.quickPadBadge,
                    { backgroundColor: isDark ? '#2D3748' : '#EDE9FE' },
                  ]}
                >
                  <Text
                    style={[
                      styles.quickPadBadgeText,
                      { color: theme.colors.primary || '#7C3AED' },
                    ]}
                  >
                    Floating
                  </Text>
                </View>
              </View>

              <View style={styles.quickPadCheckRow}>
                <View
                  style={[
                    styles.checkCircleActive,
                    { backgroundColor: theme.colors.primary || '#6D35D4' },
                  ]}
                >
                  <AppIcon name="check" size={9} color="#FFFFFF" />
                </View>
                <Text
                  style={[
                    styles.checkTextActive,
                    { color: isDark ? '#D1D5DB' : '#374151' },
                  ]}
                >
                  Call client at 2:00 PM
                </Text>
              </View>

              <View style={styles.quickPadCheckRow}>
                <View
                  style={[
                    styles.checkCircleInactive,
                    { borderColor: isDark ? '#4B5563' : '#D1D5DB' },
                  ]}
                />
                <Text
                  style={[
                    styles.checkText,
                    { color: isDark ? '#9CA3AF' : '#6B7280' },
                  ]}
                >
                  Review meeting summary
                </Text>
              </View>

              <View style={styles.quickPadCheckRow}>
                <View
                  style={[
                    styles.checkCircleInactive,
                    { borderColor: isDark ? '#4B5563' : '#D1D5DB' },
                  ]}
                />
                <Text
                  style={[
                    styles.checkText,
                    { color: isDark ? '#9CA3AF' : '#6B7280' },
                  ]}
                >
                  Draft project milestones
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.textContent}>
        <Text style={[styles.slideTitle, { color: theme.colors.primaryText }]}>
          Quick notes, anywhere.
        </Text>
        <Text style={[styles.slideDescription, { color: theme.colors.secondaryText }]}>
          Use the floating handle to open Quick Pad and access your notes without reopening the app.
        </Text>
      </View>
    </View>
  );

  // -------------------------------------------------------------
  // SLIDE 4: Reminders
  // -------------------------------------------------------------
  const renderSlide4 = () => (
    <View style={[styles.slideContainer, { width: screenWidth }]}>
      <View style={styles.illustrationWrapper}>
        <View
          style={[
            styles.cardIllustration,
            {
              backgroundColor: isDark ? '#1F2430' : '#FFFFFF',
              borderColor: isDark ? '#2D3446' : '#E5E7EB',
            },
          ]}
        >
          {/* Polished Reminder Card Visual */}
          <View style={styles.reminderVisualContainer}>
            <View style={styles.reminderVisualHeader}>
              <View style={styles.reminderClockBox}>
                <AppIcon name="clock" size={20} color="#6D28D9" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.reminderVisualTitle,
                    { color: isDark ? '#F3F4F6' : '#111827' },
                  ]}
                >
                  Doctor&apos;s Appointment
                </Text>
                <Text
                  style={[
                    styles.reminderVisualSubtitle,
                    { color: isDark ? '#9CA3AF' : '#6B7280' },
                  ]}
                >
                  Clinic on 4th Avenue
                </Text>
              </View>
              <AppIcon name="bell" size={16} color="#6D28D9" />
            </View>

            <View
              style={[
                styles.reminderScheduleBadge,
                { backgroundColor: isDark ? '#2D3748' : '#F5F3FF' },
              ]}
            >
              <AppIcon name="clock" size={12} color="#6D28D9" />
              <Text style={styles.reminderScheduleBadgeText}>
                Tomorrow, 09:00 AM
              </Text>
            </View>

            <View style={styles.reminderSubnoteCard}>
              <Text style={[styles.reminderSubnoteText, { color: isDark ? '#CBD5E1' : '#475569' }]}>
                Bring previous checkup reports and prescription card.
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.textContent}>
        <Text style={[styles.slideTitle, { color: theme.colors.primaryText }]}>
          Never miss a thought.
        </Text>
        <Text style={[styles.slideDescription, { color: theme.colors.secondaryText }]}>
          Schedule reminders for important notes and receive notifications at the right time.
        </Text>
      </View>
    </View>
  );

  // -------------------------------------------------------------
  // SLIDE 5: Private & Offline
  // -------------------------------------------------------------
  const renderSlide5 = () => (
    <View style={[styles.slideContainer, { width: screenWidth }]}>
      <View style={styles.illustrationWrapper}>
        <View
          style={[
            styles.cardIllustration,
            {
              backgroundColor: isDark ? '#1F2430' : '#FFFFFF',
              borderColor: isDark ? '#2D3446' : '#E5E7EB',
            },
          ]}
        >
          <View style={styles.privacyCardCenter}>
            <View
              style={[
                styles.shieldIconContainer,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F0FDF4',
                  borderColor: isDark ? '#334155' : '#DCFCE7',
                },
              ]}
            >
              <AppIcon name="shield" size={32} color="#059669" />
            </View>

            <Text
              style={[
                styles.privacyCardHeading,
                { color: isDark ? '#F3F4F6' : '#111827' },
              ]}
            >
              100% Offline-First
            </Text>
            <Text
              style={[
                styles.privacyCardSub,
                { color: isDark ? '#9CA3AF' : '#6B7280' },
              ]}
            >
              Stored on your local device SQLite storage
            </Text>

            <View style={styles.privacyPillRow}>
              <View
                style={[
                  styles.privacyTagPill,
                  { backgroundColor: isDark ? '#2A324B' : '#F3F4F6' },
                ]}
              >
                <Text style={[styles.privacyTagText, { color: theme.colors.primaryText }]}>
                  No Account Needed
                </Text>
              </View>
              <View
                style={[
                  styles.privacyTagPill,
                  { backgroundColor: isDark ? '#2A324B' : '#F3F4F6' },
                ]}
              >
                <Text style={[styles.privacyTagText, { color: theme.colors.primaryText }]}>
                  No Cloud Tracking
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.textContent}>
        <Text style={[styles.slideTitle, { color: theme.colors.primaryText }]}>
          Your notes stay on your device.
        </Text>
        <Text style={[styles.slideDescription, { color: theme.colors.secondaryText }]}>
          DotyNotes is designed for local note-taking without requiring an account or cloud sync.
        </Text>
      </View>
    </View>
  );

  // -------------------------------------------------------------
  // SLIDE 6: Get Started
  // -------------------------------------------------------------
  const renderSlide6 = () => (
    <View style={[styles.slideContainer, { width: screenWidth }]}>
      <View style={styles.illustrationWrapper}>
        <View
          style={[
            styles.cardIllustration,
            {
              backgroundColor: isDark ? '#1F2430' : '#FFFFFF',
              borderColor: isDark ? '#2D3446' : '#E5E7EB',
            },
          ]}
        >
          <View style={styles.getStartedVisualContainer}>
            <Image
              source={require('../../assets/dotynotes-mark.png')}
              style={styles.getStartedLogoMark}
              resizeMode="contain"
            />
            <Text
              style={[
                styles.getStartedCardTitle,
                { color: isDark ? '#F3F4F6' : '#111827' },
              ]}
            >
              Start Your First Note
            </Text>
            <Text
              style={[
                styles.getStartedCardSub,
                { color: isDark ? '#9CA3AF' : '#6B7280' },
              ]}
            >
              Tap below to jump into your clean workspace.
            </Text>

            <View
              style={[
                styles.getStartedMiniCard,
                {
                  backgroundColor: '#BFAFF8',
                  borderColor: '#A792F5',
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 13, color: '#2A1468' }}>✎</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#2A1468' }}>
                  My First DotyNote
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: '#432688', marginTop: 3 }}>
                Ready to capture your inspirations...
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.textContent}>
        <Text style={[styles.slideTitle, { color: theme.colors.primaryText }]}>
          Ready to capture your ideas?
        </Text>
        <Text style={[styles.slideDescription, { color: theme.colors.secondaryText }]}>
          Your next great idea starts with a note.
        </Text>
      </View>
    </View>
  );

  const slides = [
    { id: '1', render: renderSlide1 },
    { id: '2', render: renderSlide2 },
    { id: '3', render: renderSlide3 },
    { id: '4', render: renderSlide4 },
    { id: '5', render: renderSlide5 },
    { id: '6', render: renderSlide6 },
  ];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? '#0F1219' : '#F8F9FD' },
      ]}
    >
      {/* Top Header Controls: Back & Skip */}
      <View style={styles.topBar}>
        {currentIndex > 0 ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => goToSlide(currentIndex - 1)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <AppIcon
              name="chevron-left"
              size={18}
              color={theme.colors.secondaryText || '#6B7280'}
            />
          </TouchableOpacity>
        ) : onBack ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Close onboarding"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <AppIcon
              name="close"
              size={18}
              color={theme.colors.secondaryText || '#6B7280'}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButtonPlaceholder} />
        )}

        {currentIndex < TOTAL_SLIDES - 1 ? (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={[styles.skipButtonText, { color: theme.colors.secondaryText }]}>
              Skip
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backButtonPlaceholder} />
        )}
      </View>

      {/* Horizontally Paging Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => item.render()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        bounces={false}
        scrollEventThrottle={16}
        style={styles.pagerList}
      />

      {/* Bottom Area: Indicators & Action Buttons */}
      <View style={styles.bottomArea}>
        {/* Page Indicators */}
        <View style={styles.indicatorRow}>
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const isActive = idx === currentIndex;
            return (
              <View
                key={idx}
                style={[
                  styles.indicatorPill,
                  {
                    width: isActive ? 22 : 7,
                    backgroundColor: isActive
                      ? theme.colors.primary || '#6D35D4'
                      : isDark
                      ? '#374151'
                      : '#D1D5DB',
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Primary Action Button */}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            { backgroundColor: theme.colors.primary || '#6D35D4' },
          ]}
          onPress={handleNext}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel={
            currentIndex === 0
              ? 'Get Started'
              : currentIndex === TOTAL_SLIDES - 1
              ? 'Start Using DotyNotes'
              : 'Next slide'
          }
        >
          <Text style={styles.primaryButtonText}>
            {currentIndex === 0
              ? 'Get Started'
              : currentIndex === TOTAL_SLIDES - 1
              ? 'Start Using DotyNotes'
              : 'Next'}
          </Text>
        </TouchableOpacity>

        {/* Secondary Action on final slide */}
        {currentIndex === TOTAL_SLIDES - 1 ? (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => goToSlide(TOTAL_SLIDES - 2)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Text
              style={[
                styles.secondaryButtonText,
                { color: theme.colors.secondaryText || '#6B7280' },
              ]}
            >
              Back
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.secondarySpacer} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 24 : 14,
    paddingBottom: 8,
    minHeight: 52,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  backButtonPlaceholder: {
    width: 36,
    height: 36,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  skipButtonText: {
    fontSize: 14.5,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  pagerList: {
    flex: 1,
  },
  slideContainer: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  illustrationWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    maxHeight: 330,
    marginTop: 10,
  },
  cardIllustration: {
    width: '100%',
    height: 250,
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.07,
        shadowRadius: 18,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  illustrationLogoMark: {
    width: 28,
    height: 36,
  },
  brandTextDoty: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  brandTextNotes: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  brandSubtext: {
    fontSize: 11,
    fontWeight: '500',
  },
  badgePill: {
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 8,
  },
  badgePillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  cardBody: {
    gap: 10,
    marginVertical: 12,
  },
  noteLineHeading: {
    height: 10,
    width: '45%',
    borderRadius: 5,
  },
  noteLineBody: {
    height: 7,
    borderRadius: 3.5,
  },
  floatingAccentBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: 10,
    borderWidth: 1,
  },
  floatingAccentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2A1468',
  },
  // Slide 2: Deck
  deckContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    height: 180,
  },
  stickyCardBack: {
    position: 'absolute',
    width: 220,
    height: 95,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    top: 15,
  },
  stickyCardMid: {
    position: 'absolute',
    width: 230,
    height: 105,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    top: 40,
  },
  stickyCardFront: {
    position: 'absolute',
    width: 240,
    height: 118,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    top: 75,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  stickyTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  stickyPreview: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Slide 3: Floating Edge
  screenEdgeMockup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  edgeHandlePill: {
    width: 14,
    height: 72,
    borderTopRightRadius: 7,
    borderBottomRightRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  edgeHandleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  quickPadWindow: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 9,
  },
  quickPadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  quickPadIndicator: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  quickPadTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  quickPadBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  quickPadBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  quickPadCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkCircleActive: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleInactive: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  checkTextActive: {
    fontSize: 12,
    fontWeight: '600',
    textDecorationLine: 'line-through',
  },
  checkText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Slide 4: Reminders
  reminderVisualContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 6,
  },
  reminderVisualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reminderClockBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderVisualTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  reminderVisualSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 1,
  },
  reminderScheduleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 7,
  },
  reminderScheduleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6D28D9',
  },
  reminderSubnoteCard: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(109, 40, 217, 0.06)',
  },
  reminderSubnoteText: {
    fontSize: 12,
    lineHeight: 16,
  },
  // Slide 5: Privacy
  privacyCardCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  shieldIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  privacyCardHeading: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  privacyCardSub: {
    fontSize: 12.5,
    textAlign: 'center',
    marginBottom: 14,
  },
  privacyPillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  privacyTagPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  privacyTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Slide 6: Get Started
  getStartedVisualContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 8,
  },
  getStartedLogoMark: {
    width: 36,
    height: 48,
    marginBottom: 4,
  },
  getStartedCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  getStartedCardSub: {
    fontSize: 12.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  getStartedMiniCard: {
    width: '90%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  // Text Content
  textContent: {
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  slideTitle: {
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    lineHeight: 33,
    marginBottom: 10,
  },
  slideDescription: {
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  // Bottom Area
  bottomArea: {
    paddingHorizontal: 28,
    paddingBottom: Platform.OS === 'android' ? 24 : 16,
    gap: 14,
    alignItems: 'center',
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  indicatorPill: {
    height: 7,
    borderRadius: 3.5,
  },
  primaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6D35D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  secondaryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  secondarySpacer: {
    height: 34,
  },
});
