"use client";

import { ChevronDown, ChevronUp, Replace, Search, X } from "lucide-react";

type SearchPanelProps = {
  open: boolean;
  query: string;
  replacement: string;
  matchCase: boolean;
  current: number;
  total: number;
  onQuery: (value: string) => void;
  onReplacement: (value: string) => void;
  onMatchCase: (value: boolean) => void;
  onNext: () => void;
  onPrevious: () => void;
  onReplace: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
};

export default function SearchPanel({
  open,
  query,
  replacement,
  matchCase,
  current,
  total,
  onQuery,
  onReplacement,
  onMatchCase,
  onNext,
  onPrevious,
  onReplace,
  onReplaceAll,
  onClose,
}: SearchPanelProps) {
  if (!open) return null;
  return (
    <div className="search-panel" role="search" aria-label="搜尋與取代">
      <div className="search-row">
        <Search size={14} />
        <input
          autoFocus
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              if (event.shiftKey) onPrevious();
              else onNext();
            }
            if (event.key === "Escape") onClose();
          }}
          placeholder="搜尋文字"
          aria-label="搜尋文字"
        />
        <span>{total ? `${current + 1}/${total}` : "0/0"}</span>
        <button type="button" onClick={onPrevious} disabled={!total} title="上一筆"><ChevronUp size={14} /></button>
        <button type="button" onClick={onNext} disabled={!total} title="下一筆"><ChevronDown size={14} /></button>
        <button
          type="button"
          className={matchCase ? "active" : ""}
          onClick={() => onMatchCase(!matchCase)}
          title="區分大小寫"
          aria-pressed={matchCase}
        >Aa</button>
        <button type="button" onClick={onClose} title="關閉"><X size={14} /></button>
      </div>
      <div className="search-row replace-row">
        <Replace size={14} />
        <input
          value={replacement}
          onChange={(event) => onReplacement(event.target.value)}
          placeholder="取代為"
          aria-label="取代文字"
        />
        <button type="button" onClick={onReplace} disabled={!total}>取代</button>
        <button type="button" onClick={onReplaceAll} disabled={!total}>全部取代</button>
      </div>
    </div>
  );
}
