import type { StatusOption } from '../types';

const createStatusId = () => `status-${crypto.randomUUID()}`;

export const createDefaultStatusOptions = (): StatusOption[] => [
  { id: createStatusId(), label: 'Not started', color: '#c4c9d4' },
  { id: createStatusId(), label: 'Working on it', color: '#fdab3d' },
  { id: createStatusId(), label: 'Done', color: '#00c875' },
];

export const getContrastTextColor = (hexColor: string): string => {
  const normalized = hexColor.replace('#', '');
  if (normalized.length !== 6) {
    return '#1a2440';
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;

  return luminance > 160 ? '#1a2440' : '#ffffff';
};
