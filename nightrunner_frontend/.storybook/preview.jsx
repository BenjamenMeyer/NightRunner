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
