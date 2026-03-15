import type { ColumnDefinition, ColumnType } from '../types';

export const getDefaultColumnWidth = (type: ColumnType): number => {
  if (type === 'list') {
    return 320;
  }

  if (type === 'status') {
    return 220;
  }

  return 200;
};

export const getColumnWidth = (column: ColumnDefinition): number =>
  Math.max(column.width ?? getDefaultColumnWidth(column.type), 140);
