export type ColumnType = 'text' | 'status' | 'list';

export interface ListColumnEntry {
  id: string;
  left: string;
  right: string;
}

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
  width?: number;
}

export interface Comment {
  id: string;
  text: string;
  createdAt: string;
}

export interface BoardItem {
  id: string;
  title: string;
  columns: Record<string, string>;
  childColumns: ColumnDefinition[];
  children: BoardItem[];
  collapsed?: boolean;
  comments?: Comment[];
}

export interface BoardGroup {
  id: string;
  name: string;
  color: string;
  items: BoardItem[];
  itemColumnWidth?: number;
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
