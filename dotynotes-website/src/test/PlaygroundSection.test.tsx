import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlaygroundSection } from '../sections/PlaygroundSection';
import confetti from 'canvas-confetti';

describe('PlaygroundSection Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders default sample notes in sandbox', () => {
    render(<PlaygroundSection />);
    expect(screen.getByText('Offline Philosophy')).toBeInTheDocument();
    expect(screen.getByText('Weekend Project Sprint')).toBeInTheDocument();
    expect(screen.getByText('Book Recommendations')).toBeInTheDocument();
  });

  it('filters notes when switching tabs between All, Pinned, and Checklists', () => {
    render(<PlaygroundSection />);

    // Switch to Pinned
    const pinnedTab = screen.getByRole('button', { name: /^pinned/i });
    fireEvent.click(pinnedTab);

    // "Offline Philosophy" and "Weekend Project Sprint" are pinned in default sample
    expect(screen.getByText('Offline Philosophy')).toBeInTheDocument();
    expect(screen.getByText('Weekend Project Sprint')).toBeInTheDocument();
    // "Book Recommendations" is unpinned by default, so it should be filtered out
    expect(screen.queryByText('Book Recommendations')).not.toBeInTheDocument();

    // Switch to Checklists
    const checklistTab = screen.getByRole('button', { name: /^checklists/i });
    fireEvent.click(checklistTab);

    expect(screen.getByText('Weekend Project Sprint')).toBeInTheDocument();
    expect(screen.queryByText('Offline Philosophy')).not.toBeInTheDocument();
  });

  it('toggles pin status on a note card', () => {
    render(<PlaygroundSection />);

    // Find the unpin button on the pinned note (aria-label="Unpin note")
    const unpinButtons = screen.getAllByRole('button', { name: /unpin note/i });
    expect(unpinButtons.length).toBeGreaterThan(0);

    // Unpin first note
    fireEvent.click(unpinButtons[0]);

    // Now pin button for that card should exist (aria-label="Pin note")
    const pinButtons = screen.getAllByRole('button', { name: /^pin note$/i });
    expect(pinButtons.length).toBeGreaterThan(0);
  });

  it('toggles checklist item completion and triggers confetti when all items completed', () => {
    render(<PlaygroundSection />);

    // In 'Weekend Project Sprint', items 103 and 104 are incomplete initially
    const item3 = screen.getByText('Test rich text bold / italic shortcuts');
    const item4 = screen.getByText('Verify APK sideloading steps');

    expect(item3).toBeInTheDocument();
    expect(item4).toBeInTheDocument();

    // Complete item 3
    fireEvent.click(item3);
    expect(confetti).not.toHaveBeenCalled();

    // Complete item 4 (completes the checklist)
    fireEvent.click(item4);
    expect(confetti).toHaveBeenCalled();
  });

  it('accepts an injected externalNote (e.g. from Quick Pad drawer)', () => {
    const externalNote = {
      id: 'ext-test-1',
      title: 'Note from Quick Pad Drawer',
      body: 'Seamless sandbox sync across components',
      colorId: 'lavender',
      isPinned: true,
      type: 'text' as const,
      updatedAt: 'Just now',
    };

    const { rerender } = render(<PlaygroundSection externalNote={null} />);
    expect(screen.queryByText('Note from Quick Pad Drawer')).not.toBeInTheDocument();

    rerender(<PlaygroundSection externalNote={externalNote} />);
    expect(screen.getByText('Note from Quick Pad Drawer')).toBeInTheDocument();
  });

  it('deletes a note when the delete button is clicked', () => {
    render(<PlaygroundSection />);
    expect(screen.getByText('Book Recommendations')).toBeInTheDocument();

    const deleteButtons = screen.getAllByRole('button', { name: /delete note/i });
    // Delete "Book Recommendations" (3rd sample note, index 2)
    fireEvent.click(deleteButtons[2]);

    expect(screen.queryByText('Book Recommendations')).not.toBeInTheDocument();
  });
});
