import React, { useEffect, useId, useRef, useState } from "react";
import { Search, MapPin, Package, X } from "lucide-react";

export const JOINVILLE_NEIGHBORHOODS: string[] = [
  "LOCAL",
  "ADHEMAR GARCIA",
  "AMÉRICA",
  "ANITA GARIBALDI",
  "ARAQUARI",
  "ATIRADORES",
  "AVENTUREIRO",
  "BOA VISTA",
  "BOEHMERWALD",
  "BOM RETIRO",
  "BUCAREIN",
  "CENTRO",
  "COMASA",
  "COSTA E SILVA",
  "DONA FRANCISCA",
  "ESPINHEIROS",
  "FÁTIMA",
  "FLORESTA",
  "GLÓRIA",
  "GUANABARA",
  "IRIRIÚ",
  "ITAUM",
  "ITINGA",
  "JARDIM IRIRIÚ",
  "JARDIM PARAÍSO",
  "JARDIM SOPHIA",
  "JARIVATUBA",
  "JOÃO COSTA",
  "MORRO DO MEIO",
  "MUTHUAN",
  "NOVA BRASÍLIA",
  "PARANAGUAMIRIM",
  "PARQUE GUARANI",
  "PETRÓPOLIS",
  "PIRABEIRABA",
  "PROFIPO",
  "RIO BONITO",
  "SAGUAÇU",
  "SANTA CATARINA",
  "SANTO ANTÔNIO",
  "SÃO FRANCISCO DO SUL (SFS)",
  "SÃO MARCOS",
  "ULYSSES GUIMARÃES",
  "VILA CUBATÃO",
  "VILA NOVA",
  "ZONA INDUSTRIAL NORTE",
  "ZONA INDUSTRIAL TUPY"
];

export interface AutocompleteOption<T = unknown> {
  id: string | number;
  label: string;
  sublabel?: string;
  badgeText?: string;
  badgeColor?: string;
  data?: T;
}

interface GoogleAutocompleteProps<T = unknown> {
  id?: string;
  name?: string;
  label?: string;
  required?: boolean;
  value: string;
  onChange: (text: string) => void;
  onSelectOption: (option: AutocompleteOption<T>) => void;
  options: AutocompleteOption<T>[];
  placeholder?: string;
  iconType?: "search" | "location" | "product";
  emptyMessage?: string;
  uppercase?: boolean;
}

function normalizeText(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function GoogleAutocomplete<T = unknown>({
  id,
  name,
  label,
  required,
  value,
  onChange,
  onSelectOption,
  options,
  placeholder = "Pesquisar...",
  iconType = "search",
  emptyMessage = "Nenhuma sugestão encontrada.",
  uppercase = false
}: GoogleAutocompleteProps<T>) {
  const generatedId = useId();
  const inputId = id || `autocomplete-${generatedId}`;
  const listboxId = `listbox-${generatedId}`;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const normalizedQuery = normalizeText(value.trim());

  const filteredOptions = options
    .filter((opt) => {
      if (!normalizedQuery) return true;
      const normLabel = normalizeText(opt.label);
      const normSub = opt.sublabel ? normalizeText(opt.sublabel) : "";
      return normLabel.includes(normalizedQuery) || normSub.includes(normalizedQuery);
    })
    .slice(0, 12);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((prev) =>
          filteredOptions.length > 0 ? (prev + 1) % filteredOptions.length : -1
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (isOpen && filteredOptions.length > 0) {
        setHighlightedIndex((prev) =>
          prev <= 0 ? filteredOptions.length - 1 : prev - 1
        );
      }
    } else if (e.key === "Enter" && isOpen && highlightedIndex >= 0) {
      const target = filteredOptions[highlightedIndex];
      if (target) {
        e.preventDefault();
        onSelectOption(target);
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const renderLeadingIcon = (cls = "w-4 h-4 text-slate-400") => {
    if (iconType === "location") return <MapPin className={cls} />;
    if (iconType === "product") return <Package className={cls} />;
    return <Search className={cls} />;
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-bold text-slate-700 mb-1">
          {label} {required ? "*" : ""}
        </label>
      )}

      <div className="relative flex items-center">
        <span className="absolute left-3.5 pointer-events-none">
          {renderLeadingIcon("w-4 h-4 text-emerald-600")}
        </span>

        <input
          id={inputId}
          name={name}
          type="text"
          required={required}
          value={value}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          className={`w-full pl-10 pr-9 py-2.5 border border-slate-300 focus:border-emerald-600 bg-white text-sm sm:text-base font-semibold transition shadow-xs ${
            isOpen && filteredOptions.length > 0
              ? "rounded-t-2xl border-b-slate-200"
              : "rounded-xl"
          } ${uppercase ? "uppercase" : ""}`}
        />

        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(true);
              setHighlightedIndex(-1);
            }}
            aria-label="Limpar campo"
            className="absolute right-2.5 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown flutuante estilo Google Search */}
      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-40 left-0 right-0 bg-white border border-t-0 border-emerald-500 rounded-b-2xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100"
        >
          {filteredOptions.length === 0 ? (
            <li className="px-4 py-3 text-xs text-slate-400 italic">{emptyMessage}</li>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isHighlighted = idx === highlightedIndex;
              return (
                <li
                  key={opt.id}
                  role="option"
                  aria-selected={isHighlighted}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelectOption(opt);
                    setIsOpen(false);
                    setHighlightedIndex(-1);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition ${
                    isHighlighted ? "bg-emerald-50 text-emerald-950" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="shrink-0">
                      {renderLeadingIcon("w-4 h-4 text-slate-400")}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {opt.label}
                      </div>
                      {opt.sublabel && (
                        <div className="text-[11px] text-slate-500 truncate">{opt.sublabel}</div>
                      )}
                    </div>
                  </div>

                  {opt.badgeText && (
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold shrink-0 ${
                        opt.badgeColor || "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {opt.badgeText}
                    </span>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
