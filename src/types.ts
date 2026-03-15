export type ColumnType = 'text' | 'status';

export interface StatusOption {
  id: string;
  label: string;
  color: string;
}

export interface ColumnDefinition {
  id: string;
  name: string;
  type: ColumnType;
  statusOptions: StatusOption[];
}

export interface BoardItem {
  id: string;
  title: string;
  columns: Record<string, string>;
  childColumns: ColumnDefinition[];
  children: BoardItem[];
  collapsed?: boolean;
}

export interface BoardGroup {
  id: string;
  name: string;
  items: BoardItem[];
}

export interface BoardData {
  title: string;
  columns: ColumnDefinition[];
  groups: BoardGroup[];
}

export interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  token: string;
}
