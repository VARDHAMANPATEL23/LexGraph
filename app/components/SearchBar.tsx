"use client";

import { useState, FormEvent } from "react";

interface Props {
  onSearch: (word: string) => void;
  loading: boolean;
}

export default function SearchBar({ onSearch, loading }: Props) {
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) onSearch(trimmed);
  }

  return (
    <form className="search-form" onSubmit={handleSubmit} role="search">
      <div className="search-inner">
        <span className="search-icon" aria-hidden>⌕</span>
        <input
          id="word-search"
          className="search-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter a word…"
          autoComplete="off"
          spellCheck={false}
          disabled={loading}
          aria-label="Search word"
        />
        <button
          id="search-submit"
          className="search-btn"
          type="submit"
          disabled={loading || !value.trim()}
        >
          {loading ? <span className="btn-spinner" /> : "Explore"}
        </button>
      </div>
    </form>
  );
}
