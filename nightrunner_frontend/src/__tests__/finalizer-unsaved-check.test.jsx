import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Finalizer from '../pages/admin/reports/Finalizer';

vi.mock('@/api/helpers/event/EventContext.jsx', () => ({
  useEventContext: () => ({
    event: { id: 'evt-123', name: 'Test Event', scoringMode: 'absolute' },
    eventId: 'evt-123',
    loading: false,
    error: null,
  }),
}));

vi.mock('@/api/ApiService.js', () => ({
  default: {
    userData: {
      getCached: () => ({ id: 'usr-1', roles: { 'evt-123': 'admin' } }),
      isSystemAdmin: () => true,
      isEventAdmin: () => true,
      getEventRole: () => 'admin',
    },
    stationData: {
      getStations: async () => [
        { id: 'st-1', name: 'Station 1', tasks: [{ id: 't-1', name: 'Task 1', scoreWeight: 1.0 }] },
      ],
      updateStation: async () => ({}),
    },
    patrolData: {
      getPatrols: async () => [{ id: 'p-1', name: 'Patrol 1', number: 1, members: [] }],
    },
    configurationData: {
      getConfigurations: async () => [],
    },
    reportData: {
      getStationReport: async () => ({ stationId: 'st-1', patrols: [{ patrolId: 'p-1', breakdown: [{ taskId: 't-1', rawScore: 10 }] }] }),
      listCompiledReports: async () => ({ reports: [] }),
      generateReportJob: vi.fn(async () => ({ id: 'rep-99' })),
    },
    backendTransport: {
      get: async (url) => {
        if (url.includes('/scores/finalized')) {
          // Return a stored result that differs from on-screen calculations (e.g. stored score 99 vs calculated 10)
          return [
            { patrolId: 'p-1', stationId: 'st-1', scoreType: 'station', scoreValue: 99.0, scoringMode: 'absolute' },
            { patrolId: 'p-1', stationId: null, scoreType: 'final', scoreValue: 99.0, scoringMode: 'overall' },
          ];
        }
        return [];
      },
      post: vi.fn(async () => ({ status: 'saved' })),
    },
  },
}));

describe('Finalizer Unsaved Mismatch Check (#233)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prompts user to save before generating non-draft report when calculations differ from stored results', async () => {
    const windowConfirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);

    render(<Finalizer />);

    // Wait for stations and mismatch warning to load
    await waitFor(() => {
      expect(screen.getByText(/Stored Calculation Mismatch Warning/i)).toBeTruthy();
    });

    const odsButton = screen.getByTitle(/Download OpenDocument Spreadsheet/i);
    fireEvent.click(odsButton);

    // Confirm that window.confirm was called to warn the user about unsaved differences
    expect(windowConfirmSpy).toHaveBeenCalled();
    const promptMessage = windowConfirmSpy.mock.calls[0][0];
    expect(promptMessage).toContain('unsaved weight or scoring changes');

    windowConfirmSpy.mockRestore();
  });
});
