import React, { useEffect, useRef, useState } from "react";
import { FileSpreadsheet, Upload, Check, X, AlertCircle, Package, ShoppingCart } from "lucide-react";
import { apiFetch, formatBRL, formatDateBR } from "../lib/api";

interface ParsedProductPreview {
  name: string;
  category: string;
  quantity: number;
  costPrice: number;
  salePrice: number;
  action: "CREATE" | "UPDATE";
}

interface ParsedSalePreview {
  saleDate: string;
  tabName: string;
  neighborhood: string;
  quantity: number;
  productName: string;
  grossValue: number;
  secondaryNetValue: number;
  netSaleValue: number;
  stockValue: number;
  extraValue: number;
  deliveryFee: number;
  paymentMethod: string;
  cooperValue: number;
  ricocheteValue: number;
  difference: number;
}

interface PreviewResponse {
  fileName: string;
  sheetsFound: string[];
  summary: {
    productsCount: number;
    productsToCreate: number;
    productsToUpdate: number;
    salesCount: number;
    salesTotalNet: number;
  };
  productsPreview: ParsedProductPreview[];
  salesPreview: ParsedSalePreview[];
}

interface ImportXlsxModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTarget?: "estoque" | "vendas" | "auto";
  defaultYear?: string;
  defaultMonth?: string;
  onSuccess: (message: string) => void;
}

