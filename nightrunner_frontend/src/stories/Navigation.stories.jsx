import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default {
  title: 'Navigation/ChromeComponents',
  parameters: {
    layout: 'fullscreen',
  },
};

export const NavigationSidebar = () => (
  <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--page-bg, #0f172a)' }}>
    <Sidebar sidebarOpen={true} setSidebarOpen={() => {}} />
    <div style={{ flex: 1, padding: '24px', color: 'var(--text-primary, #f8fafc)' }}>
      <h3>Main Content Area</h3>
      <p>Select different themes in the Storybook toolbar to test branding styles on the sidebar navigation.</p>
    </div>
  </div>
);

export const TopHeaderBar = () => (
  <div style={{ background: 'var(--page-bg, #0f172a)', minHeight: '200px' }}>
    <Header sidebarOpen={true} setSidebarOpen={() => {}} />
  </div>
);

export const PageFooter = () => (
  <div style={{ background: 'var(--page-bg, #0f172a)', padding: '40px 0' }}>
    <Footer />
  </div>
);
