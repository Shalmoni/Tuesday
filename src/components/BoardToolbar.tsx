interface BoardToolbarProps {
  onSaveToGitHub: () => void;
  onLoadFromGitHub: () => void;
  onSetGitHubToken: () => void;
  githubStatusMessage: string;
  githubBusy: boolean;
  repoLabel: string;
  hasGitHubToken: boolean;
}

export function BoardToolbar({
  onSaveToGitHub,
  onLoadFromGitHub,
  onSetGitHubToken,
  githubStatusMessage,
  githubBusy,
  repoLabel,
  hasGitHubToken,
}: BoardToolbarProps) {
  return (
    <section className="toolbar">
      <div className="toolbar-heading">
        <h1>Tuesday: Tree Manager</h1>
        <p className="toolbar-subcopy">
          Local edits save instantly in your browser. GitHub sync is wired to `{repoLabel}` and
          writes the board into `data/board.json`.
        </p>
      </div>

      <div className="toolbar-actions-shell">
        <div className="toolbar-actions">
          <button type="button" className="toolbar-button" onClick={onLoadFromGitHub} disabled={githubBusy}>
            Load from GitHub
          </button>
          <button
            type="button"
            className="toolbar-button primary-toolbar-button"
            onClick={onSaveToGitHub}
            disabled={githubBusy}
          >
            {githubBusy ? 'Working...' : 'Save to GitHub'}
          </button>
          <button type="button" className="toolbar-button" onClick={onSetGitHubToken} disabled={githubBusy}>
            {hasGitHubToken ? 'Change GitHub token' : 'Set GitHub token'}
          </button>
        </div>

        <p className="github-status-message">{githubStatusMessage}</p>
      </div>
    </section>
  );
}
