import { CSSProperties, Fragment, KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { BoardItem, ColumnDefinition, ListColumnEntry } from '../types';
import { getColumnWidth } from '../utils/columns';
import { getContrastTextColor } from '../utils/statusOptions';
import {
  createEmptyListEntry,
  parseListColumnValue,
  serializeListColumnValue,
} from '../utils/listColumn';

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
  onResizeColumn: (columnId: string, width: number) => void;
  onRenameChildColumn: (itemId: string, columnId: string) => void;
  onEditChildStatusColumn: (itemId: string, columnId: string) => void;
  onDeleteChildColumn: (itemId: string, columnId: string) => void;
}

const getTemplateColumns = (columns: ColumnDefinition[]) =>
  `56px minmax(320px, 1.8fr) ${columns.map((column) => `${getColumnWidth(column)}px`).join(' ')} 56px`;

const collectLeafStatusCounts = (
  items: BoardItem[],
  columnId: string,
  statusOptionIds: Set<string>,
): Record<string, number> =>
  items.reduce<Record<string, number>>((counts, item) => {
    if (item.children.length === 0) {
      const value = item.columns[columnId];
      if (value && statusOptionIds.has(value)) {
        counts[value] = (counts[value] ?? 0) + 1;
      }
      return counts;
    }

    const nestedCounts = collectLeafStatusCounts(item.children, columnId, statusOptionIds);
    for (const [statusId, count] of Object.entries(nestedCounts)) {
      counts[statusId] = (counts[statusId] ?? 0) + count;
    }
    return counts;
  }, {});

const renderColumnInput = (
  item: BoardItem,
  column: ColumnDefinition,
  onUpdateColumnValue: (itemId: string, columnId: string, value: string) => void,
  onEnterKey: (event: KeyboardEvent<HTMLInputElement>) => void,
) => {
  if (column.type === 'status') {
    if (item.children.length > 0) {
      const statusOptionIds = new Set(column.statusOptions.map((statusOption) => statusOption.id));
      const counts = collectLeafStatusCounts(item.children, column.id, statusOptionIds);
      const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

      if (total === 0) {
        return <div className="status-rollup-empty" />;
      }

      return (
        <div
          className="status-rollup-bar"
          title={column.statusOptions
            .filter((statusOption) => counts[statusOption.id] > 0)
            .map(
              (statusOption) =>
                `${statusOption.label}: ${Math.round((counts[statusOption.id] / total) * 100)}%`,
            )
            .join(' | ')}
        >
          {column.statusOptions
            .filter((statusOption) => counts[statusOption.id] > 0)
            .map((statusOption) => {
              const percentage = Math.round((counts[statusOption.id] / total) * 100);
              return (
                <div
                  key={statusOption.id}
                  className="status-rollup-segment"
                  style={{
                    width: `${(counts[statusOption.id] / total) * 100}%`,
                    backgroundColor: statusOption.color,
                    color: getContrastTextColor(statusOption.color),
                  }}
                >
                  {percentage >= 10 ? `${percentage}%` : ''}
                </div>
              );
            })}
        </div>
      );
    }

    const selectedStatus =
      column.statusOptions.find((statusOption) => statusOption.id === (item.columns[column.id] ?? '')) ??
      column.statusOptions[0] ??
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
        value={item.columns[column.id] ?? selectedStatus?.id ?? ''}
        onChange={(event) => onUpdateColumnValue(item.id, column.id, event.target.value)}
        aria-label={column.name}
        style={selectStyle}
      >
        {column.statusOptions.map((statusOption) => (
          <option key={statusOption.id} value={statusOption.id}>
            {statusOption.label}
          </option>
        ))}
      </select>
    );
  }

  if (column.type === 'list') {
    const parsedEntries = parseListColumnValue(item.columns[column.id] ?? '');
    const entries = parsedEntries.length > 0 ? parsedEntries : [createEmptyListEntry()];
    const updateEntries = (nextEntries: ListColumnEntry[]) => {
      onUpdateColumnValue(item.id, column.id, serializeListColumnValue(nextEntries));
    };

    return (
      <div className="list-column-editor">
        <div className="list-column-scroll">
          {entries.map((entry) => (
            <div key={entry.id} className="list-column-row">
              <input
                className="cell-input list-column-input"
                value={entry.left}
                onChange={(event) =>
                  updateEntries(
                    entries.map((currentEntry) =>
                      currentEntry.id === entry.id
                        ? { ...currentEntry, left: event.target.value }
                        : currentEntry,
                    ),
                  )
                }
                onKeyDown={onEnterKey}
              />
              <input
                className="cell-input list-column-input"
                value={entry.right}
                onChange={(event) =>
                  updateEntries(
                    entries.map((currentEntry) =>
                      currentEntry.id === entry.id
                        ? { ...currentEntry, right: event.target.value }
                        : currentEntry,
                    ),
                  )
                }
                onKeyDown={onEnterKey}
              />
            </div>
          ))}
          <button
            type="button"
            className="list-column-add-row"
            onClick={() => updateEntries([...entries, createEmptyListEntry()])}
            aria-label={`Add row to ${column.name}`}
          >
            +
          </button>
        </div>
      </div>
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
  onResizeColumn,
  onRenameChildColumn,
  onEditChildStatusColumn,
  onDeleteChildColumn,
}: Omit<BoardRowsProps, 'items' | 'columns' | 'depth'> & { parentItem: BoardItem }) {
  const [openColumnMenuId, setOpenColumnMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const suppressCloseRef = useRef(false);
  const templateColumns = getTemplateColumns(parentItem.childColumns);

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

  return (
    <div className="subitems-shell">
      <div className="board-table nested-board-table" style={{ gridTemplateColumns: templateColumns }}>
        <div className="board-header-cell selector-header" />
        <div className="board-header-cell item-header-cell">Subitem</div>
        {parentItem.childColumns.map((column) => (
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
                    onRenameChildColumn(parentItem.id, column.id);
                  }}
                >
                  Rename column
                </button>
                {column.type === 'status' ? (
                  <button
                    type="button"
                    onMouseDown={() => {
                      setOpenColumnMenuId(null);
                      onEditChildStatusColumn(parentItem.id, column.id);
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
                    onDeleteChildColumn(parentItem.id, column.id);
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
          onResizeColumn={onResizeColumn}
          onRenameChildColumn={onRenameChildColumn}
          onEditChildStatusColumn={onEditChildStatusColumn}
          onDeleteChildColumn={onDeleteChildColumn}
        />

        <button
          type="button"
          className="board-cell add-item-row add-item-row-full"
          onClick={() => onAddSubItem(parentItem.id)}
        >
          + Add subitem
        </button>
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
  onResizeColumn,
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
                  onResizeColumn={onResizeColumn}
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
