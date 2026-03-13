interface BoardToolbarProps {
  onSaveToGitHub: () => void;
  onLoadFromGitHub: () => void;
  githubPanelOpen: boolean;
  onToggleGitHubPanel: () => void;
  githubConfig: {
    owner: string;
    repo: string;
    branch: string;
    path: string;
    token: string;
  };
  onGitHubConfigChange: (field: 'owner' | 'repo' | 'branch' | 'path' | 'token', value: string) => void;
  githubStatusMessage: string;
  githubBusy: boolean;
}

export function BoardToolbar({
  onSaveToGitHub,
  onLoadFromGitHub,
  githubPanelOpen,
  onToggleGitHubPanel,
  githubConfig,
  onGitHubConfigChange,
  githubStatusMessage,
  githubBusy,
}: BoardToolbarProps) {
  return (
    <section className="toolbar">
      <div className="toolbar-heading">
        <h1>Tuesday: Tree Manager</h1>
        <p className="toolbar-subcopy">
          Local edits save instantly in your browser. Use GitHub actions below to sync a real
          `data/board.json` file into your repo.
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
          <button type="button" className="toolbar-button" onClick={onToggleGitHubPanel}>
            {githubPanelOpen ? 'Hide GitHub settings' : 'GitHub settings'}
          </button>
        </div>

        <p className="github-status-message">{githubStatusMessage}</p>
      </div>

      {githubPanelOpen ? (
        <div className="github-panel">
          <label>
            GitHub owner
            <input
              value={githubConfig.owner}
              onChange={(event) => onGitHubConfigChange('owner', event.target.value)}
              placeholder="your-username"
            />
          </label>

          <label>
            Repo
            <input
              value={githubConfig.repo}
              onChange={(event) => onGitHubConfigChange('repo', event.target.value)}
              placeholder="your-repo"
            />
          </label>

          <label>
            Branch
            <input
              value={githubConfig.branch}
              onChange={(event) => onGitHubConfigChange('branch', event.target.value)}
              placeholder="main"
            />
          </label>

          <label>
            File path
            <input
              value={githubConfig.path}
              onChange={(event) => onGitHubConfigChange('path', event.target.value)}
              placeholder="data/board.json"
            />
          </label>

          <label className="github-token-field">
            Fine-grained GitHub token
            <input
              type="password"
              value={githubConfig.token}
              onChange={(event) => onGitHubConfigChange('token', event.target.value)}
              placeholder="github_pat_..."
            />
          </label>

          <p className="github-panel-note">
            These GitHub settings are stored only in this browser via `localStorage`. Do not use a
            token you are not comfortable storing locally on your own machine.
          </p>
        </div>
      ) : null}
      
    </section>
  );
}
