import { FormEvent, useEffect, useRef, useState } from 'react';
import type { ColumnType } from '../types';

interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: { name: string; type: ColumnType }) => void;
}

export function AddColumnModal({ isOpen, onClose, onSubmit }: AddColumnModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ColumnType>('text');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setName('');
    setType('text');
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    onSubmit({
      name: trimmedName,
      type,
    });
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="column-modal-title">
        <h2 id="column-modal-title">Add column</h2>
        <p className="modal-copy">Choose the column type and give it a name.</p>

        <form className="modal-form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Column name"
            aria-label="Column name"
          />

          <div className="column-type-picker">
            <button
              type="button"
              className={type === 'text' ? 'column-type-button active' : 'column-type-button'}
              onClick={() => setType('text')}
            >
              Text
            </button>
            <button
              type="button"
              className={type === 'status' ? 'column-type-button active' : 'column-type-button'}
              onClick={() => setType('status')}
            >
              Status
            </button>
          </div>

          <div className="modal-actions">
            <button type="button" className="modal-secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-primary-button">
              Add column
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
