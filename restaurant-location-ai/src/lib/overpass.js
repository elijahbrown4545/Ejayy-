/**
 * Overpass API wrapper — fetches real OSM data for a bounding box.
 * No API key required. Results are cached for 10 minutes per bbox.
 */

const CACHE = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 min

export async function fetchAreaData(bounds) {
  const { north, south, east, west } = bounds;
  const key = `${south.toFixed(2)},${west.toFixed(2)},${north.toFixed(2)},${east.toFixed(2)}`;

  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

  const bbox = `${south},${west},${north},${east}`;
  const query =
    `[out:json][timeout:30];` +
    `(` +
    // Restaurants / fast food / cafes
    `node["amenity"~"^(restaurant|fast_food|cafe|food_court)$"](${bbox});` +
    `way["amenity"~"^(restaurant|fast_food|cafe|food_court)$"](${bbox});` +
    // Retail anchors
    `node["shop"~"^(supermarket|department_store|wholesale|mall)$"](${bbox});` +
    `way["shop"~"^(supermarket|department_store|wholesale|mall)$"](${bbox});` +
    `node["name"~"Walmart|Target|Costco|Sam's Club|Meijer|Aldi|Jewel|Kroger",i](${bbox});` +
    `way["name"~"Walmart|Target|Costco|Sam's Club|Meijer|Aldi|Jewel|Kroger",i](${bbox});` +
    // Shopping centers / power centers
    `node["landuse"="retail"](${bbox});` +
    `way["landuse"="retail"](${bbox});` +
    // Major roads (traffic proxy)
    `way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|secondary)$"](${bbox});` +
    `);out center tags;`;

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    const restaurants = [];
    const retailers   = [];
    const roads       = [];

    for (const el of json.elements || []) {
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (!lat || !lng) continue;

      const tags = el.tags || {};
      const amenity = tags.amenity;
      const shop    = tags.shop;
      const highway = tags.highway;
      const name    = tags.name || tags.brand || '';

      if (amenity && ['restaurant','fast_food','cafe','food_court'].includes(amenity)) {
        restaurants.push({ lat, lng, name: name || amenity, brand: tags.brand || '', type: amenity });
      } else if (
        (shop && ['supermarket','department_store','wholesale','mall'].includes(shop)) ||
        tags.landuse === 'retail' ||
        /walmart|target|costco|meijer|aldi|jewel|kroger/i.test(name)
      ) {
        retailers.push({ lat, lng, name: name || shop || 'Retail', type: shop || 'retail' });
      } else if (highway && ['motorway','motorway_link','trunk','trunk_link','primary','secondary'].includes(highway)) {
        roads.push({ lat, lng, type: highway });
      }
    }

    const data = { restaurants, retailers, roads };
    CACHE.set(key, { data, ts: Date.now() });
    return data;
  } catch (err) {
    console.warn('[Overpass] fetch failed:', err.message);
    return { restaurants: [], retailers: [], roads: [] };
  }
}

/** Simple single-radius competitor count (used in detail panel). */
export async function fetchNearbyRestaurants(lat, lng, radiusMiles = 1) {
  const radius = Math.round(radiusMiles * 1609);
  const query =
    `[out:json][timeout:15];` +
    `(node["amenity"~"^(restaurant|fast_food)$"](around:${radius},${lat},${lng}););` +
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
