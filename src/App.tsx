import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Dashboard from "./components/dashboard/Dashboard";
import ContractsPage from "./components/contracts/ContractsPage";
import Record from "./components/contracts/Record";
import RoutesPage from "./components/routes/RoutesPage";
import NotFound from "./pages/NotFound";
import { DebugProvider } from "./contexts/DebugContext";
import RemoteSession from './components/contracts/RemoteSession';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <DebugProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout><Dashboard /></Layout>} />
            <Route path="/contracts" element={<Layout><ContractsPage /></Layout>} />
            <Route path="/contracts/record" element={<Layout><Record /></Layout>} />
            <Route path="/contracts/remote" element={<Layout><RemoteSession /></Layout>} />
            <Route path="/routes" element={<Layout><RoutesPage /></Layout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </DebugProvider>
  </QueryClientProvider>
);

export default App;
