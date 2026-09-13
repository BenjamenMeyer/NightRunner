import React from 'react';
import Patrols from '../pages/admin/patrols/Patrols';
import QRCodeModal from '../pages/admin/patrols/QRCodeModal';

export default {
  title: 'Patrols/PatrolManagement',
  parameters: {
    layout: 'padded',
  },
};

export const PatrolListTable = () => (
  <div style={{ padding: '24px' }}>
    <Patrols />
  </div>
);

const mockPatrol = {
  id: 'patrol-101',
  name: 'Eagle Patrol',
  number: 12,
  troop: 'TX-0412',
  members: [
    { name: 'Alice Smith', rank: 'Navigator' },
    { name: 'Bob Jones', rank: 'Adventurer' }
  ]
};

export const PatrolQRCodeDialog = () => (
  <div style={{ position: 'relative', height: '500px' }}>
    <QRCodeModal
      patrol={mockPatrol}
      onClose={() => console.log('Close QR modal')}
    />
  </div>
);
