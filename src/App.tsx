import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import SpeisenPage from '@/pages/SpeisenPage';
import TischePage from '@/pages/TischePage';
import BestellungenPage from '@/pages/BestellungenPage';
import PublicFormSpeisen from '@/pages/public/PublicForm_Speisen';
import PublicFormTische from '@/pages/public/PublicForm_Tische';
import PublicFormBestellungen from '@/pages/public/PublicForm_Bestellungen';
// <public:imports>
// </public:imports>
// <custom:imports>
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/6a0c2b3d9f199babf80832d4" element={<PublicFormSpeisen />} />
              <Route path="public/6a0c2b41f8c0e3c711f12e3f" element={<PublicFormTische />} />
              <Route path="public/6a0c2b42d7ff8d6335b2f8db" element={<PublicFormBestellungen />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="speisen" element={<SpeisenPage />} />
                <Route path="tische" element={<TischePage />} />
                <Route path="bestellungen" element={<BestellungenPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
