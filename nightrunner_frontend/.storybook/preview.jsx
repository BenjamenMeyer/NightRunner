import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from 'react-oidc-context';
import BrandingProvider from '../src/branding/BrandingProvider.jsx';
import AuthServiceProvider from '../src/api/auth/AuthServiceProvider.jsx';
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

const mockOidcConfig = {
  authority: 'http://localhost:4000',
  client_id: 'storybook-client-id',
  redirect_uri: 'http://localhost:6006/callback',
  response_type: 'code',
  scope: 'openid profile email',
  skipUserInfo: true,
};

import ApiService from '../src/api/ApiService.js';
import AuthService from '../src/api/auth/AuthService.js';
import BackendTransport from '../src/api/BackendTransport.js';

const FAKE_EVENT = {
  id: 'storybook-demo-event-id',
  name: 'NightRunner Demo Championship 2026',
  description: 'Annual Night Operations Scouting Championship & Scoring Challenge',
  theme: 'night-ops',
  active: true,
  startDate: '2026-10-15',
  endDate: '2026-10-17',
};

const FAKE_USER = {
  id: 'storybook-admin-user',
  username: 'storybook_admin',
  displayName: 'Storybook Demo Admin',
  email: 'admin@storybook.local',
  isAdmin: true,
  roles: {
    'storybook-demo-event-id': 'event-admin',
  },
};

// Pre-seed mock user and fake event into ApiService and localStorage
if (typeof window !== 'undefined') {
  localStorage.setItem('nightrunner_last_event_id', FAKE_EVENT.id);
  localStorage.setItem('firebase_id_token', 'storybook-mock-token');
  ApiService.userData.set(FAKE_USER);

  AuthService.isAuthenticated = () => true;

  // Mock BackendTransport calls to avoid CORS/401 fetch errors in Storybook
  BackendTransport.get = async (url) => {
    if (url === '/me') return FAKE_USER;
    if (url === '/events') return [FAKE_EVENT];
    if (url.startsWith('/events/')) return FAKE_EVENT;
    if (url.includes('/arrivals')) {
      return {
        troopsArrived: 8,
        troopsExpected: 10,
        totalParticipantsArrived: 64,
        totalParticipantsExpected: 80,
        troops: [
          { id: 'troop-1', name: 'Troop 101 - Eagle Patrol', arrived: true, memberCount: 8, checkedInCount: 8 },
          { id: 'troop-2', name: 'Troop 404 - Pathfinder Troop', arrived: false, memberCount: 12, checkedInCount: 0 },
        ],
      };
    }
    return {};
  };

  // Mock UserService.get to return fake admin user synchronously/resolving
  ApiService.userData.get = async () => {
    ApiService.userData.set(FAKE_USER);
    return FAKE_USER;
  };

  // Mock EventService methods for Storybook isolation
  ApiService.eventData.getEvent = async () => FAKE_EVENT;
  ApiService.eventData.getEvents = async () => [FAKE_EVENT];

  if (ApiService.rosterData) {
    ApiService.rosterData.getArrivals = async () => ({
      troopsArrived: 8,
      troopsExpected: 10,
      totalParticipantsArrived: 64,
      totalParticipantsExpected: 80,
      troops: [
        { id: 'troop-1', name: 'Troop 101 - Eagle Patrol', arrived: true, memberCount: 8, checkedInCount: 8 },
        { id: 'troop-2', name: 'Troop 404 - Pathfinder Troop', arrived: false, memberCount: 12, checkedInCount: 0 },
      ],
    });
  }
}

const withProviders = (Story, context) => {
  const selectedTheme = context.globals.theme || 'night-ops';

  React.useEffect(() => {
    localStorage.setItem('night-runner-branding', selectedTheme);
    window.dispatchEvent(new Event('storage'));
  }, [selectedTheme]);

  return (
    <MemoryRouter>
      <AuthProvider {...mockOidcConfig}>
        <AuthServiceProvider>
          <BrandingProvider>
            <EventProvider>
              <div className="app-layout" style={{ display: 'block', height: 'auto', padding: '20px' }}>
                <Story />
              </div>
            </EventProvider>
          </BrandingProvider>
        </AuthServiceProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

export const decorators = [withProviders];
