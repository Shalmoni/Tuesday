export interface ColumnDefinition {
  id: string;
  name: string;
}

export interface BoardItem {
  id: string;
  title: string;
  columns: Record<string, string>;
  children: BoardItem[];
  collapsed?: boolean;
}

export interface BoardData {
  title: string;
  columns: ColumnDefinition[];
  items: BoardItem[];
}

export interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  token: string;
}
