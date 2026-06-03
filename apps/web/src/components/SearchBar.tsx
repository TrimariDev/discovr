"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { titleCaseArtistName } from "@discovr/contracts";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { searchArtists } from "@/lib/api";
import { panelSurfaceClassName, searchDropdownCardClassName } from "@/lib/panel";
import { isEchoSearchResult, matchesSearchPrefix } from "@/lib/search";
import type { ArtistSearchResult } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  onArtistSelected: (artist: Pick<ArtistSearchResult, "id" | "name" | "mbid"> | null) => void;
  onClear: () => void;
  /** Shown when the parent graph load fails after a search selection. */
  graphLoadError?: string | null;
};

export function SearchBar({ onArtistSelected, onClear, graphLoadError = null }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const latestQueryRef = useRef("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArtistSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSelectionLocked, setIsSelectionLocked] = useState(false);
  const normalizedQuery = query.trim();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  latestQueryRef.current = normalizedQuery;

  const visibleResults = useMemo(() => {
    if (normalizedQuery.length === 0) {
      return results;
    }

    return results.filter(
      (artist) =>
        !isEchoSearchResult(artist, normalizedQuery) &&
        matchesSearchPrefix(artist.name, normalizedQuery)
    );
  }, [normalizedQuery, results]);

  useEffect(() => {
    if (isSelectionLocked) {
      setResults([]);
      return;
    }

    if (normalizedQuery.length < 1) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    let active = true;
    const queryForRequest = normalizedQuery;
    setIsSearching(true);

    const timeout = window.setTimeout(async () => {
      try {
        setError(null);
        const nextResults = await searchArtists(queryForRequest);

        if (active && latestQueryRef.current === queryForRequest) {
          setResults(nextResults);
        }
      } catch {
        if (active && latestQueryRef.current === queryForRequest) {
          setError("Search unavailable");
        }
      } finally {
        if (active && latestQueryRef.current === queryForRequest) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [isSelectionLocked, normalizedQuery]);

  function selectArtist(artist: ArtistSearchResult) {
    setIsSelectionLocked(true);
    setQuery(artist.name);
    setResults([]);
    setError(null);
    onArtistSelected({ id: artist.id, name: artist.name, mbid: artist.mbid ?? null });
  }

  function clearSearch() {
    setQuery("");
    setResults([]);
    setError(null);
    setIsSelectionLocked(false);
    onArtistSelected(null);
    onClear();

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  return (
    <div className="search">
      <div className="searchField" suppressHydrationWarning>
        <Input
          ref={inputRef}
          aria-label="Search artist"
          autoComplete="off"
          suppressHydrationWarning
          data-lpignore="true"
          data-1p-ignore="true"
          data-bwignore="true"
          placeholder="Search an artist"
          value={query}
          className={cn("h-11 pr-10 text-base shadow-sm", panelSurfaceClassName)}
          onChange={(event) => {
            setIsSelectionLocked(false);
            setError(null);
            setQuery(event.target.value);
          }}
        />
        {(normalizedQuery.length > 0 || isSelectionLocked) && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-primary"
            aria-label="Clear search"
            onClick={clearSearch}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
      {(visibleResults.length > 0 || error || isSearching || graphLoadError) && (
        <Card className={cn("searchResults gap-0 py-1.5", searchDropdownCardClassName)} size="sm">
          <CardContent className="p-1.5">
            <ul role="listbox" aria-label="Artist search results" className="m-0 list-none p-0">
              {isSearching && (
                <li className="searchStatus" role="option">
                  Searching…
                </li>
              )}
              {error && (
                <li className="searchStatus" role="option">
                  {error}
                </li>
              )}
              {graphLoadError && (
                <li className="searchStatus" role="option">
                  {graphLoadError}
                </li>
              )}
              {visibleResults.map((artist) => (
                <li key={artist.id} role="option">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto w-full justify-start px-2.5 py-2.5 text-left font-normal"
                    onClick={() => selectArtist(artist)}
                  >
                    {titleCaseArtistName(artist.name)}
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
