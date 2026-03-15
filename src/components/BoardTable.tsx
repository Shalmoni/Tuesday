import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { BoardItem, ColumnDefinition } from '../types';
import { BoardRows } from './BoardRows';

interface BoardTableProps {
  groupName: string;
  items: BoardItem[];
  columns: ColumnDefinition[];
  selectedItemIds: Set<string>;
  onGroupNameChange: (value: string) => void;
  onAddColumn: () => void;
  onAddTopLevelItem: () => void;
  onRenameColumn: (columnId: string) => void;
  onEditStatusColumn: (columnId: string) => void;
  onDeleteColumn: (columnId: string) => void;
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
}

export function BoardTable({
  groupName,
  items,
  columns,
  selectedItemIds,
  onGroupNameChange,
  onAddColumn,
  onAddTopLevelItem,
  onRenameColumn,
  onEditStatusColumn,
  onDeleteColumn,
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
}: BoardTableProps) {
  const [openColumnMenuId, setOpenColumnMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openColumnMenuId) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
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
  const templateColumns = `56px minmax(320px, 1.8fr) ${columns
    .map(() => 'minmax(180px, 1fr)')
    .join(' ')} 56px`;

  return (
    <section className="board-shell">
      <div className="board-title-bar">
        <button type="button" className="board-title-toggle" aria-label="Board expanded">
          ▾
        </button>
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

      <div className="board-table" style={{ gridTemplateColumns: templateColumns }}>
        <div className="board-header-cell selector-header" />
        <div className="board-header-cell">Item</div>
        {columns.map((column) => (
          <div
            key={column.id}
            className="board-header-cell column-header-cell"
            ref={openColumnMenuId === column.id ? menuRef : null}
          >
            <span>{column.name}</span>
            <button
              type="button"
              className="column-menu-trigger"
              onClick={() =>
                setOpenColumnMenuId((currentId) => (currentId === column.id ? null : column.id))
              }
              aria-label={`Open ${column.name} column menu`}
            >
              ⋯
            </button>

            {openColumnMenuId === column.id ? (
              <div className="column-menu">
                <button
                  type="button"
                  onClick={() => {
                    onRenameColumn(column.id);
                    setOpenColumnMenuId(null);
                  }}
                >
                  Rename column
                </button>
                {column.type === 'status' ? (
                  <button
                    type="button"
                    onClick={() => {
                      onEditStatusColumn(column.id);
                      setOpenColumnMenuId(null);
                    }}
                  >
                    Edit statuses
                  </button>
                ) : null}
                <button
                  type="button"
                  className="destructive-menu-item"
                  onClick={() => {
                    onDeleteColumn(column.id);
                    setOpenColumnMenuId(null);
                  }}
                >
                  Delete column
                </button>
              </div>
            ) : null}
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
          onAddChildColumn={onAddChildColumn}
          onRenameChildColumn={onRenameChildColumn}
          onEditChildStatusColumn={onEditChildStatusColumn}
          onDeleteChildColumn={onDeleteChildColumn}
        />

        <div className="board-cell selector-cell empty-cell" />
        <button type="button" className="board-cell add-item-row" onClick={onAddTopLevelItem}>
          + Add item
        </button>
        {columns.map((column) => (
          <div key={`add-item-empty-${column.id}`} className="board-cell empty-cell" />
        ))}
        <div className="board-cell empty-cell" />
      </div>
    </section>
  );
}
