import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';

interface GitHubTokenModalProps {
  isOpen: boolean;
  initialValue: string;
  onClose: () => void;
  onSubmit: (token: string) => void;
}

export function GitHubTokenModal({
  isOpen,
  initialValue,
  onClose,
  onSubmit,
}: GitHubTokenModalProps) {
  const [token, setToken] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setToken(initialValue);
  }, [initialValue, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(token.trim());
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="modal-backdrop"
      onKeyDown={handleKeyDown}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="token-modal-title">
        <h2 id="token-modal-title">GitHub token</h2>
        <p className="modal-copy">
          Enter a fine-grained GitHub token with repository `Contents` read/write access.
        </p>

        <form className="modal-form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="github_pat_..."
            aria-label="GitHub token"
          />

          <div className="modal-actions">
            <button type="button" className="modal-secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-primary-button">
              Save token
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
