import React from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

export default {
  title: 'Components/ConfirmDialog',
  component: ConfirmDialog,
  parameters: {
    layout: 'fullscreen',
  },
};

const noop = () => {};

export const CheckIn = () => (
  <ConfirmDialog open title="Check In?" confirmLabel="Yes, check in" onConfirm={noop} onCancel={noop}>
    <p>
      Checking <strong>Patrol 7 — Eagles</strong> <span className="confirm-dialog-direction">IN</span> at <strong>Ropes</strong>.
    </p>
  </ConfirmDialog>
);

export const CheckOut = () => (
  <ConfirmDialog open title="Check Out?" confirmLabel="Yes, check out" onConfirm={noop} onCancel={noop}>
    <p>
      Checking <strong>Patrol 7 — Eagles</strong> <span className="confirm-dialog-direction">OUT</span> at <strong>Ropes</strong>.
    </p>
    <p>Checking out ends this patrol's time at the station.</p>
  </ConfirmDialog>
);

// The variant the Command Center "patrol finished" action (#237) will use.
export const WarningRecheckIn = () => (
  <ConfirmDialog
    open
    variant="warning"
    title="Check this patrol in again?"
    confirmLabel="Yes, check in again"
    onConfirm={noop}
    onCancel={noop}
  >
    <p>
      <strong>Patrol 7 — Eagles</strong> has already checked out from <strong>Ropes</strong>.
    </p>
    <p>Check them in again for another visit?</p>
  </ConfirmDialog>
);

export const Saving = () => (
  <ConfirmDialog open busy title="Check In?" confirmLabel="Yes, check in" onConfirm={noop} onCancel={noop}>
    <p>
      Checking <strong>Patrol 7 — Eagles</strong> <span className="confirm-dialog-direction">IN</span> at <strong>Ropes</strong>.
    </p>
  </ConfirmDialog>
);
