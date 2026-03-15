import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';

interface RenameColumnModalProps {
  isOpen: boolean;
  initialName: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export function RenameColumnModal({ isOpen, initialName, onClose, onSubmit }: RenameColumnModalProps) {
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
    }
  }, [initialName, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      onSubmit(trimmed);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') onClose();
  };

  return (
    <div
      className="modal-backdrop"
      onKeyDown={handleKeyDown}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="rename-col-title">
        <h2 id="rename-col-title">Rename column</h2>
        <form className="modal-form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Column name"
            aria-label="Column name"
          />
          <div className="modal-actions">
            <button type="button" className="modal-secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-primary-button">
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
