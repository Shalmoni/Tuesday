import { useEffect, useState } from 'react';
import { AddColumnModal } from './components/AddColumnModal';
import { EditStatusColumnModal } from './components/EditStatusColumnModal';
import { GitHubTokenModal } from './components/GitHubTokenModal';
import { BoardTable } from './components/BoardTable';
import { BoardToolbar } from './components/BoardToolbar';
import { initialBoardData } from './mockData';
import type {
  BoardData,
  BoardGroup,
  BoardItem,
  ColumnDefinition,
  ColumnType,
  GitHubConfig,
  StatusOption,
} from './types';
import { loadBoardFromGitHub, saveBoardToGitHub } from './utils/github';
import { loadBoardData, loadGitHubConfig, saveBoardData, saveGitHubConfig } from './utils/storage';
import {
  addChildToItem,
  addColumnToItems,
  clearRemovedStatusValues,
  createEmptyGroup,
  createEmptyItem,
  findItemById,
  removeColumnFromItems,
  removeItemsByIds,
  removeItemById,
  updateItemById,
} from './utils/tree';
import { createDefaultStatusOptions } from './utils/statusOptions';

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

const updateGroupById = (
  groups: BoardGroup[],
  groupId: string,
  updater: (group: BoardGroup) => BoardGroup,
): BoardGroup[] =>
  groups.map((group) => (group.id === groupId ? updater(group) : group));

type ColumnTarget = { scope: 'board' } | { scope: 'item'; itemId: string };

type StatusEditorTarget =
  | { scope: 'board'; columnId: string }
  | { scope: 'item'; itemId: string; columnId: string };

type GitHubStatusTone = 'neutral' | 'pending' | 'success' | 'error';

const findItemAcrossGroups = (groups: BoardGroup[], itemId: string): BoardItem | null => {
  for (const group of groups) {
    const match = findItemById(group.items, itemId);
    if (match) {
      return match;
    }
  }

  return null;
};

const getTargetColumns = (board: BoardData, target: ColumnTarget): ColumnDefinition[] =>
  target.scope === 'board'
    ? board.columns
    : findItemAcrossGroups(board.groups, target.itemId)?.childColumns ?? [];

