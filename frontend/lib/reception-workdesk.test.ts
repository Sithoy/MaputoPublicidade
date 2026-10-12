import { describe, expect, it } from 'vitest';
import { deskDate, maputoToday, waitingTime } from './reception-workdesk';

describe('Reception dates', () => {
  it('uses Maputo calendar days at the UTC boundary', () => {
    expect(maputoToday(new Date('2026-10-12T22:30:00Z'))).toBe('2026-10-13');
  });
  it('does not invent missing dates or waiting timestamps', () => {
    expect(deskDate(null)).toBe('Por confirmar');
    expect(deskDate('invalid')).toBe('Por confirmar');
    expect(waitingTime(null)).toContain('não registado');
    expect(waitingTime('2026-10-12T08:00:00Z', new Date('2026-10-13T08:00:00Z'))).toBe('Há 1 dia(s)');
  });
});
