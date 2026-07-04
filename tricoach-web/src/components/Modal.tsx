import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Native `<dialog>` — gets focus trapping, Escape-to-close, and focus
 * restoration on close for free from the browser, instead of reimplementing
 * all three by hand on a plain positioned `<div>`.
 */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    const handleClose = () => onCloseRef.current();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, []);

  // Light-dismiss-on-backdrop-click below is mouse-only by nature (MDN's own
  // <dialog> pattern); the keyboard-accessible close paths are Escape (native
  // to <dialog>, no JS needed) and the explicit button each caller renders inside.
  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={dialogRef}
      aria-label={title}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className="m-auto w-full max-w-sm rounded-card border-none bg-card-background p-4 backdrop:bg-black/50"
    >
      <p className="mb-3 font-semibold text-primary-text">{title}</p>
      {children}
    </dialog>
  );
}
