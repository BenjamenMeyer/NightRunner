import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import BrandingProvider from '../src/branding/BrandingProvider.jsx';
import { EventProvider } from '../src/api/helpers/event/EventContext.jsx';
import '../src/index.css';

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};

export const globalTypes = {
  theme: {
    name: 'Theme',
    description: 'Global theme for components',
    defaultValue: 'night-ops',
    toolbar: {
      icon: 'paintbrush',
      items: [
        { value: 'night-ops', title: 'Night Ops (Default)' },
        { value: 'trail-life', title: 'Trail Life USA' },
        { value: 'ahg', title: 'American Heritage Girls' },
      ],
      showName: true,
    },
  },
};

// Mock Auth context state for components that check auth/event context
const mockEventContextValue = {
  event: { id: 'demo-event-id', name: 'Demo Night Operations Event', theme: 'night-ops' },
  eventId: 'demo-event-id',
  loading: false,
  error: null,
  isSelected: true,
  getCurrentEvent: async () => ({ id: 'demo-event-id', name: 'Demo Night Operations Event' }),
  selectEvent: async () => {},
  changeEvent: async () => {},
  clearEvent: async () => {},
  openEventSelector: async () => {},
  closeEventSelector: () => {},
  canChangeEvent: true,
  isSystemAdmin: true,
};

// We import React's createContext indirectly or export a wrapper
const MockEventProvider = ({ children }) => {
  // Use React.createElement to bypass full auth initialization in Storybook
  const EventContextModule = require('../src/api/helpers/event/EventContext.jsx');
  // Return wrapper using EventProvider or mock
  return (
    <EventProvider>
      {children}
    </EventProvider>
  );
};

const withProviders = (Story, context) => {
  const selectedTheme = context.globals.theme || 'night-ops';

  React.useEffect(() => {
    localStorage.setItem('night-runner-branding', selectedTheme);
    window.dispatchEvent(new Event('storage'));
  }, [selectedTheme]);

  return (
    <MemoryRouter>
      <BrandingProvider>
        <EventProvider>
          <div className="app-layout" style={{ display: 'block', height: 'auto', padding: '20px' }}>
            <Story />
          </div>
        </EventProvider>
      </BrandingProvider>
    </MemoryRouter>
  );
};

export const decorators = [withProviders];
