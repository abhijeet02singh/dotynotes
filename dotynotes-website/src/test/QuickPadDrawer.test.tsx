import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuickPadDrawer } from '../components/QuickPadDrawer';

describe('QuickPadDrawer Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders the persistent floating dot edge handle', () => {
    render(<QuickPadDrawer />);
    const handle = screen.getByRole('button', { name: /open floating dot quick pad/i });
    expect(handle).toBeInTheDocument();
  });

  it('opens drawer upon clicking the floating dot handle and closes via close button', () => {
    render(<QuickPadDrawer />);
    const handle = screen.getByRole('button', { name: /open floating dot quick pad/i });
    
    // Open drawer
    fireEvent.click(handle);
    expect(screen.getByText('DotyNotes Quick Pad')).toBeInTheDocument();
    expect(screen.getByText(/Android Overlay Simulation/i)).toBeInTheDocument();

    // Close drawer
    const closeBtn = screen.getByRole('button', { name: /close quick pad/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByText('DotyNotes Quick Pad')).not.toBeInTheDocument();
  });

  it('opens drawer via global "open-quickpad" custom window event', () => {
    render(<QuickPadDrawer />);
    expect(screen.queryByText('DotyNotes Quick Pad')).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new CustomEvent('open-quickpad'));
    });

    expect(screen.getByText('DotyNotes Quick Pad')).toBeInTheDocument();
  });

  it('navigates to editor view and creates a new sticky note with localStorage persistence', () => {
    const handleCreated = vi.fn();
    render(<QuickPadDrawer onNoteCreated={handleCreated} />);

    // Open drawer
    act(() => {
      window.dispatchEvent(new CustomEvent('open-quickpad'));
    });

    // Click "+ New Sticky Note"
    const newNoteBtn = screen.getByRole('button', { name: /new sticky note/i });
    fireEvent.click(newNoteBtn);

    // Enter Title and Body
    const titleInput = screen.getByPlaceholderText(/title\.\.\./i);
    const bodyInput = screen.getByPlaceholderText(/write your thoughts here/i);

    fireEvent.change(titleInput, { target: { value: 'Test Quick Idea' } });
    fireEvent.change(bodyInput, { target: { value: 'Buy groceries and test overlay' } });

    // Choose a color (Pastel Mint)
    const mintColorBtn = screen.getByRole('button', { name: /select pastel mint/i });
    fireEvent.click(mintColorBtn);

    // Click Save Note
    const saveBtn = screen.getByRole('button', { name: /save note/i });
    fireEvent.click(saveBtn);

    // Verify callback
    expect(handleCreated).toHaveBeenCalledTimes(1);
    expect(handleCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test Quick Idea',
        body: 'Buy groceries and test overlay',
        colorId: 'mint',
      })
    );

    // Verify localStorage persistence
    const saved = localStorage.getItem('dotynotes_web_demo_notes');
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed[0].title).toBe('Test Quick Idea');
  });

  it('shows a validation warning if attempting to save with empty title and body', () => {
    render(<QuickPadDrawer />);

    act(() => {
      window.dispatchEvent(new CustomEvent('open-quickpad'));
    });

    fireEvent.click(screen.getByRole('button', { name: /new sticky note/i }));

    const saveBtn = screen.getByRole('button', { name: /save note/i });
    fireEvent.click(saveBtn);

    expect(screen.getByText(/please enter a note title or content/i)).toBeInTheDocument();
  });

  it('applies checklist formatting to note body on toolbar action', () => {
    render(<QuickPadDrawer />);

    act(() => {
      window.dispatchEvent(new CustomEvent('open-quickpad'));
    });

    fireEvent.click(screen.getByRole('button', { name: /new sticky note/i }));

    const textarea = screen.getByPlaceholderText(/write your thoughts here/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Initial line' } });
    textarea.selectionStart = 0;
    textarea.selectionEnd = 0;

    const checklistBtn = screen.getByRole('button', { name: /^checklist$/i });
    fireEvent.click(checklistBtn);

    expect(textarea.value).toContain('☐ ');
  });
});
