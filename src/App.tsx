import { useEffect, useState } from 'react';
import { BoardTable } from './components/BoardTable';
import { BoardToolbar } from './components/BoardToolbar';
import { initialBoardData } from './mockData';
import type { BoardData, BoardItem, ColumnDefinition, GitHubConfig } from './types';
import { loadBoardFromGitHub, saveBoardToGitHub } from './utils/github';
import { loadBoardData, loadGitHubConfig, saveBoardData, saveGitHubConfig } from './utils/storage';
import {
  addChildToItem,
  addColumnToItems,
  createEmptyItem,
  removeColumnFromItems,
  removeItemsByIds,
  removeItemById,
  updateItemById,
} from './utils/tree';

const createColumnId = (label: string) =>
  label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `column-${crypto.randomUUID()}`;

const collectItemIds = (items: BoardItem[]): Set<string> =>
  items.reduce((ids, item) => {
    ids.add(item.id);
    for (const childId of collectItemIds(item.children)) {
      ids.add(childId);
    }
    return ids;
  }, new Set<string>());

export default function App() {
  const [board, setBoard] = useState<BoardData>(() => loadBoardData() ?? initialBoardData);
  const [githubConfig, setGitHubConfig] = useState<GitHubConfig>(() => loadGitHubConfig());
  const [githubPanelOpen, setGitHubPanelOpen] = useState(false);
  const [githubStatusMessage, setGitHubStatusMessage] = useState(
    'Configure GitHub settings to save or load a board file from your repo.',
  );
  const [isSyncingGitHub, setIsSyncingGitHub] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    saveBoardData(board);
  }, [board]);

  useEffect(() => {
    saveGitHubConfig(githubConfig);
  }, [githubConfig]);

  useEffect(() => {
    const existingIds = collectItemIds(board.items);

    setSelectedItemIds((currentSelectedIds) => {
      const nextSelectedIds = new Set(
        [...currentSelectedIds].filter((itemId) => existingIds.has(itemId)),
      );

      if (nextSelectedIds.size === currentSelectedIds.size) {
        return currentSelectedIds;
      }

      return nextSelectedIds;
    });
  }, [board.items]);

  const { title, columns, items } = board;

  const handleAddTopLevelItem = () => {
    setBoard((currentBoard) => ({
      ...currentBoard,
      items: [...currentBoard.items, createEmptyItem(currentBoard.columns, 'New item')],
    }));
  };

  const handleAddSubItem = (parentId: string) => {
    const child = createEmptyItem(columns, 'New sub-item');

    setBoard((currentBoard) => ({
      ...currentBoard,
      items: addChildToItem(currentBoard.items, parentId, child),
    }));
  };

  const handleRenameItem = (itemId: string, nextTitle: string) => {
    setBoard((currentBoard) => ({
      ...currentBoard,
      items: updateItemById(currentBoard.items, itemId, (item) => ({
        ...item,
        title: nextTitle,
      })),
    }));
  };

  const handleUpdateColumnValue = (itemId: string, columnId: string, value: string) => {
    setBoard((currentBoard) => ({
      ...currentBoard,
      items: updateItemById(currentBoard.items, itemId, (item) => ({
        ...item,
        columns: {
          ...item.columns,
          [columnId]: value,
        },
      })),
    }));
  };

  const handleToggleExpand = (itemId: string) => {
    setBoard((currentBoard) => ({
      ...currentBoard,
      items: updateItemById(currentBoard.items, itemId, (item) => ({
        ...item,
        collapsed: !item.collapsed,
      })),
    }));
  };

  const handleAddColumn = () => {
    const nextColumnName = window.prompt('New text column name');
    const trimmedName = nextColumnName?.trim() ?? '';
    if (!trimmedName) {
      return;
    }

    const nextColumnIdBase = createColumnId(trimmedName);
    const nextColumnId = columns.some((column) => column.id === nextColumnIdBase)
      ? `${nextColumnIdBase}-${crypto.randomUUID().slice(0, 4)}`
      : nextColumnIdBase;

    const nextColumn: ColumnDefinition = {
      id: nextColumnId,
      name: trimmedName,
    };

    setBoard((currentBoard) => ({
      ...currentBoard,
      columns: [...currentBoard.columns, nextColumn],
      items: addColumnToItems(currentBoard.items, nextColumn.id),
    }));
  };

  const handleRenameColumn = (columnId: string) => {
    const column = board.columns.find((entry) => entry.id === columnId);
    if (!column) {
      return;
    }

    const nextName = window.prompt('Rename column', column.name)?.trim();
    if (!nextName) {
      return;
    }

    setBoard((currentBoard) => ({
      ...currentBoard,
      columns: currentBoard.columns.map((entry) =>
        entry.id === columnId ? { ...entry, name: nextName } : entry,
      ),
    }));
  };

  const handleDeleteColumn = (columnId: string) => {
    const column = board.columns.find((entry) => entry.id === columnId);
    if (!column) {
      return;
    }

    const confirmed = window.confirm(`Delete column "${column.name}"?`);
    if (!confirmed) {
      return;
    }

    setBoard((currentBoard) => ({
      ...currentBoard,
      columns: currentBoard.columns.filter((entry) => entry.id !== columnId),
      items: removeColumnFromItems(currentBoard.items, columnId),
    }));
  };

  const handleToggleSelectItem = (itemId: string) => {
    setSelectedItemIds((currentSelectedIds) => {
      const nextSelectedIds = new Set(currentSelectedIds);

      if (nextSelectedIds.has(itemId)) {
        nextSelectedIds.delete(itemId);
      } else {
        nextSelectedIds.add(itemId);
      }

      return nextSelectedIds;
    });
  };

  const handleDeleteSelectedItems = () => {
    if (selectedItemIds.size === 0) {
      return;
    }

    const confirmed = window.confirm(`Delete ${selectedItemIds.size} selected item(s)?`);
    if (!confirmed) {
      return;
    }

    setBoard((currentBoard) => ({
      ...currentBoard,
      items: removeItemsByIds(currentBoard.items, selectedItemIds),
    }));
    setSelectedItemIds(new Set());
  };

  const handleDeleteItem = (itemId: string) => {
    const confirmed = window.confirm('Delete this item and all its child items?');
    if (!confirmed) {
      return;
    }

    setBoard((currentBoard) => ({
      ...currentBoard,
      items: removeItemById(currentBoard.items, itemId),
    }));
  };

  const handleGitHubConfigChange = (
    field: 'owner' | 'repo' | 'branch' | 'path' | 'token',
    value: string,
  ) => {
    setGitHubConfig((currentConfig) => ({
      ...currentConfig,
      [field]: value,
    }));
  };

  const handleSaveToGitHub = async () => {
    try {
      setIsSyncingGitHub(true);
      setGitHubStatusMessage('Saving board to GitHub...');
      await saveBoardToGitHub(board, githubConfig);
      setGitHubStatusMessage(
        `Saved to GitHub: ${githubConfig.owner}/${githubConfig.repo}/${githubConfig.path}`,
      );
    } catch (error) {
      setGitHubStatusMessage(
        error instanceof Error ? error.message : 'GitHub save failed for an unknown reason.',
      );
    } finally {
      setIsSyncingGitHub(false);
    }
  };

  const handleLoadFromGitHub = async () => {
    try {
      setIsSyncingGitHub(true);
      setGitHubStatusMessage('Loading board from GitHub...');
      const remoteBoard = await loadBoardFromGitHub(githubConfig);
      setBoard(remoteBoard);
      setSelectedItemIds(new Set());
      setGitHubStatusMessage(
        `Loaded from GitHub: ${githubConfig.owner}/${githubConfig.repo}/${githubConfig.path}`,
      );
    } catch (error) {
      setGitHubStatusMessage(
        error instanceof Error ? error.message : 'GitHub load failed for an unknown reason.',
      );
    } finally {
      setIsSyncingGitHub(false);
    }
  };

  return (
    <main className="app-shell">
      <BoardToolbar
        onSaveToGitHub={handleSaveToGitHub}
        onLoadFromGitHub={handleLoadFromGitHub}
        githubPanelOpen={githubPanelOpen}
        onToggleGitHubPanel={() => setGitHubPanelOpen((currentValue) => !currentValue)}
        githubConfig={githubConfig}
        onGitHubConfigChange={handleGitHubConfigChange}
        githubStatusMessage={githubStatusMessage}
        githubBusy={isSyncingGitHub}
      />

      <BoardTable
        groupName={title}
        items={items}
        columns={columns}
        selectedItemIds={selectedItemIds}
        onGroupNameChange={(nextTitle) =>
          setBoard((currentBoard) => ({
            ...currentBoard,
            title: nextTitle,
          }))
        }
        onAddColumn={handleAddColumn}
        onAddTopLevelItem={handleAddTopLevelItem}
        onRenameColumn={handleRenameColumn}
        onDeleteColumn={handleDeleteColumn}
        onToggleSelectItem={handleToggleSelectItem}
        onDeleteSelectedItems={handleDeleteSelectedItems}
        onToggleExpand={handleToggleExpand}
        onRenameItem={handleRenameItem}
        onAddSubItem={handleAddSubItem}
        onDeleteItem={handleDeleteItem}
        onUpdateColumnValue={handleUpdateColumnValue}
      />
    </main>
  );
}
