/**
 * Mock Notes Data for DotyNotes UI Demonstration
 * 
 * NOTE: This is purely static demonstration data to preview the responsive
 * card grid, color palette, tags, and pin states. No persistent storage is connected yet.
 */

export const MOCK_NOTES = [
  {
    id: 'mock-note-1',
    title: 'Daily Standup Prep 🚀',
    content: 'Review the offline sync architecture. Discuss floating dot permissions on Android 14+.',
    tag: 'Work',
    colorSchemeId: 'purple',
    isPinned: true,
    isArchived: false,
    updatedAt: '10:45 AM',
    dateLabel: 'Today',
  },
  {
    id: 'mock-note-2',
    title: 'Weekend Grocery Run 🛒',
    content: 'Oat milk, avocados, green tea, dark chocolate, fresh sourdough bread.',
    tag: 'Personal',
    colorSchemeId: 'yellow',
    isPinned: true,
    isArchived: false,
    updatedAt: 'Yesterday',
    dateLabel: 'Yesterday',
  },
  {
    id: 'mock-note-3',
    title: 'App Architecture Note 💡',
    content: 'Keep local SQLite queries lightweight. Float bubble should launch overlay window with minimal memory footprint.',
    tag: 'Dev',
    colorSchemeId: 'mint',
    isPinned: false,
    isArchived: false,
    updatedAt: 'Oct 18',
    dateLabel: 'Oct 18',
  },
  {
    id: 'mock-note-4',
    title: 'Book Recommendations 📚',
    content: '1. Designing Data-Intensive Applications\n2. Atomic Habits\n3. The Pragmatic Programmer',
    tag: 'Reading',
    colorSchemeId: 'peach',
    isPinned: false,
    isArchived: false,
    updatedAt: 'Oct 16',
    dateLabel: 'Oct 16',
  },
  {
    id: 'mock-note-5',
    title: 'Morning Reflections 🧘',
    content: 'Start every morning with 10 min mindfulness before checking notifications.',
    tag: 'Life',
    colorSchemeId: 'blue',
    isPinned: false,
    isArchived: false,
    updatedAt: 'Oct 14',
    dateLabel: 'Oct 14',
  },
  {
    id: 'mock-note-6',
    title: 'Archived Idea: Old Wireframes 🗂️',
    content: 'Initial v0 wireframes for legacy note list. Archived for reference.',
    tag: 'Archive',
    colorSchemeId: 'rose',
    isPinned: false,
    isArchived: true,
    updatedAt: 'Sep 29',
    dateLabel: 'Sep 29',
  },
];
