"use client";

import {
  PERF_TARGET_FPS,
  PERF_TARGET_OBJECT_SYNC_MS,
  PERF_TARGET_CURSOR_SYNC_MS,
  PERF_TARGET_OBJECT_COUNT,
  PERF_TARGET_CONCURRENT_USERS,
} from "@/constants/performanceTargets";

export type PerformancePanelProps = {
  fps: number | null;
  objectSyncLatencyMs: number | null;
  cursorSyncLatencyMs: number | null;
  objectCount: number;
  concurrentUsers: number;
  onClose: () => void;
};

function MetricRow({
  label,
  value,
  target,
  pass,
  valueLabel,
  targetLabel,
}: {
  label: string;
  value: string | number;
  valueLabel?: string;
  target: string;
  targetLabel?: string;
  pass: boolean;
}) {
  return (
    <tr className={pass ? "perf-metric perf-ok" : "perf-metric perf-fail"}>
      <td className="perf-metric-label">{label}</td>
      <td className="perf-metric-value">{value}{valueLabel != null ? valueLabel : ""}</td>
      <td className="perf-metric-target">{target}{targetLabel != null ? targetLabel : ""}</td>
      <td className="perf-metric-status" aria-label={pass ? "Pass" : "Fail"}>
        {pass ? "Pass" : "Fail"}
      </td>
    </tr>
  );
}

export function PerformancePanel({
  fps,
  objectSyncLatencyMs,
  cursorSyncLatencyMs,
  objectCount,
  concurrentUsers,
  onClose,
}: PerformancePanelProps) {
  const fpsPass = fps != null && fps >= PERF_TARGET_FPS;
  const objectSyncPass = objectSyncLatencyMs != null && objectSyncLatencyMs < PERF_TARGET_OBJECT_SYNC_MS;
  const cursorSyncPass = cursorSyncLatencyMs != null && cursorSyncLatencyMs < PERF_TARGET_CURSOR_SYNC_MS;
  const objectCountPass = objectCount >= PERF_TARGET_OBJECT_COUNT;
  const concurrentUsersPass = concurrentUsers >= PERF_TARGET_CONCURRENT_USERS;

  return (
    <div className="perf-panel" role="dialog" aria-label="Performance metrics">
      <div className="perf-panel-header">
        <h2 className="perf-panel-title">Performance</h2>
        <button
          type="button"
          className="perf-panel-close"
          onClick={onClose}
          aria-label="Close"
        >
          Close
        </button>
      </div>
      <table className="perf-panel-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Current</th>
            <th>Target</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <MetricRow
            label="Frame rate"
            value={fps ?? "—"}
            valueLabel={fps != null ? " FPS" : ""}
            target={`≥ ${PERF_TARGET_FPS} FPS`}
            pass={fps == null ? false : fpsPass}
          />
          <MetricRow
            label="Object sync latency"
            value={objectSyncLatencyMs ?? "—"}
            valueLabel={objectSyncLatencyMs != null ? " ms" : ""}
            target={`< ${PERF_TARGET_OBJECT_SYNC_MS} ms`}
            pass={objectSyncLatencyMs == null ? false : objectSyncPass}
          />
          <MetricRow
            label="Cursor sync latency"
            value={cursorSyncLatencyMs ?? "—"}
            valueLabel={cursorSyncLatencyMs != null ? " ms" : ""}
            target={`< ${PERF_TARGET_CURSOR_SYNC_MS} ms`}
            pass={cursorSyncLatencyMs == null ? false : cursorSyncPass}
          />
          <MetricRow
            label="Object capacity"
            value={objectCount}
            valueLabel=" objects"
            target={`≥ ${PERF_TARGET_OBJECT_COUNT}`}
            pass={objectCountPass}
          />
          <MetricRow
            label="Concurrent users"
            value={concurrentUsers}
            target={`≥ ${PERF_TARGET_CONCURRENT_USERS}`}
            pass={concurrentUsersPass}
          />
        </tbody>
      </table>
    </div>
  );
}
