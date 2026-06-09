/** Fetches count of restaurants/fast-food within a radius using the free Overpass API. */
export async function fetchNearbyRestaurants(lat, lng, radiusMiles = 1) {
  const radius = Math.round(radiusMiles * 1609);
  const query =
    `[out:json][timeout:20];` +
    `(node["amenity"="restaurant"](around:${radius},${lat},${lng});` +
    `node["amenity"="fast_food"](around:${radius},${lat},${lng}););` +
    `out count;`;
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const data = await res.json();
    return data.elements?.[0]?.tags?.total ?? null;
  } catch {
    return null;
  }
}
