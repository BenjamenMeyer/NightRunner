import React from 'react';
import RosterImport from '../pages/admin/roster/RosterImport';
import TroopMemberPicker from '../pages/admin/patrols/TroopMemberPicker';

export default {
  title: 'Roster/RosterImportAndPicker',
  parameters: {
    layout: 'padded',
  },
};

export const CSVImportScreen = () => (
  <div style={{ padding: '24px' }}>
    <RosterImport />
  </div>
);

export const TroopMemberPickerDialog = () => (
  <div style={{ maxWidth: '700px', margin: '0 auto', background: 'var(--card-bg, #1e293b)', padding: '20px', borderRadius: '8px' }}>
    <TroopMemberPicker
      eventId="demo-event"
      members={[
        { name: 'John Doe', rank: 'Navigator', troop: 'TX-1234' }
      ]}
      onAdd={(selected) => console.log('Added members:', selected)}
    />
  </div>
);
