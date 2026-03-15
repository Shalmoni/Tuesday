import type { BoardData, GitHubConfig } from '../types';
import { parseBoardData } from './boardData';

interface GitHubFileResponse {
  sha: string;
  content: string;
  encoding: string;
}

interface GitHubSaveResponse {
  commit?: {
    sha?: string;
  };
}

interface GitHubWorkflowRun {
  id: number;
  name: string;
  path?: string;
  status: string;
  conclusion: string | null;
  html_url: string;
}

interface GitHubWorkflowRunsResponse {
  workflow_runs: GitHubWorkflowRun[];
}

const encodeBase64 = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
};

const decodeBase64 = (value: string) => {
  const binary = atob(value.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const buildContentsUrl = (config: GitHubConfig) => {
  const path = config.path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${path}`;
};

const createHeaders = (token: string) => ({
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
});

const ensureValidConfig = (config: GitHubConfig) => {
  if (!config.owner || !config.repo || !config.branch || !config.path || !config.token) {
    throw new Error('Complete GitHub owner, repo, branch, path, and token first.');
  }
};

const readFileMetadata = async (config: GitHubConfig): Promise<GitHubFileResponse | null> => {
  const response = await fetch(`${buildContentsUrl(config)}?ref=${encodeURIComponent(config.branch)}`, {
    headers: createHeaders(config.token),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`GitHub read failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<GitHubFileResponse>;
};

export const loadBoardFromGitHub = async (config: GitHubConfig): Promise<BoardData> => {
  ensureValidConfig(config);

  const file = await readFileMetadata(config);
  if (!file) {
    throw new Error('No board file exists at the configured GitHub path yet.');
  }

  if (file.encoding !== 'base64') {
    throw new Error('GitHub returned an unexpected file encoding.');
  }

  const parsedBoard = parseBoardData(JSON.parse(decodeBase64(file.content)));
  if (!parsedBoard) {
    throw new Error('The GitHub JSON file does not match the expected board structure.');
  }

  return parsedBoard;
};

export const saveBoardToGitHub = async (board: BoardData, config: GitHubConfig) => {
  ensureValidConfig(config);

  const existingFile = await readFileMetadata(config);

  const response = await fetch(buildContentsUrl(config), {
    method: 'PUT',
    headers: {
      ...createHeaders(config.token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `Save board "${board.title}"`,
      content: encodeBase64(JSON.stringify(board, null, 2)),
      branch: config.branch,
      ...(existingFile ? { sha: existingFile.sha } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub save failed: ${response.status} ${response.statusText}`);
  }

  const result = (await response.json()) as GitHubSaveResponse;
  const commitSha = result.commit?.sha;
  if (!commitSha) {
    throw new Error('GitHub save succeeded, but the commit SHA was not returned.');
  }

  return {
    commitSha,
  };
};

export const getPagesWorkflowRunForCommit = async (
  config: GitHubConfig,
  commitSha: string,
): Promise<GitHubWorkflowRun | null> => {
  ensureValidConfig(config);

  const response = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/actions/runs?head_sha=${encodeURIComponent(commitSha)}&event=push&per_page=20`,
    {
      headers: createHeaders(config.token),
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub Actions check failed: ${response.status} ${response.statusText}`);
  }

  const result = (await response.json()) as GitHubWorkflowRunsResponse;
  return (
    result.workflow_runs.find(
      (workflowRun) =>
        workflowRun.path === '.github/workflows/deploy-pages.yml' ||
        workflowRun.name === 'Deploy to GitHub Pages',
    ) ?? null
  );
};
