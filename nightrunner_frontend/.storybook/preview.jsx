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

  const mockArrivalsData = {
    arrivedPeople: 18,
    expectedPeople: 22,
    arrivedTroops: 1,
    totalTroops: 2,
    troops: [
      {
        troopId: 'troop-1',
        troopNumber: 'TX-0101',
        arrived: 8,
        expected: 8,
        missing: 0,
        attendees: [
          { id: 'att-1', fullName: 'Alice Smith', category: 'youth', arrival: { arrivedAt: new Date().toISOString() } },
          { id: 'att-2', fullName: 'Bob Johnson', category: 'youth', arrival: { arrivedAt: new Date().toISOString() } },
          { id: 'att-3', fullName: 'Charlie Brown', category: 'adult', arrival: { arrivedAt: new Date().toISOString() } },
        ],
      },
      {
        troopId: 'troop-2',
        troopNumber: 'TX-0404',
        arrived: 10,
        expected: 14,
        missing: 4,
        attendees: [
          { id: 'att-4', fullName: 'David Lee', category: 'youth', arrival: { arrivedAt: new Date().toISOString() } },
          { id: 'att-5', fullName: 'Emma Wilson', category: 'youth', arrival: null },
          { id: 'att-6', fullName: 'Frank Miller', category: 'adult', arrival: null },
        ],
      },
    ],
  };

  const mockStationsData = [
    {
      id: 'station-knot',
      name: 'Knot Tying Challenge Station',
      description: 'Patrols must construct tripod lashing.',
      station_weight: 1.0,
      tasks: [
        { id: 'task-1', name: 'Bowline Knot', active: true, scoreWeight: 1.0, maxScore: 100 },
        { id: 'task-2', name: 'First Aid Safety', active: true, scoreWeight: 1.5, maxScore: 20 },
      ],
    },
  ];

  const mockPatrolsData = [
    { id: 'patrol-101', name: 'Eagle Patrol 101', number: 101 },
  ];

  // Mock BackendTransport calls to avoid CORS/401 fetch errors in Storybook
  BackendTransport.get = async (url) => {
    if (url === '/me') return FAKE_USER;
    if (url === '/events') return [FAKE_EVENT];
    if (url.startsWith('/events/')) return FAKE_EVENT;
    if (url.includes('/arrivals')) return mockArrivalsData;
    if (url.includes('/stations')) return mockStationsData;
    if (url.includes('/patrols')) return mockPatrolsData;
    if (url.includes('/scores/finalized')) return [];
    return [];
  };

  // Mock UserService.get to return fake admin user synchronously/resolving
  ApiService.userData.get = async () => {
    ApiService.userData.set(FAKE_USER);
    return FAKE_USER;
  };

  // Mock EventService & data methods for Storybook isolation
  ApiService.eventData.getEvent = async () => FAKE_EVENT;
  ApiService.eventData.getEvents = async () => [FAKE_EVENT];
  ApiService.stationData.getStations = async () => mockStationsData;
  ApiService.patrolData.getPatrols = async () => mockPatrolsData;
  ApiService.configurationData.getConfigurations = async () => [];
  ApiService.reportData.getStationReport = async (stId) => ({ stationId: stId, patrols: [] });

  if (ApiService.rosterData) {
    ApiService.rosterData.getArrivals = async () => mockArrivalsData;
  }
}

import brandings from '../src/branding/index.js';

const ThemeSwitcher = ({ children, theme }) => {
  React.useEffect(() => {
    const branding = brandings[theme] || brandings['night-ops'];
    localStorage.setItem('night-runner-branding', theme);

    let link = document.getElementById('branding-theme');
    if (!link) {
      link = document.createElement('link');
      link.id = 'branding-theme';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    if (branding?.colors) {
      link.href = branding.colors;
    }

    // Ensure the iframe body background matches the theme's page background
    document.body.style.background = 'var(--page-bg)';
    document.body.style.color = 'var(--text-primary)';
    document.body.style.minHeight = '100vh';
  }, [theme]);

  return children;
};

const withProviders = (Story, context) => {
  const selectedTheme = context.globals.theme || 'night-ops';
  FAKE_EVENT.theme = selectedTheme;

  return (
    <ThemeSwitcher theme={selectedTheme}>
      <MemoryRouter>
        <AuthProvider {...mockOidcConfig}>
          <AuthServiceProvider>
            <BrandingProviderKeyed theme={selectedTheme}>
              <EventProvider>
                <div className="app-layout" style={{ display: 'block', minHeight: '100vh', background: 'var(--page-bg)', color: 'var(--text-primary)', padding: '20px', overflowY: 'auto' }}>
                  <Story />
                </div>
              </EventProvider>
            </BrandingProviderKeyed>
          </AuthServiceProvider>
        </AuthProvider>
      </MemoryRouter>
    </ThemeSwitcher>
  );
};

const BrandingProviderKeyed = ({ theme, children }) => (
  <BrandingProvider key={theme}>
    {children}
  </BrandingProvider>
);

export const decorators = [withProviders];
