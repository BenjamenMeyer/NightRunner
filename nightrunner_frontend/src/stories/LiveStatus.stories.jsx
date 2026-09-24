import React from 'react';
import ProgressGrid, {
  NUMBERED_IDENTITY_COLUMNS,
  PUBLIC_IDENTITY_COLUMNS,
} from '../pages/scoring/live/ProgressGrid';
import SummaryView from '../pages/scoring/live/SummaryView';

// Mid-event snapshot: some stations scored, one patrol finished but not yet
// scored at Fire, one patrol at a station now, one patrol not started.

const stations = [
  { id: 'ropes', name: 'Ropes' },
  { id: 'fire', name: 'Fire' },
  { id: 'water', name: 'Water Rescue' },
  { id: 'nav', name: 'Night Nav' },
];

const patrols = [
  { id: 'p4', number: 4, name: 'Foxes', troops: ['GA-0612'] },
  { id: 'p1', number: 1, name: 'Eagles', troops: ['GA-0594'] },
  { id: 'p3', number: 3, name: 'Hawks', troops: ['GA-0594', 'GA-0612'] },
  { id: 'p2', number: 2, name: 'Owls', troops: ['GA-0701'] },
];

const t = (h, m) => `2026-09-25T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00Z`;

const visits = [
  { patrolId: 'p1', stationId: 'ropes', checkedInAt: t(20, 0), checkedOutAt: t(20, 25), status: 'completed' },
  { patrolId: 'p1', stationId: 'fire', checkedInAt: t(20, 35), checkedOutAt: t(21, 0), status: 'checked_out' },
  { patrolId: 'p1', stationId: 'water', checkedInAt: t(21, 10), status: 'checked_in' },
  { patrolId: 'p2', stationId: 'ropes', checkedInAt: t(20, 5), checkedOutAt: t(20, 30), status: 'completed' },
  { patrolId: 'p2', stationId: 'nav', checkedInAt: t(20, 45), checkedOutAt: t(21, 15), status: 'completed' },
  { patrolId: 'p4', stationId: 'fire', checkedInAt: t(20, 10), checkedOutAt: t(20, 40), status: 'completed' },
  { patrolId: 'p4', stationId: 'water', checkedInAt: t(20, 50), tasksStartedAt: t(20, 52), status: 'checked_in' },
];

export default {
  title: 'Live/LiveStatus',
  parameters: {
    layout: 'padded',
  },
};

export const Summary = () => (
  <SummaryView stations={stations} patrols={patrols} visits={visits} />
);

export const Table = () => (
  <ProgressGrid
    stations={stations}
    patrols={patrols}
    visits={visits}
    displayMode="manual"
    identityColumns={NUMBERED_IDENTITY_COLUMNS}
    showStationTotals
    showPatrolTotals
  />
);

export const PublicBoard = () => (
  <ProgressGrid
    stations={stations}
    patrols={patrols}
    visits={visits}
    displayMode="fit"
    identityColumns={PUBLIC_IDENTITY_COLUMNS}
    verboseLegend
    showPatrolTotals
  />
);

export const NothingStartedYet = () => (
  <SummaryView stations={stations} patrols={patrols} visits={[]} />
);
