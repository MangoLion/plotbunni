import React from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  useParams,
} from 'react-router-dom';
import App from './App'; // This is the existing App.jsx, will become NovelEditorView
import NovelGridView from './components/novel/NovelGridView'; // Import the actual NovelGridView
import { DataProvider } from './context/DataContext'; // Import DataProvider
import { SettingsProvider } from './context/SettingsContext'; // Import SettingsProvider

// Novel Editor View Layout
// Extracts novelId from params and provides DataContext for that novel
const NovelEditorLayout = () => {
  const { novelId } = useParams();
  // console.log("NovelEditorLayout - Novel ID from route params:", novelId);

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
      <App novelId={novelId} /> {/* App now receives novelId and is wrapped by its specific DataProvider */}
    </DataProvider>
  );
};

const router = createBrowserRouter([
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
