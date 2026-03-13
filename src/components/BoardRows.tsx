import { Fragment, KeyboardEvent } from 'react';
import type { BoardItem, ColumnDefinition } from '../types';

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
                >
                  Delete
                </button>
              </div>
            </div>

            {columns.map((column) => (
              <div key={`${item.id}-${column.id}`} className="board-cell">
                <input
                  className="cell-input"
                  value={item.columns[column.id] ?? ''}
                  onChange={(event) =>
                    onUpdateColumnValue(item.id, column.id, event.target.value)
                  }
                  onKeyDown={handleEnterKey}
                  placeholder={column.name}
                />
              </div>
            ))}

            <div className="board-cell add-column-spacer" />

            {hasChildren && isExpanded ? (
              <BoardRows
                items={item.children}
                columns={columns}
                depth={depth + 1}
                selectedItemIds={selectedItemIds}
                onToggleSelectItem={onToggleSelectItem}
                onToggleExpand={onToggleExpand}
                onRenameItem={onRenameItem}
                onAddSubItem={onAddSubItem}
                onDeleteItem={onDeleteItem}
                onUpdateColumnValue={onUpdateColumnValue}
              />
            ) : null}
          </Fragment>
        );
      })}
    </>
  );
}
