"use client";

import dynamic from "next/dynamic";
import { saveAssetBoundary } from "./actions";

const AssetMap = dynamic(() => import("./AssetMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 items-center justify-center rounded border border-neutral-200 text-sm text-neutral-400">
      Loading map…
    </div>
  ),
});

type AssetGeo = { id: string; name: string; status: string; boundary: number[][] | null };

export default function MapSection({
  waqfId,
  assets,
}: {
  waqfId: string;
  assets: AssetGeo[];
}) {
  return (
    <AssetMap
      assets={assets}
      onSaveBoundary={(assetId, points) => saveAssetBoundary(assetId, waqfId, points)}
    />
  );
}
