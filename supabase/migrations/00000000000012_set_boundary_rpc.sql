-- PostgREST can't cast a raw JSON object into `geography` directly; go
-- through PostGIS's GeoJSON parser explicitly via RPC.
create function set_asset_boundary(p_asset uuid, p_geojson jsonb)
returns void language plpgsql security invoker set search_path = public as $$
begin
  -- the boundary column is geography(MultiPolygon,4326); wrap single Polygon input
  update assets
  set boundary = ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(p_geojson::text), 4326))::geography
  where id = p_asset;
end $$;
grant execute on function set_asset_boundary(uuid, jsonb) to authenticated;

-- expose boundary as GeoJSON for the map (geography -> GeoJSON text -> jsonb)
create or replace view assets_geo as
  select id, org_id, waqf_id, name, kind, status,
         case when boundary is not null then ST_AsGeoJSON(boundary)::jsonb end as boundary_geojson
  from assets;
alter view assets_geo set (security_invoker = on);
