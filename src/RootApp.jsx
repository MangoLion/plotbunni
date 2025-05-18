import React from 'react';
import {
  createHashRouter,
  RouterProvider,
  useParams,
} from 'react-router-dom';
import App from './App';
import NovelGridView from './components/novel/NovelGridView';
import { DataProvider } from './context/DataContext';
import { SettingsProvider } from './context/SettingsContext';

// Novel Editor View Layout
// Extracts novelId from params and provides DataContext for that novel
const NovelEditorLayout = () => {
  const { novelId } = useParams();

  if (!novelId) {
    // This case should ideally be handled by routing or a redirect
    // For now, show a message or redirect to home.
    return (
      <div>
        <p>Error: No Novel ID provided.</p>
        <a href="/">Go to Novels</a>
      </div>
    );
  }

  return (
    <DataProvider novelId={novelId}>
      <App novelId={novelId} />
    </DataProvider>
  );
};

const router = createHashRouter([
  {
    path: '/',
    element: <NovelGridView />,
  },
  {
    path: '/novel/:novelId',
    element: <NovelEditorLayout />, // Use a layout component to grab params
  },
]);

function RootApp() {
  return (
    <SettingsProvider>
      <RouterProvider router={router} />
    </SettingsProvider>
  );
}

export default RootApp;
