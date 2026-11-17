import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Wallet,
  Package,
  ShoppingCart,
  Truck,
  Receipt,
  RefreshCw,
  ArrowUpRight
} from "lucide-react";
import { apiFetch, formatBRL, formatDateBR } from "../lib/api";
import { useRealtime } from "../context/RealtimeContext";

interface DashboardResponse {
  totals: {
    saldoGeral: number;
    saldoVendas: number;
    saldoHuidaTransportes: number;
    totalFaturado: number;
    totalVendas: number;
    totalHuidaTransportes: number;
    alugueis: number;
    outrasEntradas: number;
    estoque: number;
    gastosGeral: number;
    gastosCompras: number;
    gastosBig: number;
    gastosHuidaTransportes: number;
    totalContasAPagar: number;
  };
  counts: {
    salesCount: number;
    productsInStock: number;
    pendingBillsCount: number;
  };
}

interface SaleItem {
  id: number;
  saleDate: string;
  neighborhood: string;
  quantity: number;
  productName: string;
  grossValue: number;
  netSaleValue: number;
  stockValue: number;
  deliveryFee: number;
  paymentMethod: string;
  difference: number;
  originDevice: string;
  status: string;
}

export const DashboardPage: React.FC = () => {
  const { syncVersion, triggerManualSync } = useRealtime();
  const [selectedMonth, setSelectedMonth] = useState<string>("10");
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [filterAll, setFilterAll] = useState<boolean>(false);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [recentSales, setRecentSales] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      try {
        const query = filterAll ? "" : `?month=${selectedMonth}&year=${selectedYear}`;
        const [dashData, salesData] = await Promise.all([
          apiFetch<DashboardResponse>(`/financial/dashboard${query}`),
          apiFetch<{ sales: SaleItem[] }>(`/sales${query}`)
        ]);
        if (!active) return;
        setDashboard(dashData);
        setRecentSales(salesData.sales.slice(0, 8));
      } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [selectedMonth, selectedYear, filterAll, syncVersion]);

  const t = dashboard?.totals;

  return (
    <div className="space-y-6">
      {/* Barra Superior de Filtro de Período (Aba TOTAL) */}
      <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Dashboard Geral — Aba TOTAL (Financeira)
            </h2>
            <p className="text-xs text-slate-500">
              Consolidação automática de Saldos, Faturamento, Estoque, Huida Transportes e Gastos
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 bg-slate-100 px-3 py-2 rounded-lg">
            <input
              type="checkbox"
              checked={filterAll}
              onChange={(e) => setFilterAll(e.target.checked)}
            />
            <span>Todos os meses</span>
          </label>

          {!filterAll && (
            <>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                aria-label="Mês de referência"
                className="text-xs font-semibold border border-emerald-200 rounded-lg px-3 py-2 bg-white text-slate-800"
              >
                <option value="1">Janeiro</option>
                <option value="2">Fevereiro</option>
                <option value="3">Março</option>
                <option value="4">Abril</option>
                <option value="5">Maio</option>
                <option value="6">Junho</option>
                <option value="7">Julho</option>
                <option value="8">Agosto</option>
                <option value="9">Setembro</option>
                <option value="10">Outubro</option>
                <option value="11">Novembro</option>
                <option value="12">Dezembro</option>
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                aria-label="Ano de referência"
                className="text-xs font-semibold border border-emerald-200 rounded-lg px-3 py-2 bg-white text-slate-800"
              >
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </>
          )}

          <button
            type="button"
            onClick={triggerManualSync}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Linha 1: 3 Blocos Principais da Aba TOTAL (TOTAL GERAL / TOTAL FATURADO / GASTOS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Coluna 1: TOTAL GERAL (Saldos) */}
        <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 text-white rounded-2xl p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-700/70 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
              1. TOTAL GERAL (Saldos)
            </span>
            <Wallet className="w-5 h-5 text-emerald-300" />
          </div>

          <div className="space-y-3">
            <div className="bg-emerald-950/50 rounded-xl p-3.5 border border-emerald-700/50">
              <div className="text-xs text-emerald-200">SALDO GERAL (Contas Reais + Caixa)</div>
              <div className="text-2xl font-extrabold text-white mt-0.5">
                {formatBRL(t?.saldoGeral)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-950/40 rounded-xl p-3 border border-emerald-700/40">
                <div className="text-[11px] text-emerald-200">SALDO VENDAS</div>
                <div className="text-base font-bold text-emerald-100 mt-0.5">
                  {formatBRL(t?.saldoVendas)}
                </div>
              </div>
              <div className="bg-emerald-950/40 rounded-xl p-3 border border-emerald-700/40">
                <div className="text-[11px] text-emerald-200">SALDO HUIDA TRANSP.</div>
                <div className="text-base font-bold text-emerald-100 mt-0.5">
                  {formatBRL(t?.saldoHuidaTransportes)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna 2: TOTAL FATURADO (Entradas + Estoque) */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              2. TOTAL FATURADO & ESTOQUE
            </span>
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>

          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600 font-medium">TOTAL VENDAS (Celular)</span>
              <strong className="text-emerald-700">{formatBRL(t?.totalVendas)}</strong>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600 font-medium">TOTAL HUIDA TRANSPORTES</span>
              <strong className="text-slate-900">{formatBRL(t?.totalHuidaTransportes)}</strong>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600 font-medium">ALUGUÉIS</span>
              <strong className="text-slate-900">{formatBRL(t?.alugueis)}</strong>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600 font-medium">OUTRAS ENTRADAS</span>
              <strong className="text-slate-900">{formatBRL(t?.outrasEntradas)}</strong>
            </div>
            <div className="flex items-center justify-between pt-2 bg-emerald-50 px-3 py-2 rounded-lg">
              <span className="text-emerald-900 font-bold text-xs uppercase">VALOR EM ESTOQUE</span>
              <strong className="text-emerald-800 font-bold">{formatBRL(t?.estoque)}</strong>
            </div>
          </div>
        </div>

        {/* Coluna 3: GASTOS (Resumo de Saídas) */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
              3. GASTOS CONSOLIDADOS
            </span>
            <TrendingDown className="w-5 h-5 text-rose-600" />
          </div>

          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600 font-medium">GASTOS GERAL (Casa + Cartão)</span>
              <strong className="text-rose-700">{formatBRL(t?.gastosGeral)}</strong>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600 font-medium">GASTOS COMPRAS (Mercadoria)</span>
              <strong className="text-slate-900">{formatBRL(t?.gastosCompras)}</strong>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600 font-medium">GASTOS BIG (Loja / Motoboy / Ads)</span>
              <strong className="text-slate-900">{formatBRL(t?.gastosBig)}</strong>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-600 font-medium">GASTOS HUIDA TRANSPORTES</span>
              <strong className="text-slate-900">{formatBRL(t?.gastosHuidaTransportes)}</strong>
            </div>
            <div className="flex items-center justify-between pt-2 bg-amber-50 px-3 py-2 rounded-lg">
              <span className="text-amber-900 font-bold text-xs uppercase">
                TOTAL ABA CONTAS ({dashboard?.counts.pendingBillsCount || 0} pendentes)
              </span>
              <strong className="text-amber-900 font-bold">{formatBRL(t?.totalContasAPagar)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Atalhos Rápidos de Gestão */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link
          to="/vendas"
          className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm hover:border-emerald-500 transition flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-emerald-600" />
            <div>
              <div className="text-xs text-slate-500">Vendas no Período</div>
              <div className="text-lg font-bold text-slate-900">
                {dashboard?.counts.salesCount ?? 0} vendas
              </div>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-400" />
        </Link>

        <Link
          to="/estoque"
          className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm hover:border-emerald-500 transition flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-emerald-600" />
            <div>
              <div className="text-xs text-slate-500">Peças em Estoque</div>
              <div className="text-lg font-bold text-slate-900">
                {dashboard?.counts.productsInStock ?? 0} un.
              </div>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-400" />
        </Link>

        <Link
          to="/financeiro"
          className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm hover:border-emerald-500 transition flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-emerald-600" />
            <div>
              <div className="text-xs text-slate-500">Total Faturado</div>
              <div className="text-lg font-bold text-emerald-700">
                {formatBRL(t?.totalFaturado)}
              </div>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-400" />
        </Link>

        <Link
          to="/despesas"
          className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm hover:border-emerald-500 transition flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <div>
              <div className="text-xs text-slate-500">Contas Pendentes</div>
              <div className="text-lg font-bold text-amber-700">
                {dashboard?.counts.pendingBillsCount ?? 0} contas
              </div>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-400" />
        </Link>
      </div>

      {/* Últimas Vendas Registradas (Tempo Real) */}
      <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 id="recent-sales-caption" className="font-bold text-slate-900">
              Últimas Vendas Registradas no Período
            </h3>
            <p className="text-xs text-slate-500">
              Atualizado automaticamente via WebSocket quando o celular ou PC registra uma venda
            </p>
          </div>
          <Link
            to="/vendas"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Ver todas as vendas →
          </Link>
        </div>

        <div
          tabIndex={0}
          role="region"
          aria-labelledby="recent-sales-caption"
          className="table-wrapper"
        >
          <table className="text-left text-xs sm:text-sm">
            <thead className="bg-emerald-900 text-white text-xs uppercase">
              <tr>
                <th className="py-3 px-4">Produto</th>
                <th className="py-3 px-3">Data</th>
                <th className="py-3 px-3">Bairro</th>
                <th className="py-3 px-3 text-right">Valor Bruto</th>
                <th className="py-3 px-3 text-right">Vendas (Líq.)</th>
                <th className="py-3 px-3 text-right">Estoque</th>
                <th className="py-3 px-3 text-right">Moto</th>
                <th className="py-3 px-3">Pagamento</th>
                <th className="py-3 px-4 text-right">Diferença</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Nenhuma venda encontrada para o período selecionado.
                  </td>
                </tr>
              ) : (
                recentSales.map((s) => (
                  <tr key={s.id} className="hover:bg-emerald-50/40">
                    <th className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {s.productName}
                    </th>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                      {formatDateBR(s.saleDate)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-700">
                      {s.neighborhood}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {formatBRL(s.grossValue)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-700 whitespace-nowrap">
                      {formatBRL(s.netSaleValue)}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap text-slate-600">
                      {formatBRL(s.stockValue)}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap text-slate-600">
                      {formatBRL(s.deliveryFee)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs font-medium">
                        {s.paymentMethod}
                      </span>
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-bold whitespace-nowrap ${
                        s.difference >= 0 ? "text-emerald-700" : "text-rose-600"
                      }`}
                    >
                      {formatBRL(s.difference)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