export const ImportXlsxModal: React.FC<ImportXlsxModalProps> = ({
  isOpen,
  onClose,
  defaultTarget = "auto",
  defaultYear = "2026",
  defaultMonth = "10",
  onSuccess
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [target, setTarget] = useState<"estoque" | "vendas" | "auto">(defaultTarget);
  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);
  const [fileName, setFileName] = useState<string>("");
  const [fileBase64, setFileBase64] = useState<string>("");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      setTarget(defaultTarget);
      setYear(defaultYear);
      setMonth(defaultMonth);
      setError(null);
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen, defaultTarget, defaultYear, defaultMonth]);

  const handleReset = () => {
    setFileName("");
    setFileBase64("");
    setPreview(null);
    setError(null);
  };

  const runPreview = async (
    base64Data: string,
    name: string,
    selectedTarget: "estoque" | "vendas" | "auto",
    selectedYear: string,
    selectedMonth: string
  ) => {
    try {
      setLoadingPreview(true);
      setError(null);
      const res = await apiFetch<PreviewResponse>("/import/xlsx", {
        method: "POST",
        body: JSON.stringify({
          fileName: name,
          fileBase64: base64Data,
          mode: "preview",
          target: selectedTarget,
          year: Number(selectedYear) || 2026,
          month: Number(selectedMonth) || 10
        })
      });
      setPreview(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao analisar planilha .xlsx.");
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      setFileBase64(result);
      runPreview(result, file.name, target, year, month);
    };
    reader.onerror = () => {
      setError("Não foi possível ler o arquivo selecionado.");
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmCommit = async () => {
    if (!fileBase64) return;
    try {
      setCommitting(true);
      setError(null);
      const res = await apiFetch<{ message: string }>("/import/xlsx", {
        method: "POST",
        body: JSON.stringify({
          fileName,
          fileBase64,
          mode: "commit",
          target,
          year: Number(year) || 2026,
          month: Number(month) || 10
        })
      });
      handleReset();
      onClose();
      onSuccess(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao importar planilha no banco.");
    } finally {
      setCommitting(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="import-xlsx-modal-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className="w-full max-w-4xl rounded-3xl border border-emerald-200 bg-white p-0 shadow-2xl m-auto"
    >
      <div className="bg-emerald-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 id="import-xlsx-modal-title" className="text-base font-extrabold">
              Importar Planilha Excel (.xlsx) — Estoque & Histórico de Vendas
            </h2>
            <p className="text-xs text-emerald-200">
              Compatível com FINANCEIRA 10 OUTUBRO.xlsx (aba Estoque) e ARQUIVO MORTO 10 Outubro.xlsx (abas DD-MM)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar modal de importação"
          className="p-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-emerald-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
        {/* Opções de escopo e arquivo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4">
          <div>
            <label
              htmlFor="import-target-select"
              className="block text-xs font-bold uppercase text-emerald-950 mb-1"
            >
              O que importar da planilha
            </label>
            <select
              id="import-target-select"
              value={target}
              onChange={(e) => {
                const nextTarget = e.target.value as "estoque" | "vendas" | "auto";
                setTarget(nextTarget);
                if (fileBase64) runPreview(fileBase64, fileName, nextTarget, year, month);
              }}
              className="w-full border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold bg-white"
            >
              <option value="auto">Detectar Automaticamente (Estoque + Vendas)</option>
              <option value="estoque">Somente Produtos do Estoque</option>
              <option value="vendas">Somente Histórico de Vendas (Abas DD-MM)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="import-year-select"
              className="block text-xs font-bold uppercase text-emerald-950 mb-1"
            >
              Ano de Referência (Vendas)
            </label>
            <select
              id="import-year-select"
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                if (fileBase64) runPreview(fileBase64, fileName, target, e.target.value, month);
              }}
              className="w-full border border-emerald-300 rounded-xl px-3 py-2 text-xs font-bold bg-white"
            >
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="import-file-input"
              className="block text-xs font-bold uppercase text-emerald-950 mb-1"
            >
              Selecionar Arquivo .xlsx *
            </label>
            <label
              htmlFor="import-file-input"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer shadow-sm transition"
            >
              <Upload className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {fileName ? fileName : "Escolher Planilha (.xlsx)"}
              </span>
            </label>
            <input
              id="import-file-input"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              className="sr-only"
            />
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loadingPreview && (
          <div className="py-10 text-center text-sm font-bold text-emerald-800 animate-pulse">
            Lendo abas e pré-visualizando dados da planilha .xlsx...
          </div>
        )}

        {preview && !loadingPreview && (
          <div className="space-y-4">
            {/* Resumo das abas e contadores */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <div className="text-[11px] font-bold uppercase text-slate-500">
                  Abas Encontradas ({preview.sheetsFound.length})
                </div>
                <div className="text-xs font-semibold text-slate-800 mt-1 line-clamp-2">
                  {preview.sheetsFound.join(", ")}
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-3">
                <Package className="w-7 h-7 text-emerald-700 shrink-0" />
                <div>
                  <div className="text-[11px] font-bold uppercase text-emerald-800">
                    Produtos Reconhecidos
                  </div>
                  <div className="text-base font-extrabold text-emerald-950">
                    {preview.summary.productsCount} itens{" "}
                    <span className="text-xs font-semibold text-emerald-700">
                      ({preview.summary.productsToCreate} novos / {preview.summary.productsToUpdate} atualizações)
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-3">
                <ShoppingCart className="w-7 h-7 text-emerald-700 shrink-0" />
                <div>
                  <div className="text-[11px] font-bold uppercase text-emerald-800">
                    Vendas Reconhecidas
                  </div>
                  <div className="text-base font-extrabold text-emerald-950">
                    {preview.summary.salesCount} vendas{" "}
                    <span className="text-xs font-semibold text-emerald-700">
                      ({formatBRL(preview.summary.salesTotalNet)})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pré-visualização de Produtos */}
            {preview.productsPreview.length > 0 && (
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-2.5 text-xs font-extrabold uppercase text-slate-800">
                  Pré-visualização de Produtos do Estoque ({preview.productsPreview.length})
                </div>
                <div className="max-h-52 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[11px]">
                      <tr>
                        <th className="py-2 px-3">Ação</th>
                        <th className="py-2 px-3">Produto / Modelo</th>
                        <th className="py-2 px-3">Categoria</th>
                        <th className="py-2 px-3 text-center">Qtd</th>
                        <th className="py-2 px-3 text-right">Valor (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preview.productsPreview.slice(0, 60).map((p, idx) => (
                        <tr key={idx} className="hover:bg-emerald-50/40">
                          <td className="py-1.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                p.action === "CREATE"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-900"
                              }`}
                            >
                              {p.action === "CREATE" ? "NOVO" : "ATUALIZAR"}
                            </span>
                          </td>
                          <td className="py-1.5 px-3 font-bold text-slate-900">{p.name}</td>
                          <td className="py-1.5 px-3 text-slate-600">{p.category}</td>
                          <td className="py-1.5 px-3 text-center font-bold">{p.quantity}</td>
                          <td className="py-1.5 px-3 text-right font-semibold">
                            {formatBRL(p.salePrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pré-visualização de Vendas */}
            {preview.salesPreview.length > 0 && (
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-2.5 text-xs font-extrabold uppercase text-slate-800">
                  Pré-visualização de Vendas / Arquivo Morto ({preview.salesPreview.length})
                </div>
                <div className="max-h-52 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[11px]">
                      <tr>
                        <th className="py-2 px-3">Data / Aba</th>
                        <th className="py-2 px-3">Bairro</th>
                        <th className="py-2 px-3 text-center">Qtd</th>
                        <th className="py-2 px-3">Produto</th>
                        <th className="py-2 px-3 text-right">Bruto</th>
                        <th className="py-2 px-3 text-right">Líquido</th>
                        <th className="py-2 px-3">Pagamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preview.salesPreview.slice(0, 80).map((s, idx) => (
                        <tr key={idx} className="hover:bg-emerald-50/40">
                          <td className="py-1.5 px-3 font-semibold text-slate-700">
                            {formatDateBR(s.saleDate)} ({s.tabName})
                          </td>
                          <td className="py-1.5 px-3 text-slate-600">{s.neighborhood}</td>
                          <td className="py-1.5 px-3 text-center font-bold">{s.quantity}</td>
                          <td className="py-1.5 px-3 font-bold text-slate-900">{s.productName}</td>
                          <td className="py-1.5 px-3 text-right">{formatBRL(s.grossValue)}</td>
                          <td className="py-1.5 px-3 text-right font-bold text-emerald-700">
                            {formatBRL(s.netSaleValue + (s.secondaryNetValue || 0))}
                          </td>
                          <td className="py-1.5 px-3 text-slate-600">{s.paymentMethod}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rodapé do Modal */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={
              committing ||
              !preview ||
              (preview.summary.productsCount === 0 && preview.summary.salesCount === 0)
            }
            onClick={handleConfirmCommit}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold shadow-md transition cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>
              {committing
                ? "Importando no SQLite..."
                : "Confirmar e Importar Planilha no Sistema"}
            </span>
          </button>
        </div>
      </div>
    </dialog>
  );
};
