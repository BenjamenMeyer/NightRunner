import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Reports from '../pages/admin/reports/Reports';

vi.mock('@/api/helpers/event/EventContext.jsx', () => ({
  useEventContext: () => ({
    event: { name: 'Test Event' },
    eventId: 'evt-123',
    loading: false,
    error: null,
    isSystemAdmin: true,
  }),
}));

vi.mock('@/api/ApiService.js', () => ({
  default: {
    reportData: {
      listCompiledReports: async () => ({
        reports: [
          {
            id: 'rep-1',
            name: 'Patrol QR Badges (Test Event)',
            report_type: 'patrols-pdf',
            status: 'generating',
            created_at: '2026-09-14T12:00:00Z',
          },
          {
            id: 'rep-2',
            name: 'Final Scoring Report (Test Event)',
            report_type: 'event-scoring',
            status: 'ready',
            created_at: '2026-09-14T11:00:00Z',
            size_bytes: 12345,
          },
          {
            id: 'rep-3',
            name: 'Scoring Spreadsheet (Test Event)',
            report_type: 'event-scoring-ods',
            status: 'ready',
            created_at: '2026-09-14T10:00:00Z',
            size_bytes: 54321,
          },
        ],
      }),
      generateReportJob: async () => ({ id: 'rep-4' }),
      deleteCompiledReport: async () => {},
      getCompiledReportDownloadUrl: (id) => `http://localhost:8000/v1/compiled-reports/${id}/download`,
    },
  },
}));

describe('Reports Page Registry', () => {
  it('renders compiled report registry entries and spinner for generating status', async () => {
    render(<Reports />);
    const item1 = await screen.findByText('Patrol QR Badges (Test Event)');
    expect(item1).toBeTruthy();
    expect(screen.getByText('Final Scoring Report (Test Event)')).toBeTruthy();
    expect(screen.getByText('Scoring Spreadsheet (Test Event)')).toBeTruthy();
    expect(screen.getByText('Generating...')).toBeTruthy();
    expect(screen.getAllByText('View Report').length).toBeGreaterThan(0);
    expect(screen.getByText('Download PDF')).toBeTruthy();
    expect(screen.getByText('Download Spreadsheet (ODS)')).toBeTruthy();
  });
});
