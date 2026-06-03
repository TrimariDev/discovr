"use client";

import { useEffect, useMemo, useState } from "react";
import { loadArtistInfo } from "@/lib/api";
import type { ArtistInfoResponse, ArtistSearchResult } from "@/lib/types";

type Props = {
  artist: Pick<ArtistSearchResult, "id" | "name" | "mbid"> | null;
  activeTagFilters: string[];
  onToggleTagFilter: (tag: string) => void;
  onArtistTags: (artistId: string, tags: string[]) => void;
  onClose: () => void;
};

export function ArtistPanel({ artist, activeTagFilters, onToggleTagFilter, onArtistTags, onClose }: Props) {
  const [details, setDetails] = useState<ArtistInfoResponse | null>(null);
  const [detailsStatus, setDetailsStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    if (!artist) {
      setDetails(null);
      setDetailsStatus("idle");
      return;
    }

    let active = true;
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
  }, [artist]);

  const summaryText = useMemo(() => {
    const raw = details?.artist.summary ?? "";
    if (!raw) {
      return "";
    }

    // Last.fm returns HTML in summary and appends a "Read more on Last.fm" link.
    return raw
      .replace(/<[^>]+>/g, "")
      .replace(/\s*Read more on Last\.?fm\.?\s*/gi, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }, [details?.artist.summary]);

  if (!artist) {
    return null;
  }

  return (
    <aside className="artistPanel floatingPanel panel">
      <button className="closeCircleButton" type="button" aria-label="Close artist panel" onClick={onClose}>
        <span aria-hidden="true">×</span>
      </button>
      <h2 className="artistTitle">{artist.name}</h2>

      {detailsStatus === "loading" && <p className="mutedLine">Loading details…</p>}
      {detailsStatus === "error" && <p className="mutedLine">Details unavailable</p>}

      {detailsStatus === "ready" && details && (
        <>
          {(details.artist.listeners || details.artist.playcount) && (
            <p className="mutedLine">
              {details.artist.listeners ? `${details.artist.listeners.toLocaleString()} listeners` : null}
              {details.artist.listeners && details.artist.playcount ? " · " : null}
              {details.artist.playcount ? `${details.artist.playcount.toLocaleString()} plays` : null}
            </p>
          )}

          {details.artist.tags.length > 0 && (
            <ul className="tagList" aria-label="Top tags">
              {details.artist.tags.slice(0, 8).map((tag: { name: string }) => {
                const isActive = activeTagFilters.includes(tag.name.trim().toLowerCase());

                return (
                  <li key={tag.name}>
                    <button
                      type="button"
                      className={`tagBadge${isActive ? " tagBadgeActive" : ""}`}
                      aria-pressed={isActive}
                      onClick={() => onToggleTagFilter(tag.name)}
                    >
                      {tag.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {summaryText && <p className="artistSummary">{summaryText}</p>}

          {details.artist.topTracks.length > 0 && (
            <div className="topTracks" aria-label="Top tracks">
              <strong>Top tracks</strong>
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
        </>
      )}
    </aside>
  );
}

