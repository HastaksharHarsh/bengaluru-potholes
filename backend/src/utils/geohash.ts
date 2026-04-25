// ─── Geohash utilities for spatial proximity queries in Firestore ────────────
//
// Firestore doesn't support native geo-queries, so we encode lat/lng into
// geohash strings and use prefix-range queries to find nearby documents.
//
import ngeohash from "ngeohash";

/**
 * Encode lat/lng to a geohash string.
 * Precision 7 ≈ ±76m, Precision 8 ≈ ±19m, Precision 9 ≈ ±2m
 */
export function encodeGeohash(lat: number, lng: number, precision = 7): string {
  return ngeohash.encode(lat, lng, precision);
}

/**
 * Decode a geohash back to { lat, lng }.
 */
export function decodeGeohash(hash: string): { lat: number; lng: number } {
  const { latitude, longitude } = ngeohash.decode(hash);
  return { lat: latitude, lng: longitude };
}

/**
 * Get all neighboring geohash cells (including the center cell itself).
 * Used to query a 3×3 grid of geohash cells around a point.
 */
export function getGeohashNeighbors(lat: number, lng: number, precision = 7): string[] {
  const center = ngeohash.encode(lat, lng, precision);
  const neighbors = ngeohash.neighbors(center);
  return [center, ...neighbors];
}

/**
 * Calculate distance in meters between two lat/lng points (Haversine).
 */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/**
 * Get geohash range queries for a given radius around a point.
 * Returns an array of { start, end } pairs for Firestore range queries.
 */
export function getGeohashRanges(
  lat: number,
  lng: number,
  radiusMeters: number
): { start: string; end: string }[] {
  // Choose precision based on radius
  let precision = 7;
  if (radiusMeters > 5000) precision = 4;
  else if (radiusMeters > 1000) precision = 5;
  else if (radiusMeters > 200) precision = 6;
  else if (radiusMeters > 50) precision = 7;
  else precision = 8;

  const neighbors = getGeohashNeighbors(lat, lng, precision);

  return neighbors.map((hash) => ({
    start: hash,
    end: hash + "\uf8ff",
  }));
}
