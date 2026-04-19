import React, { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createHashRouter,
  RouterProvider,
  useParams,
} from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import { SettingsProvider } from './context/SettingsContext';

const App = lazy(() => import('./App'));
const NovelGridView = lazy(() => import('./components/novel/NovelGridView'));

// Novel Editor View Layout
// Extracts novelId from params and provides DataContext for that novel
const NovelEditorLayout = () => {
  const { novelId } = useParams();
  const { t } = useTranslation();

  if (!novelId) {
    // This case should ideally be handled by routing or a redirect
    // For now, show a message or redirect to home.
    return (
      <div>
        <p>{t('root_app_error_no_novel_id')}</p>
        <a href="/">{t('root_app_go_to_novels_link')}</a>
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
      <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading…</div>}>
        <RouterProvider router={router} />
      </Suspense>
    </SettingsProvider>
  );
}

export default RootApp;
