import { CSSProperties, Fragment, KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { BoardItem, ColumnDefinition } from '../types';
import { getContrastTextColor } from '../utils/statusOptions';

interface BoardRowsProps {
  items: BoardItem[];
  columns: ColumnDefinition[];
  depth: number;
  selectedItemIds: Set<string>;
  onToggleSelectItem: (itemId: string) => void;
  onToggleExpand: (itemId: string) => void;
  onRenameItem: (itemId: string, name: string) => void;
  onAddSubItem: (parentId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateColumnValue: (itemId: string, columnId: string, value: string) => void;
  onAddChildColumn: (itemId: string) => void;
  onRenameChildColumn: (itemId: string, columnId: string) => void;
  onEditChildStatusColumn: (itemId: string, columnId: string) => void;
  onDeleteChildColumn: (itemId: string, columnId: string) => void;
}

const getTemplateColumns = (columns: ColumnDefinition[]) =>
  `56px minmax(320px, 1.8fr) ${columns.map(() => 'minmax(180px, 1fr)').join(' ')} 56px`;

const renderColumnInput = (
  item: BoardItem,
  column: ColumnDefinition,
  onUpdateColumnValue: (itemId: string, columnId: string, value: string) => void,
  onEnterKey: (event: KeyboardEvent<HTMLInputElement>) => void,
) => {
  if (column.type === 'status') {
    const selectedStatus =
      column.statusOptions.find((statusOption) => statusOption.id === (item.columns[column.id] ?? '')) ??
      null;
    const selectStyle = selectedStatus
      ? ({
          backgroundColor: selectedStatus.color,
          borderColor: selectedStatus.color,
          color: getContrastTextColor(selectedStatus.color),
          '--status-arrow-color': getContrastTextColor(selectedStatus.color),
        } as CSSProperties & Record<'--status-arrow-color', string>)
      : undefined;

    return (
      <select
        className={selectedStatus ? 'cell-input status-select status-filled' : 'cell-input status-select'}
        value={item.columns[column.id] ?? ''}
        onChange={(event) => onUpdateColumnValue(item.id, column.id, event.target.value)}
        aria-label={column.name}
        style={selectStyle}
      >
        <option value="">Select status</option>
        {column.statusOptions.map((statusOption) => (
          <option key={statusOption.id} value={statusOption.id}>
            {statusOption.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      className="cell-input"
      value={item.columns[column.id] ?? ''}
      onChange={(event) => onUpdateColumnValue(item.id, column.id, event.target.value)}
      onKeyDown={onEnterKey}
      placeholder={column.name}
    />
  );
};

function NestedItemsTable({
  parentItem,
  selectedItemIds,
  onToggleSelectItem,
  onToggleExpand,
  onRenameItem,
  onAddSubItem,
  onDeleteItem,
  onUpdateColumnValue,
  onAddChildColumn,
  onRenameChildColumn,
  onEditChildStatusColumn,
  onDeleteChildColumn,
}: Omit<BoardRowsProps, 'items' | 'columns' | 'depth'> & { parentItem: BoardItem }) {
  const [openColumnMenuId, setOpenColumnMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const templateColumns = getTemplateColumns(parentItem.childColumns);

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

  return (
    <div className="subitems-shell">
      <div className="board-table nested-board-table" style={{ gridTemplateColumns: templateColumns }}>
        <div className="board-header-cell selector-header" />
        <div className="board-header-cell">Subitem</div>
        {parentItem.childColumns.map((column) => (
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
                    onRenameChildColumn(parentItem.id, column.id);
                    setOpenColumnMenuId(null);
                  }}
                >
                  Rename column
                </button>
                {column.type === 'status' ? (
                  <button
                    type="button"
                    onClick={() => {
                      onEditChildStatusColumn(parentItem.id, column.id);
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
                    onDeleteChildColumn(parentItem.id, column.id);
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
          onClick={() => onAddChildColumn(parentItem.id)}
          aria-label="Add subitem column"
        >
          +
        </button>

        <BoardRows
          items={parentItem.children}
          columns={parentItem.childColumns}
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
        <button
          type="button"
          className="board-cell add-item-row"
          onClick={() => onAddSubItem(parentItem.id)}
        >
          + Add subitem
        </button>
        {parentItem.childColumns.map((column) => (
          <div key={`nested-add-item-empty-${parentItem.id}-${column.id}`} className="board-cell empty-cell" />
        ))}
        <div className="board-cell empty-cell" />
      </div>
    </div>
  );
}

export function BoardRows({
  items,
  columns,
  depth,
  selectedItemIds,
  onToggleSelectItem,
  onToggleExpand,
  onRenameItem,
  onAddSubItem,
  onDeleteItem,
  onUpdateColumnValue,
  onAddChildColumn,
  onRenameChildColumn,
  onEditChildStatusColumn,
  onDeleteChildColumn,
}: BoardRowsProps) {
  const handleEnterKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    }
  };

  return (
    <>
      {items.map((item) => {
        const hasChildren = item.children.length > 0;
        const isExpanded = !item.collapsed;

        return (
          <Fragment key={item.id}>
            <div className="board-cell selector-cell">
              <input
                type="checkbox"
                className="row-selector"
                checked={selectedItemIds.has(item.id)}
                onChange={() => onToggleSelectItem(item.id)}
                aria-label={`Select ${item.title}`}
              />
            </div>

            <div className="board-cell item-cell">
              <div className="item-cell-content" style={{ paddingLeft: depth * 24 }}>
                {hasChildren ? (
                  <button
                    type="button"
                    className="expand-button"
                    onClick={() => onToggleExpand(item.id)}
                    aria-label={isExpanded ? 'Collapse item' : 'Expand item'}
                  >
                    {isExpanded ? '▾' : '▸'}
                  </button>
                ) : (
                  <span className="expand-spacer" />
                )}

                <span className="depth-guide" aria-hidden="true" />

                <input
                  className="cell-input item-name-input"
                  value={item.title}
                  onChange={(event) => onRenameItem(item.id, event.target.value)}
                  onKeyDown={handleEnterKey}
                  placeholder="Item title"
                />

                <button
                  type="button"
                  className="subitem-inline-button"
                  onClick={() => onAddSubItem(item.id)}
                  aria-label={`Add child item to ${item.title}`}
                >
                  +
                </button>

                <button
                  type="button"
                  className="delete-item-button"
                  onClick={() => onDeleteItem(item.id)}
                  aria-label={`Delete ${item.title}`}
                  title="Delete item"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M9 4h6m-9 3h12m-1 0-1 11H8L7 7m3 0V5h4v2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {columns.map((column) => (
              <div key={`${item.id}-${column.id}`} className="board-cell">
                {renderColumnInput(item, column, onUpdateColumnValue, handleEnterKey)}
              </div>
            ))}

            <div className="board-cell add-column-spacer" />

            {hasChildren && isExpanded ? (
              <div className="subitems-row">
                <NestedItemsTable
                  parentItem={item}
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
              </div>
            ) : null}
          </Fragment>
        );
      })}
    </>
  );
}
