/**
 * Returns normalized coords [lat, lng] from an obra document.
 * Handles 3 coexisting formats during the canonical migration period:
 *   canonical:    gps.latitude / gps.longitude  (target, all new writes)
 *   transitional: gps.lat / gps.lng             (LEGACY — remove after full migration)
 *   root:         lat / lng                     (LEGACY — pre-2026 mockData format)
 */
export function getObraCoords(obra) {
  const lat =
    obra?.gps?.latitude ??
    obra?.gps?.lat ?? // LEGACY transitional
    obra?.lat; // LEGACY root
  const lng =
    obra?.gps?.longitude ??
    obra?.gps?.lng ?? // LEGACY transitional
    obra?.lng; // LEGACY root
  if (
    typeof lat !== 'number' ||
    !Number.isFinite(lat) ||
    lat < -90 ||
    lat > 90 ||
    typeof lng !== 'number' ||
    !Number.isFinite(lng) ||
    lng < -180 ||
    lng > 180
  ) return null;
  return [lat, lng];
}
