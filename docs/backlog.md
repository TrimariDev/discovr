# Backlog

Items parked until we pick them up again. Not blocking current MVP work unless noted.

---

## Zoom springt bij tag-filter / tag-indexering

**Status:** Parked  
**Priority:** Medium (UX polish)  
**Area:** `apps/web` — `GraphCanvas.tsx`, Sigma.js camera/viewport

### Probleem

Pan/zoom van de graaf **verspringt** op meerdere momenten:

1. Na **“Indexing artist tags…”** → wanneer de status wijzigt naar *“X artists tagged — click a tag in the panel to filter”*
2. Bij **klik op een tag** in het artiestenpaneel (filter aan/uit)

Gewenst gedrag: camera (ratio, x, y) blijft identiek; alleen node-opacity/kleur verandert voor de filter.

### Reproductie

1. Start `pnpm dev:web` + `pnpm dev:api`
2. Hard refresh browser (`Cmd+Shift+R`)
3. Zoek bv. **The Beatles**
4. Wacht op *“61 artists tagged…”* rechts onder de zoekbalk
5. Zoom/pan naar een comfortabele view
6. Klik een tag in het **artiestenpaneel** (niet de zoek-dropdown)

### Verwacht vs. feitelijk

| Moment | Verwacht | Feitelijk |
|--------|----------|-----------|
| Tag-index klaar | Geen camera-wijziging | Zoom/viewport springt vaak |
| Tag-klik (filter) | Alleen dimmen van niet-matches | Zoom/viewport springt vaak |

### Gerelateerde code

- `apps/web/src/components/GraphCanvas.tsx` — Sigma render, animatielus, tag-kleuren
- `apps/web/src/lib/graph.ts` — `tagFilterVisuals`, `nodeMatchesTagFilter`, `computeGraphBBox`
- `apps/web/src/app/page.tsx` — `activeTagFilter`, `tagsByArtistId`, `enrichGraphTags`
- `apps/web/src/components/ArtistPanel.tsx` — tag-klik → `onToggleTagFilter`

### Pogingen (niet definitief opgelost)

- Camera **na** `refresh()` herstellen → te laat; Sigma leest camera in `render()`
- Camera **vóór** `refresh()` + ratio pinnen (`minRatio`/`maxRatio`)
- Geen `hidden`/label-wijzigingen bij filter (alleen alpha/kleur)
- `setCustomBBox` vermijden (geen `scheduleRender` via `setCustomBBox()`)
- `autoRescale` uitzetten na eerste fit — eerst per ongeluk op **kopie** van `getSettings()`; later op echte `renderer.settings`
- Geen aparte filter-`useEffect` die dubbel `refresh()` aanroept
- `useLayoutEffect` bij filterwijziging met `repaintWithLockedCamera`
- Geen geforceerde `setState` meer in de 60fps-animatielus
- Tag-indexering triggert geen extra layout-repaint als er geen actieve filter is

### Waarschijnlijke oorzaken (te verifiëren)

1. **Sigma `render()`** herberekent `matrix` / `correctionRatio` bij elke partial `refresh()` — visueel als zoom, ook als `ratio` gelijk blijft
2. **`process()` / `autoRescale`** wordt nog ergens getriggerd (resize, settings, volledige refresh)
3. **Perceptie vs. echte zoom:** filter dimt veel nodes → cluster lijkt groter/gecentreerd zonder dat `camera.ratio` wijzigt
4. **Intro-animatie** (nodes bewegen ~3,6 s) overlapt met tag-index timing
5. **Label grid** niet mee bij `skipIndexation: true` — labels/layout-shift bij filter

### Richtingen voor later

- [ ] Log `camera.getState()` vóór/na tag-klik en na tag-index (devtools) om perceptie vs. echte ratio te scheiden
- [ ] Filter visueel zonder `refresh()` (alleen als Sigma API het toelaat) of met `scheduleRender` + frozen matrix
- [ ] `autoRescale: false` vanaf constructie + handmatige initiële `camera.setState` fit op `customBBox`
- [ ] Filter als aparte canvas/CSS-laag i.p.v. graphology-kleur + refresh
- [ ] Intro-animatie stoppen vóór tag-index klaar is, of bbox/camera na animatie vastzetten
- [ ] Sigma-versie / `@react-sigma/core` evalueren vs. directe `sigma` integratie

### Server / deploy

Zoom-fix is **frontend-only**. Bij testen: `pnpm dev:web` herstarten + hard refresh. API alleen nodig als tags niet laden; graph worker niet relevant voor dit issue.

### Notities uit gesprek

- Statusregel staat **rechtsboven**, onder de zoekbalk
- Filter gebeurt via **panel-tags**, niet via zoek-dropdown
- API-tags kloppen (bv. Beatles → `british`; Beach Boys niet)
