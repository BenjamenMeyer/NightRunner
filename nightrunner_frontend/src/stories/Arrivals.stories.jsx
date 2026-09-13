import React from 'react';
import ArrivalsDashboard from '../pages/arrivals/ArrivalsDashboard';
import Arrivals from '../pages/arrivals/Arrivals';
import ArrivalsPrint from '../pages/arrivals/ArrivalsPrint';

export default {
  title: 'Arrivals/ArrivalsScreens',
  parameters: {
    layout: 'fullscreen',
  },
};

export const DashboardView = () => (
  <div style={{ padding: '24px' }}>
    <ArrivalsDashboard />
  </div>
);

export const GateCheckInScreen = () => (
  <div style={{ padding: '24px' }}>
    <Arrivals />
  </div>
);

export const PrintableRosterSheet = () => (
  <div style={{ padding: '24px' }}>
    <ArrivalsPrint />
  </div>
);
