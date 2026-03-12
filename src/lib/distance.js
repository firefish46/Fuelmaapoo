/**
 * Haversine formula — straight-line distance between two lat/lng points in km
 */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) { return (deg * Math.PI) / 180; }

/**
 * Distance-based extra allowance logic.
 *
 * A vehicle that last fueled at Pump A is now at Pump B.
 * If the distance between the two pumps >= the expected range of their last
 * fuel load (liters × km-per-liter for that vehicle class), they are allowed
 * to refuel even if they haven't hit the daily limit yet.
 *
 * This also handles the edge case: daily limit hit but vehicle is stranded
 * far away — we grant a one-time emergency top-up of up to 50% of daily limit.
 *
 * Returns:
 *   { allowed: bool, reason: string, extraLiters: number|null }
 */
export function checkDistanceAllowance({
  distanceKm,
  lastFuelLiters,
  vehicleClass,
  usedToday,
  dailyLimit,
}) {
  const KPL = KM_PER_LITER[vehicleClass] ?? 20; // km per liter estimate
  const expectedRange = lastFuelLiters * KPL;    // how far they should have gone

  if (distanceKm >= expectedRange * 0.85) {
    // They've plausibly used up that fuel load — allow refuel
    const remaining = dailyLimit - usedToday;
    if (remaining > 0) {
      return {
        allowed: true,
        reason: `Vehicle travelled ~${distanceKm.toFixed(1)}km since last fill-up (expected range ${expectedRange.toFixed(0)}km). Remaining allowance: ${remaining.toFixed(1)}L.`,
        extraLiters: null,
      };
    }

    // Daily limit hit but stranded — emergency top-up
    const emergency = parseFloat((dailyLimit * 0.5).toFixed(1));
    return {
      allowed: true,
      emergency: true,
      reason: `Daily limit reached but vehicle is ${distanceKm.toFixed(1)}km from last pump. Emergency top-up granted.`,
      extraLiters: emergency,
    };
  }

  return {
    allowed: false,
    reason: `Only ${distanceKm.toFixed(1)}km from last pump (needs ~${expectedRange.toFixed(0)}km to qualify for distance allowance).`,
    extraLiters: null,
  };
}

// Approximate fuel efficiency by vehicle class (km per liter)
export const KM_PER_LITER = {
  'Motorcycle':    40,
  'Private Car':   12,
  'Pickup / SUV':  10,
  'Microbus':       9,
  'Minibus':        8,
  'Bus':            5,
  'Light Truck':    8,
  'Heavy Truck':    5,
  'Agricultural':   6,
  'Emergency':     10,
};