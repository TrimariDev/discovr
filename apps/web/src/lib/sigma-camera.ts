import type Graphology from "graphology";
import type Sigma from "sigma";
import { computeGraphBBox } from "@/lib/graph";

export type CameraState = {
  x: number;
  y: number;
  angle: number;
  ratio: number;
};

type SigmaInternals = {
  settings: { autoRescale: boolean };
  customBBox: ReturnType<typeof computeGraphBBox>;
};

function setAutoRescale(renderer: Sigma, enabled: boolean) {
  (renderer as unknown as SigmaInternals).settings.autoRescale = enabled;
}

export function disableAutoRescale(renderer: Sigma) {
  setAutoRescale(renderer, false);
}

export function lockGraphViewport(renderer: Sigma, nodes: Array<{ x: number; y: number }>) {
  (renderer as unknown as SigmaInternals).customBBox = computeGraphBBox(nodes);
}

export function refreshGraph(renderer: Sigma) {
  renderer.refresh();
}

export function refreshPartial(renderer: Sigma, graphology: Graphology) {
  renderer.refresh({
    partialGraph: { nodes: graphology.nodes() },
    skipIndexation: true
  });
}

export function captureDefaultCamera(renderer: Sigma): CameraState {
  return renderer.getCamera().getState();
}

export function restoreDefaultCamera(renderer: Sigma, state: CameraState) {
  renderer.getCamera().setState(state);
  refreshGraph(renderer);
}

/** Zoom toward a graph point while keeping it under the same viewport position. */
export function focusCameraOnGraphPoint(
  renderer: Sigma,
  graphPoint: { x: number; y: number },
  zoomInFactor: number,
  baseline: CameraState
) {
  const camera = renderer.getCamera();
  const viewportPoint = renderer.graphToViewport(graphPoint);
  const focusRatio = camera.getBoundedRatio(baseline.ratio / zoomInFactor);
  const nextState = renderer.getViewportZoomedState(viewportPoint, focusRatio);

  camera.setState({ ...nextState, angle: baseline.angle });
  refreshGraph(renderer);
}

export function repaintWithLockedCamera(renderer: Sigma, graphology: Graphology) {
  const camera = renderer.getCamera();
  const snapshot: CameraState = camera.getState();
  const pinnedRatio = snapshot.ratio;

  camera.minRatio = pinnedRatio;
  camera.maxRatio = pinnedRatio;
  camera.setState(snapshot);

  refreshPartial(renderer, graphology);

  camera.setState(snapshot);
  camera.minRatio = null;
  camera.maxRatio = null;
}
