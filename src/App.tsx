import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { API_Provider } from "./context/APIContext";
import { ToastProvider } from "./components/ToastContainer";
import PasswordGate from "./components/PasswordGate";
import Dashboard from "./pages/Dashboard";
import ServersPage from "./pages/ServersPage";
import QueuePage from "./pages/QueuePage";
import HistoryPage from "./pages/HistoryPage";
import LogsPage from "./pages/LogsPage";
import SettingsPage from "./pages/SettingsPage";
import APIAccountsPage from "./pages/APIAccountsPage";
import OVHAvailabilityPage from "./pages/OVHAvailabilityPage";
import MonitorPage from "./pages/MonitorPage";
import VPSMonitorPage from "./pages/VPSMonitorPage";
import ServerControlPage from "./pages/ServerControlPage";
import AccountManagementPage from "./pages/AccountManagementPage";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <ToastProvider>
        <PasswordGate>
          <API_Provider>
            <TooltipProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="servers" element={<ServersPage />} />
                    <Route path="availability" element={<OVHAvailabilityPage />} />
                    <Route path="queue" element={<QueuePage />} />
                    <Route path="monitor" element={<MonitorPage />} />
                    <Route path="vps-monitor" element={<VPSMonitorPage />} />
                    <Route path="server-control" element={<ServerControlPage />} />
                    <Route path="account-management" element={<AccountManagementPage />} />
                    <Route path="history" element={<HistoryPage />} />
                    <Route path="logs" element={<LogsPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="api-accounts" element={<APIAccountsPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
              </BrowserRouter>
              <Toaster />
              <SonnerToaster />
            </TooltipProvider>
          </API_Provider>
        </PasswordGate>
      </ToastProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
