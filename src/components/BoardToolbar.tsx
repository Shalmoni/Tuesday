import { KeyboardEvent, useEffect, useRef, useState } from 'react';

interface BoardToolbarProps {
  boardTitle: string;
  onBoardTitleChange: (value: string) => void;
  onSaveToGitHub: () => void;
  onLoadFromGitHub: () => void;
  onSetGitHubToken: () => void;
  githubStatusMessage: string;
  githubStatusLabel: string;
  githubStatusTone: 'neutral' | 'pending' | 'success' | 'error';
  githubBusy: boolean;
  hasGitHubToken: boolean;
}

export function BoardToolbar({
  boardTitle,
  onBoardTitleChange,
  onSaveToGitHub,
  onLoadFromGitHub,
  onSetGitHubToken,
  githubStatusMessage,
  githubStatusLabel,
  githubStatusTone,
  githubBusy,
  hasGitHubToken,
}: BoardToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const handleEnterKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    }
  };

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [menuOpen]);

  return (
    <>
      <img className="page-corner-logo" src="./tree-logo.png" alt="" aria-hidden="true" />
      <section className="toolbar">
        <div className="toolbar-main-row">
          <div className="toolbar-title-shell">
            <input
              className="toolbar-title-input"
              value={boardTitle}
              onChange={(event) => onBoardTitleChange(event.target.value)}
              onKeyDown={handleEnterKey}
              aria-label="Board title"
            />
          </div>

          <div className="toolbar-actions">
            <button
              type="button"
              className="toolbar-button toolbar-icon-button"
              onClick={onLoadFromGitHub}
              disabled={githubBusy}
              aria-label="Load from GitHub"
              title="Load from GitHub"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 4v10m0 0 4-4m-4 4-4-4M5 18h14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              className="toolbar-button toolbar-icon-button primary-toolbar-button"
              onClick={onSaveToGitHub}
              disabled={githubBusy}
              aria-label={githubBusy ? 'Saving to GitHub' : 'Save to GitHub'}
              title={githubBusy ? 'Saving to GitHub' : 'Save to GitHub'}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M6 4h10l3 3v13H5V4h1Zm2 0v5h7V4M8 20v-6h8v6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <div className="toolbar-menu-shell" ref={menuRef}>
              <button
                type="button"
                className="toolbar-menu-trigger"
                onClick={() => setMenuOpen((currentValue) => !currentValue)}
                disabled={githubBusy}
                aria-label="Open toolbar menu"
              >
                ⋮
              </button>

              {menuOpen ? (
                <div className="toolbar-menu">
                  <button
                    type="button"
                    onClick={() => {
                      onSetGitHubToken();
                      setMenuOpen(false);
                    }}
                  >
                    {hasGitHubToken ? 'Change GitHub token' : 'Set GitHub token'}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {githubStatusMessage ? (
          <div className={`github-status-row github-status-${githubStatusTone}`}>
            <span className="github-status-pill">{githubStatusLabel}</span>
            <p className="github-status-message">{githubStatusMessage}</p>
          </div>
        ) : null}
      </section>
    </>
  );
}
