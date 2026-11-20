import React, { useEffect, useState } from "react";
import { ShieldCheck, Printer, Sparkles, Trash2, Check, FileText } from "lucide-react";
import { apiFetch, formatBRL, formatDateBR, toISODateInput } from "../lib/api";
import { useRealtime } from "../context/RealtimeContext";

interface WarrantyReceiptRecord {
  id: number;
  saleId: number | null;
  companyName: string;
  companyCnpj: string;
  companyPhone1: string;
  companyPhone2: string;
  companyStreet: string;
  customerCpf: string | null;
  customerName: string;
  customerPhone: string | null;
  street: string | null;
  streetNumber: string | null;
  neighborhood: string | null;
  city: string;
  purchaseDate: string;
  paymentMethod: string;
  paymentDetail: string | null;
  totalAmount: number;
  warrantyText: string;
  items: {
    id: number;
    quantity: number;
    model: string;
    cashPrice: number;
    cardFee: number;
    freight: number;
    totalPrice: number;
  }[];
}

interface RecentSaleOption {
  id: number;
  saleDate: string;
  neighborhood: string;
  quantity: number;
  productName: string;
  grossValue: number;
  netSaleValue: number;
  deliveryFee: number;
  paymentMethod: string;
}

export const GarantiaPage: React.FC = () => {
  const { syncVersion, triggerManualSync } = useRealtime();

  const [warranties, setWarranties] = useState<WarrantyReceiptRecord[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSaleOption[]>([]);
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyReceiptRecord | null>(null);
  const [selectedSaleId, setSelectedSaleId] = useState<string>("");
  const [feedback, setFeedback] = useState<string | null>(null);

  // Campos do formulário de emissão
  const [wCustomerName, setWCustomerName] = useState("");
  const [wCustomerCpf, setWCustomerCpf] = useState("");
  const [wCustomerPhone, setWCustomerPhone] = useState("");
  const [wStreet, setWStreet] = useState("");
  const [wNeighborhood, setWNeighborhood] = useState("");
  const [wCity, setWCity] = useState("JOINVILLE");
  const [wPurchaseDate, setWPurchaseDate] = useState(toISODateInput());
  const [wPaymentMethod, setWPaymentMethod] = useState("PIX");
  const [wPaymentDetail, setWPaymentDetail] = useState("PIX MASTER-47891653000171");
  const [wQuantity, setWQuantity] = useState("1");
  const [wModel, setWModel] = useState("");
  const [wCashPrice, setWCashPrice] = useState("");
  const [wCardFee, setWCardFee] = useState("0");
  const [wFreight, setWFreight] = useState("0");

  useEffect(() => {
    let active = true;
    async function loadWarrantyData() {
      const [warRes, salesRes] = await Promise.allSettled([
        apiFetch<WarrantyReceiptRecord[]>("/warranties"),
        apiFetch<{ sales: RecentSaleOption[] }>("/sales")
      ]);
      if (!active) return;

      if (warRes.status === "fulfilled") {
        setWarranties(warRes.value);
        setSelectedWarranty((prev) => {
          if (prev) {
            const updated = warRes.value.find((w) => w.id === prev.id);
            if (updated) return updated;
          }
          return warRes.value[0] ?? null;
        });
      }

      if (salesRes.status === "fulfilled") {
        setRecentSales(salesRes.value.sales.slice(0, 80));
      }
    }
    loadWarrantyData();
    return () => {
      active = false;
    };
  }, [syncVersion]);

  const handlePullFromRecentSale = (saleIdStr: string) => {
    setSelectedSaleId(saleIdStr);
    if (!saleIdStr) return;

    const sale = recentSales.find((s) => String(s.id) === saleIdStr);
    if (!sale) return;

    setWModel(sale.productName);
    setWQuantity(String(sale.quantity || 1));
    setWCashPrice(String(sale.grossValue || sale.netSaleValue || 0));
    setWPaymentMethod(sale.paymentMethod || "PIX");
    setWFreight(String(sale.deliveryFee || 0));
    setWNeighborhood(sale.neighborhood && sale.neighborhood !== "LOCAL" ? sale.neighborhood : "");
    if (sale.saleDate) {
      setWPurchaseDate(sale.saleDate.slice(0, 10));
    }

    // Se Valor Líquido for maior que Bruto por acréscimo de cartão, preenche a diferença como Taxa Cartão
    const diffFee = Number((sale.netSaleValue - sale.grossValue).toFixed(2));
    setWCardFee(diffFee > 0 ? String(diffFee) : "0");
  };

  const handleCreateWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await apiFetch<WarrantyReceiptRecord>("/warranties", {
        method: "POST",
        body: JSON.stringify({
          saleId: selectedSaleId ? Number(selectedSaleId) : null,
          customerName: wCustomerName,
          customerCpf: wCustomerCpf,
          customerPhone: wCustomerPhone,
          street: wStreet,
          neighborhood: wNeighborhood,
          city: wCity,
          purchaseDate: `${wPurchaseDate}T12:00:00.000Z`,
          paymentMethod: wPaymentMethod,
          paymentDetail: wPaymentDetail,
          items: [
            {
              quantity: Number(wQuantity) || 1,
              model: wModel,
              cashPrice: Number(wCashPrice) || 0,
              cardFee: Number(wCardFee) || 0,
              freight: Number(wFreight) || 0
            }
          ]
        })
      });

      setSelectedWarranty(created);
      setWCustomerName("");
      setWCustomerCpf("");
      setWCustomerPhone("");
      setWStreet("");
      setFeedback(`Termo de Garantia #${created.id} emitido com sucesso!`);
      setTimeout(() => setFeedback(null), 4000);
      triggerManualSync();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao emitir termo de garantia.");
    }
  };

  const handleDeleteWarranty = async (id: number) => {
    if (!window.confirm("Deseja realmente excluir este Termo de Garantia?")) return;
    try {
      await apiFetch(`/warranties/${id}`, { method: "DELETE" });
      if (selectedWarranty?.id === id) {
        setSelectedWarranty(null);
      }
      triggerManualSync();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao excluir garantia.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho (oculto na impressão via .no-print) */}
      <div className="no-print bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Emissão e Impressão de Termo de Garantia (90 Dias)
            </h2>
            <p className="text-xs text-slate-500">
              Puxe dados diretamente de uma venda recente ou preencha abaixo e imprima em folha limpa A4
            </p>
          </div>
        </div>

        {selectedWarranty && (
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold shadow-md transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Termo Selecionado (#{selectedWarranty.id})</span>
          </button>
        )}
      </div>

      {feedback && (
        <div
          role="status"
          className="no-print bg-emerald-600 text-white px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
        >
          <Check className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: FORMULÁRIO DE EMISSÃO + HISTÓRICO (OCULTO NA IMPRESSÃO) */}
        <div className="no-print lg:col-span-5 space-y-5">
          <form
            onSubmit={handleCreateWarranty}
            className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-emerald-950 text-sm uppercase flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Emitir Novo Termo de Garantia</span>
              </h3>
            </div>

            {/* Seletor Inteligente: Puxar dados de uma venda recente */}
            <div className="bg-emerald-50/90 border border-emerald-300 rounded-xl p-3.5 space-y-1.5">
              <label
                htmlFor="pull-recent-sale"
                className="flex items-center gap-1.5 text-xs font-extrabold uppercase text-emerald-900"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Puxar dados de uma venda recente (Auto-Preencher)</span>
              </label>
              <select
                id="pull-recent-sale"
                value={selectedSaleId}
                onChange={(e) => handlePullFromRecentSale(e.target.value)}
                className="w-full border border-emerald-400 rounded-lg px-3 py-2 text-xs font-semibold bg-white text-slate-900"
              >
                <option value="">-- Selecionar venda lançada para preencher produto e valores --</option>
                {recentSales.map((s) => (
                  <option key={s.id} value={s.id}>
                    [{formatDateBR(s.saleDate)}] {s.productName} — {formatBRL(s.grossValue)} (
                    {s.paymentMethod} • {s.neighborhood})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo do Cliente *
                </label>
                <input
                  type="text"
                  required
                  value={wCustomerName}
                  onChange={(e) => setWCustomerName(e.target.value)}
                  placeholder="Ex: JOÃO CARLOS DA SILVA"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CPF / CNPJ do Cliente
                </label>
                <input
                  type="text"
                  value={wCustomerCpf}
                  onChange={(e) => setWCustomerCpf(e.target.value)}
                  placeholder="Ex: 000.000.000-00"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={wCustomerPhone}
                  onChange={(e) => setWCustomerPhone(e.target.value)}
                  placeholder="Ex: (47) 99634-8663"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rua / Logradouro e Número
                </label>
                <input
                  type="text"
                  value={wStreet}
                  onChange={(e) => setWStreet(e.target.value)}
                  placeholder="Ex: RUA HERACLITO LOBATO, 145"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bairro</label>
                <input
                  type="text"
                  value={wNeighborhood}
                  onChange={(e) => setWNeighborhood(e.target.value)}
                  placeholder="Ex: AVENTUREIRO"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cidade</label>
                <input
                  type="text"
                  value={wCity}
                  onChange={(e) => setWCity(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                />
              </div>

              <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-emerald-900 mb-1">
                  Modelo do Aparelho / Produto (com GB, RAM, Cor ou IMEI) *
                </label>
                <input
                  type="text"
                  required
                  value={wModel}
                  onChange={(e) => setWModel(e.target.value)}
                  placeholder="Ex: POCO C85 256GB 8GB RAM ROXO"
                  className="w-full border border-emerald-400 rounded-lg px-3 py-2 text-xs bg-white font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantidade *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={wQuantity}
                  onChange={(e) => setWQuantity(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Valor à Vista Unit. (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={wCashPrice}
                  onChange={(e) => setWCashPrice(e.target.value)}
                  placeholder="Ex: 1150.00"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Taxa Cartão (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={wCardFee}
                  onChange={(e) => setWCardFee(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Frete / Entrega (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={wFreight}
                  onChange={(e) => setWFreight(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data da Compra *
                </label>
                <input
                  type="date"
                  required
                  value={wPurchaseDate}
                  onChange={(e) => setWPurchaseDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Forma de Pagamento
                </label>
                <input
                  type="text"
                  value={wPaymentMethod}
                  onChange={(e) => setWPaymentMethod(e.target.value)}
                  placeholder="Ex: PIX / CARTÃO 12X"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white font-semibold"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Detalhe / Chave Recebedora
                </label>
                <input
                  type="text"
                  value={wPaymentDetail}
                  onChange={(e) => setWPaymentDetail(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold shadow-sm transition cursor-pointer"
            >
              Gerar Termo de Garantia e Visualizar ao Lado
            </button>
          </form>

          {/* Lista de Garantias Emitidas Recentemente */}
          <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-sm space-y-2.5">
            <h4 className="text-xs font-bold uppercase text-slate-700">
              Termos de Garantia Emitidos ({warranties.length})
            </h4>
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {warranties.map((w) => (
                <div
                  key={w.id}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs transition ${
                    selectedWarranty?.id === w.id
                      ? "bg-emerald-800 border-emerald-800 text-white font-semibold"
                      : "bg-slate-50 hover:bg-emerald-50 border-slate-200 text-slate-800"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedWarranty(w)}
                    className="flex-1 text-left cursor-pointer"
                  >
                    <div className="font-bold">
                      #{w.id} • {w.customerName}
                    </div>
                    <div
                      className={`text-[11px] ${
                        selectedWarranty?.id === w.id ? "text-emerald-200" : "text-slate-500"
                      }`}
                    >
                      {formatDateBR(w.purchaseDate)} — {w.items[0]?.model} •{" "}
                      {formatBRL(w.totalAmount)}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteWarranty(w.id)}
                    title="Excluir termo"
                    className={`p-1.5 rounded-lg cursor-pointer ${
                      selectedWarranty?.id === w.id
                        ? "hover:bg-emerald-900 text-emerald-200"
                        : "hover:bg-rose-100 text-rose-600"
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: DOCUMENTO DO TERMO DE GARANTIA (#printable-warranty) */}
        <div className="lg:col-span-7">
          {selectedWarranty ? (
            <div
              id="printable-warranty"
              className="bg-white border-2 border-slate-300 rounded-2xl p-6 sm:p-8 space-y-6 text-xs text-slate-900 shadow-sm"
            >
              {/* Cabeçalho Corporativo BigShop Importados */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-emerald-800 pb-5">
                <div className="space-y-1">
                  <div className="inline-block px-2.5 py-0.5 rounded bg-emerald-800 text-white text-[10px] font-extrabold uppercase tracking-wider mb-1">
                    Recibo de Compra & Termo de Garantia Legal (90 Dias)
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                    {selectedWarranty.companyName}
                  </h1>
                  <p className="text-xs font-semibold text-slate-700">
                    CNPJ: {selectedWarranty.companyCnpj}
                  </p>
                  <p className="text-xs text-slate-600">{selectedWarranty.companyStreet}</p>
                  <p className="text-xs font-semibold text-emerald-800">
                    WhatsApp / Atendimento: {selectedWarranty.companyPhone1} /{" "}
                    {selectedWarranty.companyPhone2}
                  </p>
                </div>

                <div className="text-right space-y-1.5">
                  <div className="bg-slate-100 border border-slate-300 rounded-xl px-4 py-2.5">
                    <div className="text-[10px] font-bold uppercase text-slate-500">
                      Nº do Termo / Controle
                    </div>
                    <div className="text-lg font-black text-slate-900">
                      #{String(selectedWarranty.id).padStart(4, "0")}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-700">
                      Data: {formatDateBR(selectedWarranty.purchaseDate)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="no-print inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir Folha Limpa</span>
                  </button>
                </div>
              </div>

              {/* Quadro de Identificação do Cliente */}
              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 font-extrabold text-[11px] uppercase tracking-wider text-slate-800">
                  1. Dados do Cliente / Comprador
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
                  <div>
                    <span className="font-bold text-slate-600">CLIENTE:</span>{" "}
                    <strong className="text-slate-900 uppercase">
                      {selectedWarranty.customerName}
                    </strong>
                  </div>
                  <div>
                    <span className="font-bold text-slate-600">CPF / CNPJ:</span>{" "}
                    <span className="font-semibold text-slate-900">
                      {selectedWarranty.customerCpf || "Não informado"}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-600">TELEFONE:</span>{" "}
                    <span className="font-semibold text-slate-900">
                      {selectedWarranty.customerPhone || "Não informado"}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-600">DATA DA COMPRA:</span>{" "}
                    <strong className="text-slate-900">
                      {formatDateBR(selectedWarranty.purchaseDate)}
                    </strong>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="font-bold text-slate-600">ENDEREÇO DE ENTREGA:</span>{" "}
                    <span className="font-semibold text-slate-900 uppercase">
                      {selectedWarranty.street || "Retirada Balcão / Local"}
                      {selectedWarranty.neighborhood ? ` — Bairro ${selectedWarranty.neighborhood}` : ""}
                      {selectedWarranty.city ? ` (${selectedWarranty.city})` : ""}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabela de Produtos / Aparelhos */}
              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 font-extrabold text-[11px] uppercase tracking-wider text-slate-800">
                  2. Discriminação do Produto / Aparelho Adquirido
                </div>
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-300 text-[11px] uppercase text-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-14">Qtd</th>
                      <th className="py-2.5 px-3">Descrição / Modelo do Produto</th>
                      <th className="py-2.5 px-3 text-right">Valor à Vista</th>
                      <th className="py-2.5 px-3 text-right">Taxa Cartão</th>
                      <th className="py-2.5 px-3 text-right">Frete</th>
                      <th className="py-2.5 px-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedWarranty.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3 px-3 text-center font-bold">{item.quantity}</td>
                        <td className="py-3 px-3 font-extrabold text-slate-900 uppercase">
                          {item.model}
                        </td>
                        <td className="py-3 px-3 text-right">{formatBRL(item.cashPrice)}</td>
                        <td className="py-3 px-3 text-right">{formatBRL(item.cardFee)}</td>
                        <td className="py-3 px-3 text-right">{formatBRL(item.freight)}</td>
                        <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                          {formatBRL(item.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Resumo Financeiro do Recibo */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50 border-2 border-emerald-700/40 p-4 rounded-xl">
                <div className="space-y-0.5">
                  <div>
                    <span className="font-bold text-slate-700">FORMA DE PAGAMENTO:</span>{" "}
                    <strong className="text-emerald-950 uppercase">
                      {selectedWarranty.paymentMethod}
                    </strong>
                  </div>
                  {selectedWarranty.paymentDetail && (
                    <div className="text-[11px] text-slate-600">
                      Identificação / Recebedor: <strong>{selectedWarranty.paymentDetail}</strong>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase text-emerald-800">
                    Valor Total Pago
                  </div>
                  <div className="text-xl font-black text-emerald-950">
                    {formatBRL(selectedWarranty.totalAmount)}
                  </div>
                </div>
              </div>

              {/* Condições e Termos de Garantia Legal de 90 Dias */}
              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 font-extrabold text-[11px] uppercase tracking-wider text-slate-800">
                  3. Condições do Termo de Garantia (90 Dias — Art. 26 CDC)
                </div>
                <div className="p-4 text-[11px] leading-relaxed text-slate-800 space-y-2 text-justify">
                  <p className="font-semibold">{selectedWarranty.warrantyText}</p>
                  <p className="text-slate-600">
                    • É indispensável a apresentação deste Termo de Garantia e da caixa original com
                    todos os acessórios intactos para qualquer acionamento de suporte técnico. A
                    garantia cobre exclusivamente defeitos de fabricação pelo prazo de 90 (noventa)
                    dias corridos a partir da data da compra ({formatDateBR(selectedWarranty.purchaseDate)}).
                  </p>
                </div>
              </div>

              {/* Linhas de Assinatura para Impressão */}
              <div className="pt-10 pb-2 grid grid-cols-2 gap-8 text-center">
                <div className="border-t border-slate-400 pt-2">
                  <div className="font-bold text-slate-900 uppercase">
                    {selectedWarranty.companyName}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    CNPJ {selectedWarranty.companyCnpj} — Vendedor / Responsável
                  </div>
                </div>
                <div className="border-t border-slate-400 pt-2">
                  <div className="font-bold text-slate-900 uppercase">
                    {selectedWarranty.customerName}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Declaro estar ciente e de acordo com os termos de garantia acima
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-emerald-100 rounded-2xl p-10 text-center text-slate-500">
              Preencha o formulário ao lado para gerar e visualizar o Termo de Garantia.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
