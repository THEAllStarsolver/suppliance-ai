"""
api_integration.py
Responsibility: Fetch real-world data from external APIs (weather, routing).
Returns coordinates for map rendering and ETA computation.
"""
import httpx
from app.models import WeatherData, RouteData
from app.config import OPENWEATHER_API_KEY, ORS_API_KEY, FUEL_COST_PER_KM
import logging

logger = logging.getLogger(__name__)


def _weather_risk_factor(condition: str, rain_prob: float) -> float:
    condition_lower = condition.lower()
    if any(w in condition_lower for w in ["thunderstorm", "heavy rain", "blizzard", "snow"]):
        return 0.8
    if any(w in condition_lower for w in ["rain", "drizzle", "sleet", "fog"]):
        return 0.4 + rain_prob * 0.2
    if rain_prob > 0.6:
        return 0.4
    if rain_prob > 0.3:
        return 0.2
    return 0.05


async def get_weather(city: str) -> WeatherData:
    if not OPENWEATHER_API_KEY:
        return _fallback_weather()

    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {"q": city, "appid": OPENWEATHER_API_KEY, "units": "metric"}

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            condition = data["weather"][0]["main"]
            description = data["weather"][0]["description"]
            rain_prob = min(data.get("rain", {}).get("1h", 0) / 10.0, 1.0)
            risk = _weather_risk_factor(condition, rain_prob)
            return WeatherData(condition=condition, description=description,
                               rain_probability=round(rain_prob, 2), risk_factor=round(risk, 2))
        except Exception as e:
            logger.error(f"Weather API error for {city}: {e}")
            return _fallback_weather()


def _fallback_weather() -> WeatherData:
    return WeatherData(condition="Unknown", description="Weather data unavailable",
                       rain_probability=0.2, risk_factor=0.2)


async def get_route(origin: str, destination: str) -> RouteData:
    if ORS_API_KEY:
        return await _ors_route(origin, destination)
    return await _estimate_route_via_geocode(origin, destination)


async def _ors_route(origin: str, destination: str) -> RouteData:
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            origin_coords = await _geocode_ors(client, origin)   # [lon, lat]
            dest_coords = await _geocode_ors(client, destination)

            url = "https://api.openrouteservice.org/v2/directions/driving-car"
            headers = {"Authorization": ORS_API_KEY, "Content-Type": "application/json"}
            resp = await client.post(url, json={"coordinates": [origin_coords, dest_coords]}, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            segment = data["routes"][0]["summary"]
            distance_km = round(segment["distance"] / 1000, 1)
            travel_hours = round(segment["duration"] / 3600, 2)
            cost = round(distance_km * FUEL_COST_PER_KM, 2)

            # Store as [lat, lon] for Leaflet
            return RouteData(
                distance_km=distance_km,
                estimated_travel_hours=travel_hours,
                base_cost_usd=cost,
                origin_coords=[origin_coords[1], origin_coords[0]],
                dest_coords=[dest_coords[1], dest_coords[0]],
            )
        except Exception as e:
            logger.error(f"ORS routing error: {e}")
            return await _estimate_route_via_geocode(origin, destination)


async def _geocode_ors(client: httpx.AsyncClient, place: str) -> list:
    url = "https://api.openrouteservice.org/geocode/search"
    params = {"api_key": ORS_API_KEY, "text": place, "size": 1}
    resp = await client.get(url, params=params)
    resp.raise_for_status()
    return resp.json()["features"][0]["geometry"]["coordinates"]  # [lon, lat]


async def _estimate_route_via_geocode(origin: str, destination: str) -> RouteData:
    async with httpx.AsyncClient(timeout=10, headers={"User-Agent": "SupplyChainAI/1.0"}) as client:
        try:
            o = await _nominatim_geocode(client, origin)    # (lat, lon)
            d = await _nominatim_geocode(client, destination)
            distance_km = _haversine(o, d)
            travel_hours = round(distance_km / 80, 2)
            cost = round(distance_km * FUEL_COST_PER_KM, 2)
            return RouteData(
                distance_km=round(distance_km, 1),
                estimated_travel_hours=travel_hours,
                base_cost_usd=cost,
                origin_coords=list(o),
                dest_coords=list(d),
            )
        except Exception as e:
            logger.error(f"Geocode fallback failed: {e}")
            return _static_route_fallback()


async def _nominatim_geocode(client: httpx.AsyncClient, place: str) -> tuple:
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": place, "format": "json", "limit": 1}
    resp = await client.get(url, params=params)
    resp.raise_for_status()
    result = resp.json()[0]
    return float(result["lat"]), float(result["lon"])


async def geocode_city(city: str) -> tuple[float, float] | None:
    """Public helper: geocode a single city, returns (lat, lon) or None."""
    if ORS_API_KEY:
        async with httpx.AsyncClient(timeout=10) as client:
            try:
                coords = await _geocode_ors(client, city)
                return coords[1], coords[0]
            except Exception:
                pass
    async with httpx.AsyncClient(timeout=10, headers={"User-Agent": "SupplyChainAI/1.0"}) as client:
        try:
            return await _nominatim_geocode(client, city)
        except Exception:
            return None


def _haversine(coord1: tuple, coord2: tuple) -> float:
    import math
    lat1, lon1 = map(math.radians, coord1)
    lat2, lon2 = map(math.radians, coord2)
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(a))


def _static_route_fallback() -> RouteData:
    return RouteData(distance_km=500.0, estimated_travel_hours=6.25, base_cost_usd=60.0,
                     origin_coords=[19.076, 72.877], dest_coords=[28.644, 77.216])
