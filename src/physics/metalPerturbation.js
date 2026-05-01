// Utility: check if a world-space point is within the disc's XZ footprint (disc lies in XZ plane).
export function pointNearDisc(px, py, pz, discX, discY, discZ, discRadius) {
  const dx = px - discX;
  const dz = pz - discZ;
  return Math.sqrt(dx * dx + dz * dz) < discRadius;
}

// Qualitative frequency shift percentage when disc is within influence range.
export function freqShiftPct(distance, maxDistance = 2.0) {
  if (distance >= maxDistance) return 0;
  return Math.round(((maxDistance - distance) / maxDistance) * 12);
}
