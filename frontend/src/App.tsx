import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { RealtimeProvider } from "./context/RealtimeContext";
import { Layout } from "./components/Layout";
import { DashboardPage } from "./pages/DashboardPage";
import { VendasPage } from "./pages/VendasPage";
import { EstoquePage } from "./pages/EstoquePage";
import { FinanceiroPage } from "./pages/FinanceiroPage";
import { DespesasPage } from "./pages/DespesasPage";
import { PdvMobilePage } from "./pages/PdvMobilePage";

export const App: React.FC = () => {
  return (
    <RealtimeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="vendas" element={<VendasPage />} />
            <Route path="estoque" element={<EstoquePage />} />
            <Route path="financeiro" element={<FinanceiroPage />} />
            <Route path="despesas" element={<DespesasPage />} />
            <Route path="pdv" element={<PdvMobilePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </RealtimeProvider>
  );
};

export default App;
