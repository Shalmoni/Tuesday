import type { BoardGroup, BoardItem, ColumnDefinition } from '../types';

const createId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export const createEmptyGroup = (name = 'New group'): BoardGroup => ({
  id: createId('group'),
  name,
  items: [],
});

export const createEmptyItem = (
  columns: ColumnDefinition[],
  title = 'New item',
): BoardItem => ({
  id: createId('item'),
  title,
  columns: Object.fromEntries(columns.map((column) => [column.id, ''])),
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

export const addColumnToItems = (
  items: BoardItem[],
  columnId: string,
): BoardItem[] =>
  items.map((item) => ({
    ...item,
    columns: {
      ...item.columns,
      [columnId]: '',
    },
    children: addColumnToItems(item.children, columnId),
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
      children: removeColumnFromItems(item.children, columnId),
    };
  });

export const clearRemovedStatusValues = (
  items: BoardItem[],
  columnId: string,
  validStatusIds: Set<string>,
): BoardItem[] =>
  items.map((item) => ({
    ...item,
    columns: {
      ...item.columns,
      [columnId]: validStatusIds.has(item.columns[columnId]) ? item.columns[columnId] : '',
    },
    children: clearRemovedStatusValues(item.children, columnId, validStatusIds),
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
