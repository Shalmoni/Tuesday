import type { BoardData, BoardItem, ColumnDefinition } from '../types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeColumns = (value: unknown): ColumnDefinition[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((column) => {
    if (!isRecord(column) || typeof column.id !== 'string' || typeof column.name !== 'string') {
      return [];
    }

    return [{ id: column.id, name: column.name }];
  });
};

const normalizeItem = (
  value: unknown,
  columns: ColumnDefinition[],
): BoardItem | null => {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return null;
  }

  const rawColumns = isRecord(value.columns) ? value.columns : {};
  const normalizedColumns = Object.fromEntries(
    columns.map((column) => {
      const rawValue = rawColumns[column.id];
      return [column.id, typeof rawValue === 'string' ? rawValue : ''];
    }),
  );

  const rawChildren = Array.isArray(value.children) ? value.children : [];
  const children = rawChildren.flatMap((child) => {
    const normalizedChild = normalizeItem(child, columns);
    return normalizedChild ? [normalizedChild] : [];
  });

  return {
    id: value.id,
    title:
      typeof value.title === 'string'
        ? value.title
        : typeof value.name === 'string'
          ? value.name
          : 'Untitled item',
    columns: normalizedColumns,
    children,
    collapsed: typeof value.collapsed === 'boolean' ? value.collapsed : false,
  };
};

export const parseBoardData = (value: unknown): BoardData | null => {
  if (!isRecord(value)) {
    return null;
  }

  const columns = normalizeColumns(value.columns);
  const rawItems = Array.isArray(value.items) ? value.items : [];
  const items = rawItems.flatMap((item) => {
    const normalizedItem = normalizeItem(item, columns);
    return normalizedItem ? [normalizedItem] : [];
  });

  return {
    title: typeof value.title === 'string' ? value.title : 'Tuesday',
    columns,
    items,
  };
};