export default function App() {
  const [board, setBoard] = useState<BoardData>(() => loadBoardData() ?? initialBoardData);
  const [githubConfig, setGitHubConfig] = useState<GitHubConfig>(() => loadGitHubConfig());
  const [githubStatusMessage, setGitHubStatusMessage] = useState('');
  const [githubStatusTone, setGitHubStatusTone] = useState<GitHubStatusTone>('neutral');
  const [isSyncingGitHub, setIsSyncingGitHub] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [pendingGitHubAction, setPendingGitHubAction] = useState<'save' | 'load' | null>(null);
  const [addColumnTarget, setAddColumnTarget] = useState<ColumnTarget | null>(null);
  const [editingStatusTarget, setEditingStatusTarget] = useState<StatusEditorTarget | null>(null);

  useEffect(() => {
    saveBoardData(board);
  }, [board]);

  useEffect(() => {
    saveGitHubConfig(githubConfig);
  }, [githubConfig]);

  useEffect(() => {
    const existingIds = board.groups.reduce((ids, group) => {
      for (const itemId of collectItemIds(group.items)) {
        ids.add(itemId);
      }
      return ids;
    }, new Set<string>());

    setSelectedItemIds((currentSelectedIds) => {
      const nextSelectedIds = new Set(
        [...currentSelectedIds].filter((itemId) => existingIds.has(itemId)),
      );

      if (nextSelectedIds.size === currentSelectedIds.size) {
        return currentSelectedIds;
      }

      return nextSelectedIds;
    });
  }, [board.groups]);

  const { columns, groups } = board;

  const handleAddGroup = () => {
    setBoard((currentBoard) => ({
      ...currentBoard,
      groups: [...currentBoard.groups, createEmptyGroup(`Group ${currentBoard.groups.length + 1}`)],
    }));
  };

  const handleRenameGroup = (groupId: string, name: string) => {
    setBoard((currentBoard) => ({
      ...currentBoard,
      groups: updateGroupById(currentBoard.groups, groupId, (group) => ({
        ...group,
        name,
      })),
    }));
  };

  const handleAddTopLevelItem = (groupId: string) => {
    setBoard((currentBoard) => ({
      ...currentBoard,
      groups: updateGroupById(currentBoard.groups, groupId, (group) => ({
        ...group,
        items: [...group.items, createEmptyItem(currentBoard.columns, 'New item')],
      })),
    }));
  };

  const handleAddSubItem = (groupId: string, parentId: string) => {
    setBoard((currentBoard) => ({
      ...currentBoard,
      groups: updateGroupById(currentBoard.groups, groupId, (group) => ({
        ...group,
        items: (() => {
          const parentItem = findItemById(group.items, parentId);
          if (!parentItem) {
            return group.items;
          }

          const child = createEmptyItem(parentItem.childColumns, 'New sub-item');
          return addChildToItem(group.items, parentId, child);
        })(),
      })),
    }));
  };

  const handleRenameItem = (groupId: string, itemId: string, nextTitle: string) => {
    setBoard((currentBoard) => ({
      ...currentBoard,
      groups: updateGroupById(currentBoard.groups, groupId, (group) => ({
        ...group,
        items: updateItemById(group.items, itemId, (item) => ({
          ...item,
          title: nextTitle,
        })),
      })),
    }));
  };

  const handleUpdateColumnValue = (
    groupId: string,
    itemId: string,
    columnId: string,
    value: string,
  ) => {
    setBoard((currentBoard) => ({
      ...currentBoard,
      groups: updateGroupById(currentBoard.groups, groupId, (group) => ({
        ...group,
        items: updateItemById(group.items, itemId, (item) => ({
          ...item,
          columns: {
            ...item.columns,
            [columnId]: value,
          },
        })),
      })),
    }));
  };

  const handleToggleExpand = (groupId: string, itemId: string) => {
    setBoard((currentBoard) => ({
      ...currentBoard,
      groups: updateGroupById(currentBoard.groups, groupId, (group) => ({
        ...group,
        items: updateItemById(group.items, itemId, (item) => ({
          ...item,
          collapsed: !item.collapsed,
        })),
      })),
    }));
  };

  const handleAddColumn = () => {
    setAddColumnTarget({ scope: 'board' });
  };

  const handleAddChildColumn = (itemId: string) => {
    setAddColumnTarget({ scope: 'item', itemId });
  };

  const handleCreateColumn = ({
    name,
    type,
  }: {
    name: string;
    type: ColumnType;
  }) => {
    const target = addColumnTarget;
    if (!target) {
      return;
    }

    const targetColumns = getTargetColumns(board, target);
    const nextColumnIdBase = createColumnId(name);
    const nextColumnId = targetColumns.some((column) => column.id === nextColumnIdBase)
      ? `${nextColumnIdBase}-${crypto.randomUUID().slice(0, 4)}`
      : nextColumnIdBase;

    const nextColumn: ColumnDefinition = {
      id: nextColumnId,
      name,
      type,
      statusOptions: type === 'status' ? createDefaultStatusOptions() : [],
    };

    setBoard((currentBoard) => ({
      ...(target.scope === 'board'
        ? {
            ...currentBoard,
            columns: [...currentBoard.columns, nextColumn],
            groups: currentBoard.groups.map((group) => ({
              ...group,
              items: addColumnToItems(group.items, nextColumn.id),
            })),
          }
        : {
            ...currentBoard,
            groups: currentBoard.groups.map((group) => ({
              ...group,
              items: updateItemById(group.items, target.itemId, (item) => ({
                ...item,
                childColumns: [...item.childColumns, nextColumn],
                children: addColumnToItems(item.children, nextColumn.id),
              })),
            })),
          }),
    }));

    setAddColumnTarget(null);
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

  const handleRenameChildColumn = (itemId: string, columnId: string) => {
    const parentItem = findItemAcrossGroups(board.groups, itemId);
    const column = parentItem?.childColumns.find((entry) => entry.id === columnId);
    if (!column) {
      return;
    }

    const nextName = window.prompt('Rename column', column.name)?.trim();
    if (!nextName) {
      return;
    }

    setBoard((currentBoard) => ({
      ...currentBoard,
      groups: currentBoard.groups.map((group) => ({
        ...group,
        items: updateItemById(group.items, itemId, (item) => ({
          ...item,
          childColumns: item.childColumns.map((entry) =>
            entry.id === columnId ? { ...entry, name: nextName } : entry,
          ),
        })),
      })),
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
      groups: currentBoard.groups.map((group) => ({
        ...group,
        items: removeColumnFromItems(group.items, columnId),
      })),
    }));
  };

  const handleDeleteChildColumn = (itemId: string, columnId: string) => {
    const parentItem = findItemAcrossGroups(board.groups, itemId);
    const column = parentItem?.childColumns.find((entry) => entry.id === columnId);
    if (!column) {
      return;
    }

    const confirmed = window.confirm(`Delete column "${column.name}"?`);
    if (!confirmed) {
      return;
    }

    setBoard((currentBoard) => ({
      ...currentBoard,
      groups: currentBoard.groups.map((group) => ({
        ...group,
        items: updateItemById(group.items, itemId, (item) => ({
          ...item,
          childColumns: item.childColumns.filter((entry) => entry.id !== columnId),
          children: removeColumnFromItems(item.children, columnId),
        })),
      })),
    }));
  };

  const handleOpenStatusEditor = (columnId: string) => {
    setEditingStatusTarget({ scope: 'board', columnId });
  };

  const handleOpenChildStatusEditor = (itemId: string, columnId: string) => {
    setEditingStatusTarget({ scope: 'item', itemId, columnId });
  };

  const handleSaveStatusOptions = (target: StatusEditorTarget, statusOptions: StatusOption[]) => {
    const validStatusIds = new Set(statusOptions.map((statusOption) => statusOption.id));

    setBoard((currentBoard) => ({
      ...(target.scope === 'board'
        ? {
            ...currentBoard,
            columns: currentBoard.columns.map((column) =>
              column.id === target.columnId ? { ...column, statusOptions } : column,
            ),
            groups: currentBoard.groups.map((group) => ({
              ...group,
              items: clearRemovedStatusValues(group.items, target.columnId, validStatusIds),
            })),
          }
        : {
            ...currentBoard,
            groups: currentBoard.groups.map((group) => ({
              ...group,
              items: updateItemById(group.items, target.itemId, (item) => ({
                ...item,
                childColumns: item.childColumns.map((column) =>
                  column.id === target.columnId ? { ...column, statusOptions } : column,
                ),
                children: clearRemovedStatusValues(item.children, target.columnId, validStatusIds),
              })),
            })),
          }),
    }));
    setEditingStatusTarget(null);
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
      groups: currentBoard.groups.map((group) => ({
        ...group,
        items: removeItemsByIds(group.items, selectedItemIds),
      })),
    }));
    setSelectedItemIds(new Set());
  };

  const handleDeleteItem = (groupId: string, itemId: string) => {
    const confirmed = window.confirm('Delete this item and all its child items?');
    if (!confirmed) {
      return;
    }

    setBoard((currentBoard) => ({
      ...currentBoard,
      groups: updateGroupById(currentBoard.groups, groupId, (group) => ({
        ...group,
        items: removeItemById(group.items, itemId),
      })),
    }));
  };

  const updateGitHubToken = (trimmedToken: string) => {
    setGitHubConfig((currentConfig) => ({
      ...currentConfig,
      token: trimmedToken,
    }));

    setGitHubStatusMessage(
      trimmedToken
        ? `GitHub token saved locally for ${githubConfig.owner}/${githubConfig.repo}.`
        : 'GitHub token cleared from this browser.',
    );
    setGitHubStatusTone('neutral');
  };

  const handleSetGitHubToken = () => {
    setPendingGitHubAction(null);
    setTokenModalOpen(true);
  };

  const ensureGitHubToken = () => {
    if (githubConfig.token) {
      return githubConfig.token;
    }

    return null;
  };

  const runSaveToGitHub = async (token: string) => {
    try {
      setIsSyncingGitHub(true);
      setGitHubStatusTone('pending');
      setGitHubStatusMessage('Saving board to GitHub...');
      await saveBoardToGitHub(board, {
        ...githubConfig,
        token,
      });
      const savedAt = new Date().toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      });
      setGitHubStatusTone('success');
      setGitHubStatusMessage(
        `Saved to ${githubConfig.owner}/${githubConfig.repo}/${githubConfig.path} at ${savedAt}. The repo file is updated, but GitHub Pages or the GitHub website can take a bit to catch up.`,
      );
    } catch (error) {
      setGitHubStatusTone('error');
      setGitHubStatusMessage(
        error instanceof Error ? error.message : 'GitHub save failed for an unknown reason.',
      );
    } finally {
      setIsSyncingGitHub(false);
    }
  };

  const runLoadFromGitHub = async (token: string) => {
    try {
      setIsSyncingGitHub(true);
      setGitHubStatusTone('pending');
      setGitHubStatusMessage('Loading board from GitHub...');
      const remoteBoard = await loadBoardFromGitHub({
        ...githubConfig,
        token,
      });
      setBoard(remoteBoard);
      setSelectedItemIds(new Set());
      setGitHubStatusTone('success');
      setGitHubStatusMessage(
        `Loaded from GitHub: ${githubConfig.owner}/${githubConfig.repo}/${githubConfig.path}`,
      );
    } catch (error) {
      setGitHubStatusTone('error');
      setGitHubStatusMessage(
        error instanceof Error ? error.message : 'GitHub load failed for an unknown reason.',
      );
    } finally {
      setIsSyncingGitHub(false);
    }
  };

  const handleSaveToGitHub = async () => {
    const token = ensureGitHubToken();
    if (!token) {
      setPendingGitHubAction('save');
      setTokenModalOpen(true);
      setGitHubStatusTone('neutral');
      setGitHubStatusMessage('GitHub token is required before saving.');
      return;
    }

    await runSaveToGitHub(token);
  };

  const handleLoadFromGitHub = async () => {
    const token = ensureGitHubToken();
    if (!token) {
      setPendingGitHubAction('load');
      setTokenModalOpen(true);
      setGitHubStatusTone('neutral');
      setGitHubStatusMessage('GitHub token is required before loading.');
      return;
    }

    await runLoadFromGitHub(token);
  };

  const handleTokenModalSubmit = async (token: string) => {
    updateGitHubToken(token);
    setTokenModalOpen(false);

    if (!token) {
      setPendingGitHubAction(null);
      return;
    }

    if (pendingGitHubAction === 'save') {
      setPendingGitHubAction(null);
      await runSaveToGitHub(token);
      return;
    }

    if (pendingGitHubAction === 'load') {
      setPendingGitHubAction(null);
      await runLoadFromGitHub(token);
      return;
    }

    setPendingGitHubAction(null);
  };

  const editingStatusColumn =
    editingStatusTarget?.scope === 'board'
      ? columns.find((column) => column.id === editingStatusTarget.columnId) ?? null
      : editingStatusTarget?.scope === 'item'
        ? findItemAcrossGroups(groups, editingStatusTarget.itemId)?.childColumns.find(
            (column) => column.id === editingStatusTarget.columnId,
          ) ?? null
        : null;

  return (
    <main className="app-shell">
      <BoardToolbar
        onSaveToGitHub={handleSaveToGitHub}
        onLoadFromGitHub={handleLoadFromGitHub}
        onSetGitHubToken={handleSetGitHubToken}
        githubStatusMessage={githubStatusMessage}
        githubStatusTone={githubStatusTone}
        githubBusy={isSyncingGitHub}
        hasGitHubToken={Boolean(githubConfig.token)}
      />
      <GitHubTokenModal
        isOpen={tokenModalOpen}
        initialValue={githubConfig.token}
        onClose={() => {
          setTokenModalOpen(false);
          setPendingGitHubAction(null);
        }}
        onSubmit={handleTokenModalSubmit}
      />
      <AddColumnModal
        isOpen={addColumnTarget !== null}
        onClose={() => setAddColumnTarget(null)}
        onSubmit={handleCreateColumn}
      />
      <EditStatusColumnModal
        isOpen={editingStatusColumn !== null}
        columnName={editingStatusColumn?.name ?? 'Status'}
        initialStatuses={editingStatusColumn?.statusOptions ?? []}
        onClose={() => setEditingStatusTarget(null)}
        onSubmit={(statusOptions) => {
          if (!editingStatusTarget) {
            return;
          }

          handleSaveStatusOptions(editingStatusTarget, statusOptions);
        }}
      />

      {groups.map((group) => (
        <BoardTable
          key={group.id}
          groupName={group.name}
          items={group.items}
          columns={columns}
          selectedItemIds={selectedItemIds}
          onGroupNameChange={(nextName) => handleRenameGroup(group.id, nextName)}
          onAddColumn={handleAddColumn}
          onAddTopLevelItem={() => handleAddTopLevelItem(group.id)}
          onRenameColumn={handleRenameColumn}
          onEditStatusColumn={handleOpenStatusEditor}
          onDeleteColumn={handleDeleteColumn}
          onAddChildColumn={handleAddChildColumn}
          onRenameChildColumn={handleRenameChildColumn}
          onEditChildStatusColumn={handleOpenChildStatusEditor}
          onDeleteChildColumn={handleDeleteChildColumn}
          onToggleSelectItem={handleToggleSelectItem}
          onDeleteSelectedItems={handleDeleteSelectedItems}
          onToggleExpand={(itemId) => handleToggleExpand(group.id, itemId)}
          onRenameItem={(itemId, name) => handleRenameItem(group.id, itemId, name)}
          onAddSubItem={(parentId) => handleAddSubItem(group.id, parentId)}
          onDeleteItem={(itemId) => handleDeleteItem(group.id, itemId)}
          onUpdateColumnValue={(itemId, columnId, value) =>
            handleUpdateColumnValue(group.id, itemId, columnId, value)
          }
        />
      ))}

      <button type="button" className="add-group-button" onClick={handleAddGroup}>
        <span className="add-group-plus">+</span>
        <span>Add new group</span>
      </button>
    </main>
  );
}
