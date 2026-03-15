import { CSSProperties, KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { BoardItem, ColumnDefinition, Comment } from '../types';
import { BoardRows } from './BoardRows';
import { getColumnWidth } from '../utils/columns';

const ITEM_COL_MIN = 160;

interface BoardTableProps {
  groupName: string;
  groupColor: string;
  items: BoardItem[];
  columns: ColumnDefinition[];
  itemColumnWidth: number;
  selectedItemIds: Set<string>;
  onGroupNameChange: (value: string) => void;
  onGroupColorChange: (value: string) => void;
  onAddColumn: () => void;
  onAddTopLevelItem: () => void;
  onRenameColumn: (columnId: string) => void;
  onEditStatusColumn: (columnId: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onResizeColumn: (columnId: string, width: number) => void;
  onResizeItemColumn: (width: number) => void;
  onAddChildColumn: (itemId: string) => void;
  onRenameChildColumn: (itemId: string, columnId: string) => void;
  onEditChildStatusColumn: (itemId: string, columnId: string) => void;
  onDeleteChildColumn: (itemId: string, columnId: string) => void;
  onToggleSelectItem: (itemId: string) => void;
  onDeleteSelectedItems: () => void;
  onToggleExpand: (itemId: string) => void;
  onRenameItem: (itemId: string, name: string) => void;
  onAddSubItem: (parentId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateColumnValue: (itemId: string, columnId: string, value: string) => void;
  onUpdateItemComments: (itemId: string, comments: Comment[]) => void;
}

export function BoardTable({
  groupName,
  groupColor,
  items,
  columns,
  itemColumnWidth,
  selectedItemIds,
  onGroupNameChange,
  onGroupColorChange,
  onAddColumn,
  onAddTopLevelItem,
  onRenameColumn,
  onEditStatusColumn,
  onDeleteColumn,
  onResizeColumn,
  onResizeItemColumn,
  onAddChildColumn,
  onRenameChildColumn,
  onEditChildStatusColumn,
  onDeleteChildColumn,
  onToggleSelectItem,
  onDeleteSelectedItems,
  onToggleExpand,
  onRenameItem,
  onAddSubItem,
  onDeleteItem,
  onUpdateColumnValue,
  onUpdateItemComments,
}: BoardTableProps) {
  const [openColumnMenuId, setOpenColumnMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const suppressCloseRef = useRef(false);

  useEffect(() => {
    if (!openColumnMenuId) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (suppressCloseRef.current) {
        suppressCloseRef.current = false;
        return;
      }
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpenColumnMenuId(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [openColumnMenuId]);

  const handleEnterKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    }
  };

  const clampedItemWidth = Math.max(itemColumnWidth, ITEM_COL_MIN);
  const dataCols = columns.map((column) => `${getColumnWidth(column)}px`);
  // Last data column (or the add-column cell) stretches to fill remaining space.
  const stretchedDataCols =
    dataCols.length > 0
      ? [...dataCols.slice(0, -1), `minmax(${dataCols[dataCols.length - 1]}, 1fr)`]
      : dataCols;
  const templateColumns = `56px ${clampedItemWidth}px ${stretchedDataCols.join(' ')} minmax(56px, auto)`;
  const groupStyle = {
    '--group-accent': groupColor,
  } as CSSProperties & Record<'--group-accent', string>;

  return (
    <section className="board-shell" style={groupStyle}>
      <div className="board-shell-header">
        <div className="board-title-bar">
          <label className="group-color-picker" aria-label="Group color">
            <input
              type="color"
              value={groupColor}
              onChange={(event) => onGroupColorChange(event.target.value)}
              aria-label="Group color"
            />
          </label>
          <input
            className="group-name-input"
            value={groupName}
            onChange={(event) => onGroupNameChange(event.target.value)}
            onKeyDown={handleEnterKey}
            aria-label="Group name"
          />
        </div>

        {selectedItemIds.size > 0 ? (
          <div className="bulk-action-bar">
            <span>{selectedItemIds.size} item{selectedItemIds.size === 1 ? '' : 's'} selected</span>
            <button type="button" className="bulk-delete-button" onClick={onDeleteSelectedItems}>
              Delete
            </button>
          </div>
        ) : null}
      </div>

      <div className="board-scroll-area">
      <div className="board-table" style={{ gridTemplateColumns: templateColumns }}>
        <div className="board-header-cell selector-header" />
        <div className="board-header-cell item-header-cell">
          Item
          <button
            type="button"
            className="column-resize-handle"
            aria-label="Resize item column"
            onMouseDown={(event) => {
              event.preventDefault();
              const startX = event.clientX;
              const startWidth = clampedItemWidth;

              const handleMouseMove = (moveEvent: MouseEvent) => {
                onResizeItemColumn(startWidth + moveEvent.clientX - startX);
              };

              const handleMouseUp = () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
              };

              window.addEventListener('mousemove', handleMouseMove);
              window.addEventListener('mouseup', handleMouseUp);
            }}
          />
        </div>
        {columns.map((column) => (
          <div
            key={column.id}
            className={`board-header-cell column-header-cell${openColumnMenuId === column.id ? ' menu-open' : ''}`}
            ref={openColumnMenuId === column.id ? menuRef : null}
          >
            <span>{column.name}</span>
            <button
              type="button"
              className="column-menu-trigger"
              onMouseDown={() => {
                suppressCloseRef.current = true;
                setOpenColumnMenuId((currentId) => (currentId === column.id ? null : column.id));
              }}
              aria-label={`Open ${column.name} column menu`}
            >
              ⋯
            </button>

            {openColumnMenuId === column.id ? (
              <div className="column-menu" onMouseDown={(e) => e.preventDefault()}>
                <button
                  type="button"
                  onMouseDown={() => {
                    setOpenColumnMenuId(null);
                    onRenameColumn(column.id);
                  }}
                >
                  Rename column
                </button>
                {column.type === 'status' ? (
                  <button
                    type="button"
                    onMouseDown={() => {
                      setOpenColumnMenuId(null);
                      onEditStatusColumn(column.id);
                    }}
                  >
                    Edit statuses
                  </button>
                ) : null}
                <button
                  type="button"
                  className="destructive-menu-item"
                  onMouseDown={() => {
                    setOpenColumnMenuId(null);
                    onDeleteColumn(column.id);
                  }}
                >
                  Delete column
                </button>
              </div>
            ) : null}
            <button
              type="button"
              className="column-resize-handle"
              aria-label={`Resize ${column.name} column`}
              onMouseDown={(event) => {
                event.preventDefault();
                const startX = event.clientX;
                const startWidth = getColumnWidth(column);

                const handleMouseMove = (moveEvent: MouseEvent) => {
                  onResizeColumn(column.id, startWidth + moveEvent.clientX - startX);
                };

                const handleMouseUp = () => {
                  window.removeEventListener('mousemove', handleMouseMove);
                  window.removeEventListener('mouseup', handleMouseUp);
                };

                window.addEventListener('mousemove', handleMouseMove);
                window.addEventListener('mouseup', handleMouseUp);
              }}
            />
          </div>
        ))}
        <button
          type="button"
          className="board-header-cell add-column-header"
          onClick={onAddColumn}
          aria-label="Add column"
        >
          +
        </button>

        <BoardRows
          items={items}
          columns={columns}
          depth={0}
          selectedItemIds={selectedItemIds}
          onToggleSelectItem={onToggleSelectItem}
          onToggleExpand={onToggleExpand}
          onRenameItem={onRenameItem}
          onAddSubItem={onAddSubItem}
          onDeleteItem={onDeleteItem}
          onUpdateColumnValue={onUpdateColumnValue}
          onUpdateItemComments={onUpdateItemComments}
          onAddChildColumn={onAddChildColumn}
          onResizeColumn={onResizeColumn}
          onRenameChildColumn={onRenameChildColumn}
          onEditChildStatusColumn={onEditChildStatusColumn}
          onDeleteChildColumn={onDeleteChildColumn}
        />

        <button type="button" className="board-cell add-item-row add-item-row-full" onClick={onAddTopLevelItem}>
          + Add item
        </button>
      </div>
      </div>
    </section>
  );
}
