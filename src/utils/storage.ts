import type { BoardData, GitHubConfig } from '../types';
import { parseBoardData } from './boardData';

const STORAGE_KEY = 'tuesday-tree-manager-board';
const GITHUB_CONFIG_KEY = 'tuesday-tree-manager-github-config';

const detectRepoFromLocation = (): Pick<GitHubConfig, 'owner' | 'repo'> => {
  const { hostname, pathname } = window.location;
  const pathnameParts = pathname.split('/').filter(Boolean);

  if (hostname.endsWith('.github.io') && pathnameParts.length > 0) {
    const ownerFromHost = hostname.split('.')[0];

    return {
      owner: ownerFromHost ? ownerFromHost[0].toUpperCase() + ownerFromHost.slice(1) : 'Shalmoni',
      repo: pathnameParts[0],
    };
  }

  return {
    owner: 'Shalmoni',
    repo: 'Tuesday',
  };
};

const defaultGitHubConfig = (): GitHubConfig => {
  const detectedRepo = detectRepoFromLocation();

  return {
    owner: detectedRepo.owner,
    repo: detectedRepo.repo,
    branch: 'main',
    path: 'data/board.json',
    token: '',
  };
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
  const defaultConfig = defaultGitHubConfig();

  try {
    const rawValue = window.localStorage.getItem(GITHUB_CONFIG_KEY);
    if (!rawValue) {
      return defaultConfig;
    }

    const parsed = JSON.parse(rawValue) as Partial<GitHubConfig>;

    return {
      owner: defaultConfig.owner,
      repo: defaultConfig.repo,
      branch: defaultConfig.branch,
      path: defaultConfig.path,
      token: typeof parsed.token === 'string' ? parsed.token : defaultConfig.token,
    };
  } catch {
    return defaultConfig;
  }
};

export const saveGitHubConfig = (config: GitHubConfig) => {
  window.localStorage.setItem(
    GITHUB_CONFIG_KEY,
    JSON.stringify({
      token: config.token,
    }),
  );
};
