"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Polygon, FeatureGroup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLngExpression } from "leaflet";

type AssetGeo = { id: string; name: string; status: string; boundary: number[][] | null };

function ClickCollector({ onPoint }: { onPoint: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPoint(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const STATUS_COLOR: Record<string, string> = {
  active: "#059669",
  leased: "#2563eb",
  idle: "#a3a3a3",
  encroached: "#dc2626",
  under_litigation: "#dc2626",
  under_istibdal: "#d97706",
  substituted: "#6b7280",
};

export default function AssetMap({
  assets,
  onSaveBoundary,
}: {
  assets: AssetGeo[];
  onSaveBoundary: (assetId: string, coords: [number, number][]) => Promise<void>;
}) {
  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState<[number, number][]>([]);
  // preselect when there's only one asset — the common case for new waqfs
  const [targetAsset, setTargetAsset] = useState(
    assets.length === 1 ? assets[0].id : ""
  );
  const [msg, setMsg] = useState<string | null>(null);

  const center: LatLngExpression = assets.find((a) => a.boundary?.length)
    ? [
        assets.find((a) => a.boundary?.length)!.boundary![0][1],
        assets.find((a) => a.boundary?.length)!.boundary![0][0],
      ]
    : [21.0, 78.0]; // default: India

  async function save() {
    if (!targetAsset || points.length < 3) {
      setMsg("Pick an asset and place at least 3 points on the map.");
      return;
    }
    setMsg("Saving boundary…");
    try {
      await onSaveBoundary(targetAsset, points);
      setMsg("Saved. Reloading…");
      setDrawing(false);
      setPoints([]);
      setTimeout(() => location.reload(), 600);
    } catch (e) {
      setMsg(`Save failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const noAssets = assets.length === 0;

  return (
    <div className="space-y-2">
      {noAssets && (
        <p className="rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-800">
          This waqf has no assets yet, so there is nothing to draw a boundary
          for. First add one with <strong>➕ Add asset</strong> in the Actions
          section below, then come back to map its parcel.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select
          value={targetAsset}
          onChange={(e) => setTargetAsset(e.target.value)}
          disabled={noAssets}
          className="rounded border border-neutral-300 p-1.5 disabled:opacity-50"
        >
          <option value="">Select asset to map…</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={noAssets || (!drawing && !targetAsset)}
          title={
            noAssets
              ? "Add an asset first"
              : !targetAsset
                ? "Select which asset this boundary belongs to first"
                : undefined
          }
          onClick={() => {
            setDrawing((d) => !d);
            setPoints([]);
            setMsg(null);
          }}
          className="rounded border border-neutral-300 px-2 py-1.5 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {drawing ? "Cancel drawing" : "Draw parcel boundary"}
        </button>
        {drawing && (
          <button
            type="button"
            onClick={save}
            disabled={points.length < 3}
            title={points.length < 3 ? "Click the map to place at least 3 points" : undefined}
            className="rounded bg-emerald-700 px-3 py-1.5 text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save boundary ({points.length} pts)
          </button>
        )}
        {msg && (
          <span
            className={`text-xs ${msg.startsWith("Saved") || msg.startsWith("Saving") ? "text-emerald-700" : "text-red-600"}`}
          >
            {msg}
          </span>
        )}
      </div>

      <div className="h-96 w-full overflow-hidden rounded border border-neutral-200">
        <MapContainer center={center} zoom={5} className="h-full w-full">
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {drawing && (
            <ClickCollector onPoint={(lat, lng) => setPoints((p) => [...p, [lat, lng]])} />
          )}
          {drawing && points.length > 0 && (
            <Polygon positions={points} pathOptions={{ color: "#059669", dashArray: "4" }} />
          )}
          <FeatureGroup>
            {assets
              .filter((a) => a.boundary && a.boundary.length >= 3)
              .map((a) => (
                <Polygon
                  key={a.id}
                  positions={a.boundary!.map(([lng, lat]) => [lat, lng] as [number, number])}
                  pathOptions={{ color: STATUS_COLOR[a.status] ?? "#059669" }}
                />
              ))}
          </FeatureGroup>
        </MapContainer>
      </div>
      <p className="text-xs text-neutral-400">
        Click &quot;Draw parcel boundary&quot;, then click the map to place points (3+), then save.
        Existing parcels are colored by status — red means encroached or under litigation.
      </p>
    </div>
  );
}
