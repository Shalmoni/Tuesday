import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { StatusOption } from '../types';
import { getContrastTextColor } from '../utils/statusOptions';

interface EditStatusColumnModalProps {
  isOpen: boolean;
  columnName: string;
  initialStatuses: StatusOption[];
  onClose: () => void;
  onSubmit: (statuses: StatusOption[]) => void;
}

const createEmptyStatus = (): StatusOption => ({
  id: `status-${crypto.randomUUID()}`,
  label: '',
  color: '#579bfc',
});

export function EditStatusColumnModal({
  isOpen,
  columnName,
  initialStatuses,
  onClose,
  onSubmit,
}: EditStatusColumnModalProps) {
  const [statuses, setStatuses] = useState<StatusOption[]>(initialStatuses);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setStatuses(initialStatuses);
  }, [initialStatuses, isOpen]);

  const hasValidStatuses = useMemo(
    () => statuses.some((status) => status.label.trim().length > 0),
    [statuses],
  );

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextStatuses = statuses
      .map((status) => ({
        ...status,
        label: status.label.trim(),
      }))
      .filter((status) => status.label.length > 0);

    if (nextStatuses.length === 0) {
      return;
    }

    onSubmit(nextStatuses);
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
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-column-modal-title"
      >
        <h2 id="status-column-modal-title">Edit statuses</h2>
        <p className="modal-copy">Choose labels and colors for the `{columnName}` status column.</p>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="status-options-editor">
            {statuses.map((status) => (
              <div key={status.id} className="status-option-row">
                <input
                  value={status.label}
                  onChange={(event) =>
                    setStatuses((currentStatuses) =>
                      currentStatuses.map((currentStatus) =>
                        currentStatus.id === status.id
                          ? { ...currentStatus, label: event.target.value }
                          : currentStatus,
                      ),
                    )
                  }
                  placeholder="Status label"
                  aria-label="Status label"
                />
                <input
                  type="color"
                  className="status-color-input"
                  value={status.color}
                  onChange={(event) =>
                    setStatuses((currentStatuses) =>
                      currentStatuses.map((currentStatus) =>
                        currentStatus.id === status.id
                          ? { ...currentStatus, color: event.target.value }
                          : currentStatus,
                      ),
                    )
                  }
                  aria-label="Status color"
                />
                <span
                  className="status-preview-pill"
                  style={{
                    backgroundColor: status.color,
                    color: getContrastTextColor(status.color),
                  }}
                >
                  {status.label.trim() || 'Preview'}
                </span>
                <button
                  type="button"
                  className="remove-status-button"
                  onClick={() =>
                    setStatuses((currentStatuses) =>
                      currentStatuses.filter((currentStatus) => currentStatus.id !== status.id),
                    )
                  }
                  aria-label="Remove status"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="add-status-option-button"
            onClick={() => setStatuses((currentStatuses) => [...currentStatuses, createEmptyStatus()])}
          >
            + Add status
          </button>

          <div className="modal-actions">
            <button type="button" className="modal-secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-primary-button" disabled={!hasValidStatuses}>
              Save statuses
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
