import React, { useRef } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface TestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TestModal: React.FC<TestModalProps> = ({ isOpen, onClose }) => {
  const containerRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose });

  if (!isOpen) return null;

  return (
    <div ref={containerRef} role="dialog" aria-modal="true" tabIndex={-1}>
      <button data-testid="first-btn">First Button</button>
      <input data-testid="input-field" type="text" placeholder="Type here" />
      <button data-testid="last-btn">Last Button</button>
    </div>
  );
};

const TestHost: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const triggerBtnRef = useRef<HTMLButtonElement>(null);

  return (
    <div>
      <button
        ref={triggerBtnRef}
        data-testid="trigger-btn"
        onClick={() => setOpen(true)}
      >
        Open Modal
      </button>
      <TestModal isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
};

describe('useFocusTrap Hook', () => {
  it('moves focus into modal on open', async () => {
    render(<TestHost />);
    const trigger = screen.getByTestId('trigger-btn');
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByTestId('first-btn'));
    });
  });

  it('traps Tab navigation within the modal', async () => {
    render(<TestHost />);
    fireEvent.click(screen.getByTestId('trigger-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('first-btn')).toHaveFocus();
    });

    const lastBtn = screen.getByTestId('last-btn');
    lastBtn.focus();
    expect(lastBtn).toHaveFocus();

    // Tab on last element wraps focus back to first element
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(screen.getByTestId('first-btn')).toHaveFocus();
  });

  it('traps Shift+Tab navigation within the modal', async () => {
    render(<TestHost />);
    fireEvent.click(screen.getByTestId('trigger-btn'));

    const firstBtn = await screen.findByTestId('first-btn');
    firstBtn.focus();
    expect(firstBtn).toHaveFocus();

    // Shift+Tab on first element wraps focus to last element
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(screen.getByTestId('last-btn')).toHaveFocus();
  });

  it('closes modal on Escape key', async () => {
    render(<TestHost />);
    fireEvent.click(screen.getByTestId('trigger-btn'));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('restores focus to trigger element on modal close', async () => {
    render(<TestHost />);
    const trigger = screen.getByTestId('trigger-btn');
    trigger.focus();
    fireEvent.click(trigger);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(document.activeElement).toBe(trigger);
  });

  it('locks body scrolling when open and restores it when closed', async () => {
    const originalOverflow = document.body.style.overflow;

    render(<TestHost />);
    fireEvent.click(screen.getByTestId('trigger-btn'));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(document.body.style.overflow).toBe(originalOverflow);
  });
});
