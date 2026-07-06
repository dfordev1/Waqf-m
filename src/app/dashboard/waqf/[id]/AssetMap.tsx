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
  const [targetAsset, setTargetAsset] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const center: LatLngExpression = assets.find((a) => a.boundary?.length)
    ? [
        assets.find((a) => a.boundary?.length)!.boundary![0][1],
        assets.find((a) => a.boundary?.length)!.boundary![0][0],
      ]
    : [21.0, 78.0]; // default: India

  async function save() {
    if (!targetAsset || points.length < 3) {
      setMsg("Pick an asset and place at least 3 points.");
      return;
    }
    setMsg("Saving boundary…");
    await onSaveBoundary(targetAsset, points);
    setMsg("Saved. Reloading…");
    setDrawing(false);
    setPoints([]);
    setTimeout(() => location.reload(), 600);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select
          value={targetAsset}
          onChange={(e) => setTargetAsset(e.target.value)}
          className="rounded border border-neutral-300 p-1.5"
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
          onClick={() => {
            setDrawing((d) => !d);
            setPoints([]);
          }}
          className="rounded border border-neutral-300 px-2 py-1.5 hover:bg-neutral-100"
        >
          {drawing ? "Cancel drawing" : "Draw parcel boundary"}
        </button>
        {drawing && (
          <button
            type="button"
            onClick={save}
            className="rounded bg-emerald-700 px-3 py-1.5 text-white hover:bg-emerald-600"
          >
            Save boundary ({points.length} pts)
          </button>
        )}
        {msg && <span className="text-xs text-neutral-500">{msg}</span>}
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
