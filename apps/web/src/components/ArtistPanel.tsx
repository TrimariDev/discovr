"use client";

import { titleCaseArtistName } from "@discovr/contracts";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { loadArtistInfo } from "@/lib/api";
import {
  floatingPanelCardClassName,
  panelBodyClassName,
  panelFooterClassName,
  panelHeaderClassName
} from "@/lib/panel";
import type { ArtistInfoResponse, ArtistSearchResult } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  artist: Pick<ArtistSearchResult, "id" | "name" | "mbid"> | null;
  activeTagFilters: string[];
  onToggleTagFilter: (tag: string) => void;
  onArtistTags: (artistId: string, tags: string[]) => void;
  graphControlsVisible: boolean;
  hasActiveFilters: boolean;
  onResetView: () => void;
  onFocusSeed: () => void;
  onClearFilters: () => void;
};

export function ArtistPanel({
  artist,
  activeTagFilters,
  onToggleTagFilter,
  onArtistTags,
  graphControlsVisible,
  hasActiveFilters,
  onResetView,
  onFocusSeed,
  onClearFilters
}: Props) {
  const [details, setDetails] = useState<ArtistInfoResponse | null>(null);
  const [detailsStatus, setDetailsStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const loadedArtistIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!artist) {
      loadedArtistIdRef.current = null;
      setDetails(null);
      setDetailsStatus("idle");
      return;
    }

    if (loadedArtistIdRef.current === artist.id && detailsStatus === "ready") {
      return;
    }

    let active = true;
    loadedArtistIdRef.current = artist.id;
    setDetails(null);
    setDetailsStatus("loading");

    void (async () => {
      try {
        const payload = await loadArtistInfo({
          name: artist.name,
          mbid: (artist as { mbid?: string | null }).mbid ?? null
        });
        if (active) {
          setDetails(payload);
          setDetailsStatus("ready");
          onArtistTags(artist.id, payload.artist.tags.map((tag) => tag.name));
        }
      } catch {
        if (active) {
          setDetailsStatus("error");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [artist?.id, artist?.name, artist?.mbid]);

  const summaryText = useMemo(() => {
    const raw = details?.artist.summary ?? "";
    if (!raw) {
      return "";
    }

    return raw
      .replace(/<[^>]+>/g, "")
      .replace(/\s*Read more on Last\.?fm\.?\s*/gi, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }, [details?.artist.summary]);

  if (!artist) {
    return null;
  }

  const statsLine =
    detailsStatus === "ready" && details && (details.artist.listeners || details.artist.playcount)
      ? [
          details.artist.listeners ? `${details.artist.listeners.toLocaleString()} listeners` : null,
          details.artist.playcount ? `${details.artist.playcount.toLocaleString()} plays` : null
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  const hasBody =
    detailsStatus === "ready" &&
    details &&
    (Boolean(summaryText) || details.artist.topTracks.length > 0);

  const statusLine =
    detailsStatus === "loading"
      ? "Loading details…"
      : detailsStatus === "error"
        ? "Details unavailable"
        : null;

  return (
    <Card
      className={cn(
        "artistPanel floatingPanel max-h-[calc(100vh-48px)]",
        floatingPanelCardClassName
      )}
      aria-label="Artist details"
    >
      <CardHeader className={panelHeaderClassName}>
        <div className="flex flex-col gap-1">
          <CardTitle className="text-xl leading-tight">{titleCaseArtistName(artist.name)}</CardTitle>
          {statusLine && <CardDescription>{statusLine}</CardDescription>}
          {statsLine && <CardDescription>{statsLine}</CardDescription>}
        </div>

        {detailsStatus === "ready" && details && details.artist.tags.length > 0 && (
          <ul className="tagList" aria-label="Top tags">
            {details.artist.tags.slice(0, 8).map((tag: { name: string }) => {
              const isActive = activeTagFilters.includes(tag.name.trim().toLowerCase());

              return (
                <li key={tag.name}>
                  <Badge asChild variant={isActive ? "default" : "outline"} className="lowercase">
                    <button type="button" aria-pressed={isActive} onClick={() => onToggleTagFilter(tag.name)}>
                      {tag.name}
                    </button>
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </CardHeader>

      {hasBody && details && (
        <CardContent className={cn(panelBodyClassName, "flex min-h-0 flex-1 flex-col gap-4")}>
          {summaryText && <p className="artistSummary">{summaryText}</p>}

          {details.artist.topTracks.length > 0 && (
            <div className="topTracks" aria-label="Top tracks">
              <strong className="text-foreground text-sm">Top tracks</strong>
              <ol>
                {details.artist.topTracks.slice(0, 8).map((track: { name: string; url?: string | null }) => (
                  <li key={track.name}>
                    {track.url ? (
                      <a href={track.url} target="_blank" rel="noreferrer">
                        {track.name}
                      </a>
                    ) : (
                      track.name
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </CardContent>
      )}

      {graphControlsVisible && (
        <CardFooter className={panelFooterClassName}>
          <Button type="button" variant="outline" size="sm" onClick={onResetView}>
            Reset view
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onFocusSeed}>
            Focus seed
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onClearFilters} disabled={!hasActiveFilters}>
            Clear filters
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
