import type { BoardData, GitHubConfig } from '../types';
import { parseBoardData } from './boardData';

const STORAGE_KEY = 'tuesday-tree-manager-board';
const GITHUB_CONFIG_KEY = 'tuesday-tree-manager-github-config';

const defaultGitHubConfig: GitHubConfig = {
  owner: '',
  repo: '',
  branch: 'main',
  path: 'data/board.json',
  token: '',
};

export const loadBoardData = (): BoardData | null => {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    return parseBoardData(JSON.parse(rawValue));
  } catch {
    return null;
  }
};

export const saveBoardData = (board: BoardData) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
};

export const loadGitHubConfig = (): GitHubConfig => {
  try {
    const rawValue = window.localStorage.getItem(GITHUB_CONFIG_KEY);
    if (!rawValue) {
      return defaultGitHubConfig;
    }

    const parsed = JSON.parse(rawValue) as Partial<GitHubConfig>;

    return {
      owner: typeof parsed.owner === 'string' ? parsed.owner : defaultGitHubConfig.owner,
      repo: typeof parsed.repo === 'string' ? parsed.repo : defaultGitHubConfig.repo,
      branch: typeof parsed.branch === 'string' && parsed.branch ? parsed.branch : defaultGitHubConfig.branch,
      path: typeof parsed.path === 'string' && parsed.path ? parsed.path : defaultGitHubConfig.path,
      token: typeof parsed.token === 'string' ? parsed.token : defaultGitHubConfig.token,
    };
  } catch {
    return defaultGitHubConfig;
  }
};

export const saveGitHubConfig = (config: GitHubConfig) => {
  window.localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(config));
};
