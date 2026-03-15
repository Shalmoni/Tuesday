import { useEffect, useState } from 'react';
import { AddColumnModal } from './components/AddColumnModal';
import { EditStatusColumnModal } from './components/EditStatusColumnModal';
import { GitHubTokenModal } from './components/GitHubTokenModal';
import { RenameColumnModal } from './components/RenameColumnModal';
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
import { getPagesWorkflowRunForCommit, loadBoardFromGitHub, saveBoardToGitHub } from './utils/github';
import { getDefaultColumnWidth } from './utils/columns';
import { loadBoardData, loadGitHubConfig, saveBoardData, saveGitHubConfig } from './utils/storage';
import {
  addChildToItem,
  addSharedColumnToItems,
  clearRemovedStatusValues,
  collapseItemDescendants,
  createEmptyGroup,
  createEmptyItem,
  findItemById,
  removeColumnFromItems,
  removeItemsByIds,
  removeItemById,
  updateColumnDefinitionInItems,
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

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

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

const collectChildColumns = (items: BoardItem[]): ColumnDefinition[] =>
  items.reduce<ColumnDefinition[]>((allColumns, item) => {
    const mergedColumns = [...allColumns];

    for (const childColumn of item.childColumns) {
      if (!mergedColumns.some((column) => column.id === childColumn.id)) {
        mergedColumns.push(childColumn);
      }
    }

    for (const nestedColumn of collectChildColumns(item.children)) {
      if (!mergedColumns.some((column) => column.id === nestedColumn.id)) {
        mergedColumns.push(nestedColumn);
      }
    }

    return mergedColumns;
  }, []);

const getGroupColumns = (group: BoardGroup, boardColumns: ColumnDefinition[]) => [
  ...boardColumns,
  ...collectChildColumns(group.items).filter(
    (childColumn) => !boardColumns.some((boardColumn) => boardColumn.id === childColumn.id),
  ),
];

const findGroupIdByItemId = (groups: BoardGroup[], itemId: string): string | null => {
  for (const group of groups) {
    if (findItemById(group.items, itemId)) {
      return group.id;
    }
  }

  return null;
};

export default function App() {
  const [board, setBoard] = useState<BoardData>(() => loadBoardData() ?? initialBoardData);
  const [githubConfig, setGitHubConfig] = useState<GitHubConfig>(() => loadGitHubConfig());
  const [githubStatusMessage, setGitHubStatusMessage] = useState('');
  const [githubStatusLabel, setGitHubStatusLabel] = useState('Info');
  const [githubStatusTone, setGitHubStatusTone] = useState<GitHubStatusTone>('neutral');
  const [isSyncingGitHub, setIsSyncingGitHub] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [pendingGitHubAction, setPendingGitHubAction] = useState<'save' | 'load' | null>(null);
  const [addColumnTarget, setAddColumnTarget] = useState<ColumnTarget | null>(null);
  const [editingStatusTarget, setEditingStatusTarget] = useState<StatusEditorTarget | null>(null);
  const [renamingColumn, setRenamingColumn] = useState<{ columnId: string; currentName: string; scope: 'board' } | { columnId: string; currentName: string; scope: 'item'; itemId: string } | null>(null);

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

  const handleRenameBoard = (title: string) => {
    setBoard((currentBoard) => ({
      ...currentBoard,
      title,
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

  const handleChangeGroupColor = (groupId: string, color: string) => {
    setBoard((currentBoard) => ({
      ...currentBoard,
      groups: updateGroupById(currentBoard.groups, groupId, (group) => ({
        ...group,
        color,
      })),
    }));
  };

  const handleAddTopLevelItem = (groupId: string) => {
    setBoard((currentBoard) => ({
      ...currentBoard,
      groups: updateGroupById(currentBoard.groups, groupId, (group) => ({
        ...group,
        items: [...group.items, createEmptyItem(getGroupColumns(group, currentBoard.columns), 'New item')],
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
          children: item.collapsed ? item.children : collapseItemDescendants(item.children),
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
      width: getDefaultColumnWidth(type),
    };

    setBoard((currentBoard) => ({
      ...currentBoard,
      columns: target.scope === 'board'
        ? [...currentBoard.columns, nextColumn]
        : currentBoard.columns,
      groups: currentBoard.groups.map((group) => ({
        ...group,
        items: addSharedColumnToItems(group.items, nextColumn),
      })),
    }));

    setAddColumnTarget(null);
  };

  const findColumnAnywhere = (columnId: string): ColumnDefinition | undefined => {
    const boardCol = board.columns.find((c) => c.id === columnId);
    if (boardCol) return boardCol;
    for (const group of board.groups) {
      const found = collectChildColumns(group.items).find((c) => c.id === columnId);
      if (found) return found;
    }
    return undefined;
  };

  const handleRenameColumn = (columnId: string) => {
    const column = findColumnAnywhere(columnId);
    if (!column) return;
    setRenamingColumn({ columnId, currentName: column.name, scope: 'board' });
  };

  const handleRenameChildColumn = (itemId: string, columnId: string) => {
    const parentItem = findItemAcrossGroups(board.groups, itemId);
    const column = parentItem?.childColumns.find((entry) => entry.id === columnId);
    if (!column) return;
    setRenamingColumn({ columnId, currentName: column.name, scope: 'item', itemId });
  };

  const handleCommitRename = (nextName: string) => {
    if (!renamingColumn) return;
    const { columnId, scope } = renamingColumn;

    if (scope === 'board') {
      setBoard((currentBoard) => ({
        ...currentBoard,
        columns: currentBoard.columns.map((entry) =>
          entry.id === columnId ? { ...entry, name: nextName } : entry,
        ),
        groups: currentBoard.groups.map((group) => ({
          ...group,
          items: updateColumnDefinitionInItems(group.items, columnId, (col) => ({
            ...col,
            name: nextName,
          })),
        })),
      }));
    } else {
      const { itemId } = renamingColumn;
      setBoard((currentBoard) => ({
        ...currentBoard,
        groups: currentBoard.groups.map((group) => ({
          ...group,
          items:
            findItemById(group.items, itemId) !== null
              ? updateColumnDefinitionInItems(group.items, columnId, (col) => ({
                  ...col,
                  name: nextName,
                }))
              : group.items,
        })),
      }));
    }

    setRenamingColumn(null);
  };

  const handleDeleteColumn = (columnId: string) => {
    const column = findColumnAnywhere(columnId);
    if (!column) return;

    if (!window.confirm(`Delete column "${column.name}"?`)) return;

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

    if (!window.confirm(`Delete column "${column.name}"?`)) {
      return;
    }

    setBoard((currentBoard) => ({
      ...currentBoard,
      groups: currentBoard.groups.map((group) => ({
        ...group,
        items:
          findItemById(group.items, itemId) !== null
            ? removeColumnFromItems(group.items, columnId)
            : group.items,
      })),
    }));
  };

  const handleResizeColumn = (groupId: string, columnId: string, width: number) => {
    const nextWidth = Math.max(width, 140);

    setBoard((currentBoard) => ({
      ...currentBoard,
      columns: currentBoard.columns.map((column) =>
        column.id === columnId ? { ...column, width: nextWidth } : column,
      ),
      groups: currentBoard.groups.map((group) => ({
        ...group,
        items:
          group.id === groupId
            ? updateColumnDefinitionInItems(group.items, columnId, (column) => ({
                ...column,
                width: nextWidth,
              }))
            : currentBoard.columns.some((column) => column.id === columnId)
              ? updateColumnDefinitionInItems(group.items, columnId, (column) => ({
                  ...column,
                  width: nextWidth,
                }))
              : group.items,
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
              items: updateColumnDefinitionInItems(
                clearRemovedStatusValues(
                  group.items,
                  target.columnId,
                  validStatusIds,
                  statusOptions[0]?.id ?? '',
                ),
                target.columnId,
                (column) => ({
                  ...column,
                  statusOptions,
                }),
              ),
            })),
          }
        : {
            ...currentBoard,
            groups: currentBoard.groups.map((group) => ({
              ...group,
              items:
                findItemById(group.items, target.itemId) !== null
                  ? updateColumnDefinitionInItems(
                      clearRemovedStatusValues(
                        group.items,
                        target.columnId,
                        validStatusIds,
                        statusOptions[0]?.id ?? '',
                      ),
                      target.columnId,
                      (column) => ({
                        ...column,
                        statusOptions,
                      }),
                    )
                  : group.items,
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
    setGitHubStatusLabel('Info');
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
      setGitHubStatusLabel('Saving');
      setGitHubStatusTone('pending');
      setGitHubStatusMessage('Saving board to GitHub...');
      const { commitSha } = await saveBoardToGitHub(board, {
        ...githubConfig,
        token,
      });
      const savedAt = new Date().toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      });
      setGitHubStatusMessage(
        `Saved to ${githubConfig.owner}/${githubConfig.repo}/${githubConfig.path} at ${savedAt}. Waiting for the GitHub Pages action to start...`,
      );

      try {
        for (let attempt = 0; attempt < 24; attempt += 1) {
          const workflowRun = await getPagesWorkflowRunForCommit(
            {
              ...githubConfig,
              token,
            },
            commitSha,
          );

          if (!workflowRun) {
            await wait(5000);
            continue;
          }

          if (workflowRun.status !== 'completed') {
            setGitHubStatusLabel('Deploying');
            setGitHubStatusTone('pending');
            setGitHubStatusMessage(
              'GitHub Pages action is running. The site will update when the workflow finishes.',
            );
            await wait(5000);
            continue;
          }

          if (workflowRun.conclusion === 'success') {
            setGitHubStatusLabel('Deployed');
            setGitHubStatusTone('success');
            setGitHubStatusMessage(
              'GitHub Pages finished successfully. The saved board is now deployed.',
            );
            return;
          }

          setGitHubStatusLabel('Error');
          setGitHubStatusTone('error');
          setGitHubStatusMessage(
            `The GitHub Pages action finished with "${workflowRun.conclusion ?? 'unknown'}".`,
          );
          return;
        }

        setGitHubStatusLabel('Saved');
        setGitHubStatusTone('success');
        setGitHubStatusMessage(
          'Saved to the repo, but the app could not confirm the Pages deployment yet. GitHub may still be processing the workflow.',
        );
      } catch (error) {
        setGitHubStatusLabel('Saved');
        setGitHubStatusTone('success');
        setGitHubStatusMessage(
          error instanceof Error
            ? `Saved to the repo, but the deploy status could not be checked: ${error.message}`
            : 'Saved to the repo, but the deploy status could not be checked.',
        );
      }
    } catch (error) {
      setGitHubStatusLabel('Error');
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
      setGitHubStatusLabel('Loading');
      setGitHubStatusTone('pending');
      setGitHubStatusMessage('Loading board from GitHub...');
      const remoteBoard = await loadBoardFromGitHub({
        ...githubConfig,
        token,
      });
      setBoard(remoteBoard);
      setSelectedItemIds(new Set());
      setGitHubStatusLabel('Loaded');
      setGitHubStatusTone('success');
      setGitHubStatusMessage(
        `Loaded from GitHub: ${githubConfig.owner}/${githubConfig.repo}/${githubConfig.path}`,
      );
    } catch (error) {
      setGitHubStatusLabel('Error');
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
      setGitHubStatusLabel('Info');
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
      setGitHubStatusLabel('Info');
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
      ? (columns.find((column) => column.id === editingStatusTarget.columnId) ??
          findColumnAnywhere(editingStatusTarget.columnId) ??
          null)
      : editingStatusTarget?.scope === 'item'
        ? findItemAcrossGroups(groups, editingStatusTarget.itemId)?.childColumns.find(
            (column) => column.id === editingStatusTarget.columnId,
          ) ?? null
        : null;

  return (
    <main className="app-shell">
      <BoardToolbar
        boardTitle={board.title}
        onBoardTitleChange={handleRenameBoard}
        onSaveToGitHub={handleSaveToGitHub}
        onLoadFromGitHub={handleLoadFromGitHub}
        onSetGitHubToken={handleSetGitHubToken}
        githubStatusMessage={githubStatusMessage}
        githubStatusLabel={githubStatusLabel}
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
      <RenameColumnModal
        isOpen={renamingColumn !== null}
        initialName={renamingColumn?.currentName ?? ''}
        onClose={() => setRenamingColumn(null)}
        onSubmit={handleCommitRename}
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
        (() => {
          const groupColumns = getGroupColumns(group, columns);

          return (
        <BoardTable
          key={group.id}
          groupName={group.name}
          groupColor={group.color}
          items={group.items}
          columns={groupColumns}
          selectedItemIds={selectedItemIds}
          onGroupNameChange={(nextName) => handleRenameGroup(group.id, nextName)}
          onGroupColorChange={(nextColor) => handleChangeGroupColor(group.id, nextColor)}
          onAddColumn={handleAddColumn}
          onAddTopLevelItem={() => handleAddTopLevelItem(group.id)}
          onRenameColumn={handleRenameColumn}
          onEditStatusColumn={handleOpenStatusEditor}
          onDeleteColumn={handleDeleteColumn}
          onResizeColumn={(columnId, width) => handleResizeColumn(group.id, columnId, width)}
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
          );
        })()
      ))}

      <button type="button" className="add-group-button" onClick={handleAddGroup}>
        <span className="add-group-plus">+</span>
        <span>Add new group</span>
      </button>
    </main>
  );
}
