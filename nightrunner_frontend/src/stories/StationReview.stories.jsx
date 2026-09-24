import React from 'react';
import StationReviewTable from '../pages/scoring/review/StationReviewTable';
import '../pages/scoring/review/StationReview.css';

// The page itself loads from ApiService and the event context; the table is
// what it renders, so the stories drive the table with fixed data.

const station = {
  id: 'st-speed',
  name: 'Speed',
  tasks: [
    { id: 't-base', name: 'Base', type: 'Pass / Fail' },
    { id: 't-time', name: 'Event time', type: 'Stopwatch' },
    { id: 't-skipped', name: 'Stations skipped', type: 'Score Challenge' },
    { id: 't-note', name: 'Finish note', type: 'Text Answer' },
  ],
};

const patrols = [
  { id: 'p4', number: 4, name: 'Foxes' },
  { id: 'p1', number: 1, name: 'Eagles' },
  { id: 'p3', number: 3, name: 'Hawks' },
  { id: 'p2', number: 2, name: 'Owls' },
];

const report = {
  patrols: [
    {
      patrolId: 'p1',
      breakdown: [
        { taskId: 't-base', rawScore: 1, submittedAt: '2026-09-26T02:41:00' },
        { taskId: 't-time', rawScore: 9718 },
        { taskId: 't-skipped', rawScore: 0 },
        { taskId: 't-note', rawScore: 1, submittedText: 'All nine stations' },
      ],
    },
    {
      patrolId: 'p3',
      breakdown: [
        { taskId: 't-base', rawScore: 0, submittedAt: '2026-09-26T04:12:00' },
        { taskId: 't-time', rawScore: 21033 },
        { taskId: 't-skipped', rawScore: 2 },
        { taskId: 't-note', rawScore: 0, submittedText: '' },
      ],
    },
    {
      patrolId: 'p4',
      breakdown: [
        { taskId: 't-base', rawScore: 1, submittedAt: '2026-09-26T03:05:00' },
        { taskId: 't-time', rawScore: 12005 },
        { taskId: 't-skipped', rawScore: 1 },
        { taskId: 't-note', rawScore: 1, submittedText: 'Skipped Water' },
      ],
    },
  ],
};

export default {
  title: 'Scoring/ReviewEntries',
  component: StationReviewTable,
  parameters: {
    layout: 'padded',
  },
};

export const SomeEntriesMissing = () => (
  <StationReviewTable station={station} patrols={patrols} report={report} />
);

export const ArrivedFromScoringPage = () => (
  <StationReviewTable station={station} patrols={patrols} report={report} highlightPatrolId="p3" />
);

export const NothingEnteredYet = () => (
  <StationReviewTable station={station} patrols={patrols} report={{ patrols: [] }} />
);
