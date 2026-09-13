import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import BrandingProvider from '../src/branding/BrandingProvider.jsx';
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

const withProviders = (Story, context) => {
  const selectedTheme = context.globals.theme || 'night-ops';

  React.useEffect(() => {
    localStorage.setItem('night-runner-branding', selectedTheme);
    window.dispatchEvent(new Event('storage'));
  }, [selectedTheme]);

  return (
    <MemoryRouter>
      <BrandingProvider>
        <div className="app-layout" style={{ display: 'block', height: 'auto', padding: '20px' }}>
          <Story />
        </div>
      </BrandingProvider>
    </MemoryRouter>
  );
};

export const decorators = [withProviders];
