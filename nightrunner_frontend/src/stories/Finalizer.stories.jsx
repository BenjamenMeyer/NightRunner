import React from 'react';
import Finalizer from '../pages/admin/reports/Finalizer';

export default {
  title: 'Admin/ScoreFinalizer',
  component: Finalizer,
  parameters: {
    layout: 'fullscreen',
  },
};

export const ScoreFinalizerPage = () => (
  <div style={{ padding: '24px' }}>
    <Finalizer />
  </div>
);
