import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function CategoryTabs({ activeTab, onSelectTab, counts = {} }) {
  const { theme } = useTheme();

  const tabs = [
    { key: 'all', label: 'All Notes', count: counts.all || 0 },
    { key: 'pinned', label: 'Pinned', count: counts.pinned || 0 },
    { key: 'archived', label: 'Archive', count: counts.archived || 0 },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabButton,
                isActive
                  ? [
                      styles.activeTabButton,
                      {
                        backgroundColor: theme.colors.primary,
                        borderColor: theme.colors.primary,
                      },
                    ]
                  : [
                      styles.inactiveTabButton,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ],
              ]}
              onPress={() => onSelectTab(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${tab.label}, ${tab.count} items`}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabLabel,
                  isActive
                    ? styles.activeTabLabel
                    : [styles.inactiveTabLabel, { color: theme.colors.primaryText }],
                ]}
              >
                {tab.label}
              </Text>
              <View
                style={[
                  styles.countBadge,
                  isActive
                    ? styles.activeCountBadge
                    : [
                        styles.inactiveCountBadge,
                        { backgroundColor: theme.colors.surfaceSecondary },
                      ],
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    isActive
                      ? styles.activeCountText
                      : [styles.inactiveCountText, { color: theme.colors.textSecondary }],
                  ]}
                >
                  {tab.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
    borderWidth: 1,
    minHeight: 33,
  },
  inactiveTabButton: {},
  activeTabButton: {},
  tabLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    marginRight: 6,
    letterSpacing: -0.1,
  },
  inactiveTabLabel: {},
  activeTabLabel: {
    color: '#FFFFFF',
  },
  countBadge: {
    paddingHorizontal: 5.5,
    paddingVertical: 1.5,
    borderRadius: 5,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveCountBadge: {},
  activeCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  countText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  inactiveCountText: {},
  activeCountText: {
    color: '#FFFFFF',
  },
});
