import type { BoardGroup, BoardItem, ColumnDefinition } from '../types';

const createId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const defaultGroupColors = ['#579bfc', '#8c5cf5', '#00c875', '#fdab3d', '#e2445c', '#0097a7'];
const appendColumnDefinition = (columns: ColumnDefinition[], nextColumn: ColumnDefinition) =>
  columns.some((column) => column.id === nextColumn.id) ? columns : [...columns, nextColumn];

export const getDefaultColumnValue = (column: ColumnDefinition) =>
  column.type === 'status' ? (column.statusOptions[0]?.id ?? '') : column.type === 'list' ? '[]' : '';

export const createEmptyGroup = (
  name = 'New group',
  color = defaultGroupColors[Math.floor(Math.random() * defaultGroupColors.length)],
): BoardGroup => ({
  id: createId('group'),
  name,
  color,
  items: [],
});

export const createEmptyItem = (
  columns: ColumnDefinition[],
  title = 'New item',
): BoardItem => ({
  id: createId('item'),
  title,
  columns: Object.fromEntries(columns.map((column) => [column.id, getDefaultColumnValue(column)])),
  childColumns: [],
  children: [],
  collapsed: false,
});

export const findItemById = (items: BoardItem[], itemId: string): BoardItem | null => {
  for (const item of items) {
    if (item.id === itemId) {
      return item;
    }

    const nestedMatch = findItemById(item.children, itemId);
    if (nestedMatch) {
      return nestedMatch;
    }
  }

  return null;
};

export const findItemPathById = (items: BoardItem[], itemId: string): BoardItem[] | null => {
  for (const item of items) {
    if (item.id === itemId) {
      return [item];
    }

    const nestedPath = findItemPathById(item.children, itemId);
    if (nestedPath) {
      return [item, ...nestedPath];
    }
  }

  return null;
};

export const updateItemById = (
  items: BoardItem[],
  itemId: string,
  updater: (item: BoardItem) => BoardItem,
): BoardItem[] =>
  items.map((item) => {
    if (item.id === itemId) {
      return updater(item);
    }

    if (item.children.length === 0) {
      return item;
    }

    return {
      ...item,
      children: updateItemById(item.children, itemId, updater),
    };
  });

export const addChildToItem = (
  items: BoardItem[],
  parentId: string,
  child: BoardItem,
): BoardItem[] =>
  updateItemById(items, parentId, (item) => ({
    ...item,
    collapsed: false,
    children: [...item.children, child],
  }));

export const collapseItemDescendants = (items: BoardItem[]): BoardItem[] =>
  items.map((item) => ({
    ...item,
    collapsed: true,
    children: collapseItemDescendants(item.children),
  }));

export const addSharedColumnToItems = (
  items: BoardItem[],
  column: ColumnDefinition,
): BoardItem[] =>
  items.map((item) => ({
    ...item,
    columns: {
      ...item.columns,
      [column.id]: item.columns[column.id] ?? getDefaultColumnValue(column),
    },
    childColumns: appendColumnDefinition(item.childColumns, column),
    children: addSharedColumnToItems(item.children, column),
  }));

export const addColumnToItems = (
  items: BoardItem[],
  columnId: string,
  defaultValue = '',
): BoardItem[] =>
  items.map((item) => ({
    ...item,
    columns: {
      ...item.columns,
      [columnId]: item.columns[columnId] ?? defaultValue,
    },
    children: addColumnToItems(item.children, columnId, defaultValue),
  }));

export const removeColumnFromItems = (
  items: BoardItem[],
  columnId: string,
): BoardItem[] =>
  items.map((item) => {
    const nextColumns = { ...item.columns };
    delete nextColumns[columnId];

    return {
      ...item,
      columns: nextColumns,
      childColumns: item.childColumns.filter((column) => column.id !== columnId),
      children: removeColumnFromItems(item.children, columnId),
    };
  });

export const updateColumnDefinitionInItems = (
  items: BoardItem[],
  columnId: string,
  updater: (column: ColumnDefinition) => ColumnDefinition,
): BoardItem[] =>
  items.map((item) => ({
    ...item,
    childColumns: item.childColumns.map((column) =>
      column.id === columnId ? updater(column) : column,
    ),
    children: updateColumnDefinitionInItems(item.children, columnId, updater),
  }));

export const clearRemovedStatusValues = (
  items: BoardItem[],
  columnId: string,
  validStatusIds: Set<string>,
  fallbackValue = '',
): BoardItem[] =>
  items.map((item) => ({
    ...item,
    columns: {
      ...item.columns,
      [columnId]: validStatusIds.has(item.columns[columnId]) ? item.columns[columnId] : fallbackValue,
    },
    children: clearRemovedStatusValues(item.children, columnId, validStatusIds, fallbackValue),
  }));

export const removeItemsByIds = (
  items: BoardItem[],
  itemIdsToRemove: Set<string>,
): BoardItem[] =>
  items
    .filter((item) => !itemIdsToRemove.has(item.id))
    .map((item) => ({
      ...item,
      children: removeItemsByIds(item.children, itemIdsToRemove),
    }));

export const removeItemById = (items: BoardItem[], itemId: string): BoardItem[] =>
  items
    .filter((item) => item.id !== itemId)
    .map((item) => ({
      ...item,
      children: removeItemById(item.children, itemId),
    }));
