import type {
  BoardData,
  BoardGroup,
  BoardItem,
  ColumnDefinition,
  ColumnType,
  StatusOption,
} from '../types';
import { createDefaultStatusOptions } from './statusOptions';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeColumnType = (value: unknown): ColumnType =>
  value === 'status' ? 'status' : 'text';

const normalizeStatusOptions = (value: unknown): StatusOption[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((option) => {
    if (
      !isRecord(option) ||
      typeof option.id !== 'string' ||
      typeof option.label !== 'string' ||
      typeof option.color !== 'string'
    ) {
      return [];
    }

    return [
      {
        id: option.id,
        label: option.label,
        color: option.color,
      },
    ];
  });
};

const normalizeColumns = (value: unknown): ColumnDefinition[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((column) => {
    if (!isRecord(column) || typeof column.id !== 'string' || typeof column.name !== 'string') {
      return [];
    }

    const type = normalizeColumnType(column.type);
    const statusOptions =
      type === 'status'
        ? (() => {
            const normalized = normalizeStatusOptions(column.statusOptions);
            return normalized.length > 0 ? normalized : createDefaultStatusOptions();
          })()
        : [];

    return [{ id: column.id, name: column.name, type, statusOptions }];
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
      if (typeof rawValue !== 'string') {
        return [column.id, ''];
      }

      if (column.type !== 'status') {
        return [column.id, rawValue];
      }

      const matchingStatus = column.statusOptions.find(
        (statusOption) => statusOption.id === rawValue || statusOption.label === rawValue,
      );

      return [column.id, matchingStatus?.id ?? ''];
    }),
  );

  const rawChildren = Array.isArray(value.children) ? value.children : [];
  const hasChildColumnsField = Object.prototype.hasOwnProperty.call(value, 'childColumns');
  const childColumns = hasChildColumnsField ? normalizeColumns(value.childColumns) : columns;
  const children = rawChildren.flatMap((child) => {
    const normalizedChild = normalizeItem(child, childColumns);
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
    childColumns,
    children,
    collapsed: typeof value.collapsed === 'boolean' ? value.collapsed : false,
  };
};

const normalizeGroup = (
  value: unknown,
  columns: ColumnDefinition[],
): BoardGroup | null => {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return null;
  }

  const rawItems = Array.isArray(value.items) ? value.items : [];
  const items = rawItems.flatMap((item) => {
    const normalizedItem = normalizeItem(item, columns);
    return normalizedItem ? [normalizedItem] : [];
  });

  return {
    id: value.id,
    name: typeof value.name === 'string' ? value.name : 'New group',
    items,
  };
};

export const parseBoardData = (value: unknown): BoardData | null => {
  if (!isRecord(value)) {
    return null;
  }

  const columns = normalizeColumns(value.columns);
  const rawGroups = Array.isArray(value.groups) ? value.groups : [];
  const groupsFromGroupsField = rawGroups.flatMap((group) => {
    const normalizedGroup = normalizeGroup(group, columns);
    return normalizedGroup ? [normalizedGroup] : [];
  });

  const legacyItems = Array.isArray(value.items) ? value.items : [];
  const legacyGroupItems = legacyItems.flatMap((item) => {
    const normalizedItem = normalizeItem(item, columns);
    return normalizedItem ? [normalizedItem] : [];
  });

  return {
    title: typeof value.title === 'string' ? value.title : 'Tuesday',
    columns,
    groups:
      groupsFromGroupsField.length > 0
        ? groupsFromGroupsField
        : legacyGroupItems.length > 0
          ? [
              {
                id: 'group-imported',
                name: typeof value.title === 'string' ? value.title : 'Group 1',
                items: legacyGroupItems,
              },
            ]
          : [],
  };
};
