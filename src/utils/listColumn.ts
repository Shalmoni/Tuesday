import type { ListColumnEntry } from '../types';

const createEntryId = () => `list-entry-${crypto.randomUUID()}`;

export const createEmptyListEntry = (): ListColumnEntry => ({
  id: createEntryId(),
  left: '',
  right: '',
});

export const parseListColumnValue = (value: string): ListColumnEntry[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((entry) => {
      if (
        typeof entry !== 'object' ||
        entry === null ||
        typeof (entry as { id?: unknown }).id !== 'string' ||
        typeof (entry as { left?: unknown }).left !== 'string' ||
        typeof (entry as { right?: unknown }).right !== 'string'
      ) {
        return [];
      }

      return [
        {
          id: (entry as { id: string }).id,
          left: (entry as { left: string }).left,
          right: (entry as { right: string }).right,
        },
      ];
    });
  } catch {
    return [];
  }
};

export const serializeListColumnValue = (entries: ListColumnEntry[]): string => JSON.stringify(entries);
