import React from 'react';
import ScoreField from '../pages/scoring/ScoreField';
import ScoreForm from '../pages/scoring/ScoreForm';

export default {
  title: 'Scoring/ScoreField',
  component: ScoreField,
  parameters: {
    layout: 'padded',
  },
};

const mockTaskRange = {
  id: 'task-1',
  name: 'Knot Tying Challenge',
  type: 'Score Challenge',
  instructions: 'Demonstrate tying a Bowline, Clove Hitch, and Square Knot.',
  notes: 'Scorers should verify knots hold weight for 5 seconds.',
  maxScore: 100,
  scoreWeight: 1.0,
};

const mockTaskMulti = {
  id: 'task-2',
  name: 'First Aid Priority',
  type: 'Multiple Choice',
  instructions: 'Select the correct first aid action for severe bleeding.',
  notes: 'Direct pressure is the primary initial step.',
  maxScore: 20,
  scoreWeight: 1.5,
  options: [
    { label: 'Apply Direct Pressure', value: 20 },
    { label: 'Elevate Limb', value: 10 },
    { label: 'Apply Tourniquet Immediately', value: 5 },
  ],
};

export const ScoreChallengeField = () => (
  <div style={{ maxWidth: '600px' }}>
    <ScoreField
      task={mockTaskRange}
      value={85}
      onChange={(val) => console.log('Score changed:', val)}
    />
  </div>
);

export const MultipleChoiceField = () => (
  <div style={{ maxWidth: '600px' }}>
    <ScoreField
      task={mockTaskMulti}
      value={20}
      onChange={(val) => console.log('Option selected:', val)}
    />
  </div>
);

const mockPatrol = {
  id: 'patrol-101',
  programName: 'Eagle Patrol 101',
};

const mockStation = {
  id: 'station-knot',
  name: 'Knot Tying & Lashing Station',
  description: 'Patrols must construct a sturdy tripod lashing to hold a 5-gallon jug.',
  tasks: [mockTaskRange, mockTaskMulti],
};

export const FullScoreForm = () => (
  <div style={{ maxWidth: '800px' }}>
    <ScoreForm
      patrol={mockPatrol}
      station={mockStation}
      eventId="event-demo"
      configurationId="config-demo"
      onScoreSubmitted={() => alert('Score Submitted in Storybook!')}
    />
  </div>
);
