/**
 * DotyNotes Theme & Color Architecture
 *
 * Matching the exact color tokens and 7 pastel sticky note schemes
 * defined in the DotyNotes Android mobile app.
 */

export interface PastelNoteColor {
  id: string;
  name: string;
  bg: string;
  border: string;
  tagBg: string;
  text: string;
  accent: string;
  hoverBg?: string;
}

export const PASTEL_NOTE_COLORS: PastelNoteColor[] = [
  {
    id: 'blue',
    name: 'Pastel Blue',
    bg: '#A8C7FA',
    border: '#8AB4F8',
    tagBg: '#C2E7FF',
    text: '#042A6B',
    accent: '#1A73E8',
    hoverBg: '#96B9F5',
  },
  {
    id: 'mint',
    name: 'Pastel Mint',
    bg: '#A4E7C0',
    border: '#82D8A4',
    tagBg: '#C4EED0',
    text: '#074820',
    accent: '#137333',
    hoverBg: '#94DDAC',
  },
  {
    id: 'pink',
    name: 'Pastel Pink',
    bg: '#EEA0CA',
    border: '#E380B4',
    tagBg: '#F8C2DB',
    text: '#5B0E38',
    accent: '#B8065B',
    hoverBg: '#E492BD',
  },
  {
    id: 'yellow',
    name: 'Pastel Yellow',
    bg: '#F7CC78',
    border: '#EBB958',
    tagBg: '#FCE0A6',
    text: '#4E3000',
    accent: '#B06000',
    hoverBg: '#F1C165',
  },
  {
    id: 'lavender',
    name: 'Pastel Lavender',
    bg: '#BFAFF8',
    border: '#A792F5',
    tagBg: '#DDD2FD',
    text: '#2A1468',
    accent: '#6D28D9',
    hoverBg: '#B3A1F2',
  },
  {
    id: 'teal',
    name: 'Pastel Teal',
    bg: '#87D4CA',
    border: '#6EC3B7',
    tagBg: '#B3E8E0',
    text: '#043E37',
    accent: '#007B83',
    hoverBg: '#7AC9BF',
  },
  {
    id: 'sky',
    name: 'Pastel Sky',
    bg: '#ADD3F5',
    border: '#91BEE7',
    tagBg: '#CCE5FC',
    text: '#08335C',
    accent: '#1B66C9',
    hoverBg: '#9CC6EB',
  },
];

export const BRAND_COLORS = {
  navy: '#182E3A',
  coral: '#F99773',
  purple: '#6D28D9',
  lavender: '#BFAFF8',
  warmWhite: '#FAF9F6',
  cardBg: '#FFFFFF',
  mutedText: '#64748B',
  borderLight: '#E2E8F0',
};
