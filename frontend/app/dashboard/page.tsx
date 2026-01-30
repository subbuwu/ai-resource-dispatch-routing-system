"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom icons
const userIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [30, 50],
  iconAnchor: [15, 50],
  popupAnchor: [1, -34],
  shadowSize: [50, 50],
});

const reliefCentreIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const nearestReliefCentreIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [35, 60],
  iconAnchor: [17, 60],
  popupAnchor: [1, -34],
  shadowSize: [60, 60],
});

// Component to handle map bounds
function MapBounds({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [100, 100] });
    }
  }, [map, bounds]);
  
  return null;
}

const BACKEND_URL = "http://localhost:8000";

// Available supplies
const SUPPLIES = [
  { id: "food", name: "Food & Water", icon: "🍽️" },
  { id: "medical", name: "Medical Supplies", icon: "🏥" },
  { id: "shelter", name: "Shelter", icon: "🏠" },
  { id: "clothing", name: "Clothing", icon: "👕" },
  { id: "blankets", name: "Blankets", icon: "🛏️" },
  { id: "hygiene", name: "Hygiene Items", icon: "🧴" },
  { id: "batteries", name: "Batteries & Flashlights", icon: "🔦" },
  { id: "communication", name: "Communication Devices", icon: "📱" },
];

interface RouteResponse {
  summary: {
    distance: number;
    duration: number;
    distance_km: number;
    duration_min: number;
    distance_formatted: string;
    duration_formatted: string;
  };
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
  geometry: {
    type: string;
    coordinates: number[][];
  };
  coordinates: number[][];
}

interface ReliefCentre {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number | null;
  status: string;
}

interface NearestReliefCentreResponse {
  relief_centre: ReliefCentre;
  route: RouteResponse;
  distance: number;
  duration: number;
  distance_formatted: string;
  duration_formatted: string;
}

interface WeatherData {
  temperature: number | null;
  condition: string;
  description: string;
  humidity: number | null;
  wind_speed: number | null;
  rainfall: number | null;
  alerts: Array<{ event: string; description: string; severity: string }>;
  icon: string;
  api_available: boolean;
  city?: string;
  country?: string;
  safety_status?: string; // safe, caution, unsafe
  safety_message?: string;
  calamities?: Array<{ type: string; severity: string; description: string }>;
}

export default function DashboardPage() {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [routeData, setRouteData] = useState<RouteResponse | null>(null);
  const [nearestReliefCentre, setNearestReliefCentre] = useState<NearestReliefCentreResponse | null>(null);
  const [reliefCentres, setReliefCentres] = useState<ReliefCentre[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [routeWeather, setRouteWeather] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Supply request state
  const [showSupplyModal, setShowSupplyModal] = useState(false);
  const [selectedSupplies, setSelectedSupplies] = useState<string[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [requestConfirmed, setRequestConfirmed] = useState(false);
  
  // Directions state
  const [showDirections, setShowDirections] = useState(false);
  const [directions, setDirections] = useState<Array<{ step: number; instruction: string; distance: string; icon: string }>>([]);
  const [showWeatherBanner, setShowWeatherBanner] = useState(true);
  
  const weatherUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setLoading(false);
        },
        (err) => {
          console.error("Location error:", err);
          setUserLocation([12.6939, 79.9757]); // Default to Guduvancherry
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      setUserLocation([12.6939, 79.9757]);
    }
  }, []);

  // Fetch relief centres
  useEffect(() => {
    const fetchReliefCentres = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/relief-centres/`);
        if (response.ok) {
          const centres = await response.json();
          setReliefCentres(centres);
        }
      } catch (err) {
        console.error("Failed to fetch relief centres:", err);
      }
    };
    fetchReliefCentres();
  }, []);

  // Fetch weather data
  const fetchWeather = useCallback(async () => {
    if (!userLocation) return;
    
    try {
      const response = await fetch(
        `${BACKEND_URL}/weather/?latitude=${userLocation[0]}&longitude=${userLocation[1]}`
      );
      if (response.ok) {
        const data: WeatherData = await response.json();
        setWeather(data);
      }
    } catch (err) {
      console.error("Failed to fetch weather:", err);
    }
  }, [userLocation]);

  // Fetch route weather
  const fetchRouteWeather = useCallback(async () => {
    if (!routeData?.coordinates || routeData.coordinates.length === 0) return;
    
    try {
      const response = await fetch(`${BACKEND_URL}/weather/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coordinates: routeData.coordinates }),
      });
      if (response.ok) {
        const data = await response.json();
        setRouteWeather(data);
      }
    } catch (err) {
      console.error("Failed to fetch route weather:", err);
    }
  }, [routeData]);

  // Initial weather fetch
  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  // Set up weather refresh interval (every 5 minutes)
  useEffect(() => {
    weatherUpdateInterval.current = setInterval(() => {
      fetchWeather();
      if (routeData) {
        fetchRouteWeather();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      if (weatherUpdateInterval.current) {
        clearInterval(weatherUpdateInterval.current);
      }
    };
  }, [fetchWeather, fetchRouteWeather, routeData]);

  // Fetch route weather when route is available
  useEffect(() => {
    if (routeData) {
      fetchRouteWeather();
    }
  }, [routeData, fetchRouteWeather]);

  // Handle supply request
  const handleSupplyRequest = () => {
    setShowSupplyModal(true);
  };

  const toggleSupply = (supplyId: string) => {
    setSelectedSupplies((prev) =>
      prev.includes(supplyId)
        ? prev.filter((id) => id !== supplyId)
        : [...prev, supplyId]
    );
  };

  const handleConfirmRequest = async () => {
    if (selectedSupplies.length === 0) {
      setError("Please select at least one supply you need");
      return;
    }
    setShowConfirmation(true);
  };

  const handleFinalConfirm = async () => {
    if (!userLocation) {
      setError("Location not available");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Find nearest relief centre
      const response = await fetch(`${BACKEND_URL}/relief-centres/nearest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: userLocation[0],
          longitude: userLocation[1],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to find nearest relief centre");
      }

      const data: NearestReliefCentreResponse = await response.json();
      setNearestReliefCentre(data);
      setRouteData(data.route);
      
      // Generate simple directions
      generateDirections(data.route, data.relief_centre.name);
      
      setRequestConfirmed(true);
      setShowSupplyModal(false);
      setShowConfirmation(false);
      setShowDirections(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process request");
    } finally {
      setLoading(false);
    }
  };

  // Generate Google Maps-style step-by-step directions
  const generateDirections = (route: RouteResponse, centreName: string) => {
    const steps: Array<{ step: number; instruction: string; distance: string; icon: string }> = [];
    const coords = route.coordinates;
    const totalDistance = route.summary.distance;
    const totalDuration = route.summary.duration;
    
    // Start instruction
    steps.push({
      step: 1,
      instruction: "Start from your current location",
      distance: "0 m",
      icon: "📍"
    });
    
    // Calculate approximate steps based on route length
    const numSteps = Math.min(10, Math.max(4, Math.floor(coords.length / 20)));
    const stepSize = Math.max(1, Math.floor(coords.length / numSteps));
    
    // Generate intermediate steps
    for (let i = 1; i < numSteps - 1; i++) {
      const idx = i * stepSize;
      if (idx < coords.length) {
        const distance = (totalDistance / numSteps) * i;
        const distanceText = distance < 1000 
          ? `${Math.round(distance)} m` 
          : `${(distance / 1000).toFixed(1)} km`;
        
        // Determine direction icon based on step
        const icons = ["→", "↗", "→", "↘", "↓", "↙", "←", "↖", "↑", "↗"];
        const icon = icons[i % icons.length];
        
        steps.push({
          step: i + 1,
          instruction: `Continue straight for ${distanceText}`,
          distance: distanceText,
          icon: icon
        });
      }
    }
    
    // Final destination
    steps.push({
      step: steps.length + 1,
      instruction: `Arrive at ${centreName}`,
      distance: route.summary.distance_formatted,
      icon: "🏁"
    });
    
    setDirections(steps);
  };

  // Calculate map bounds
  const getBounds = (): L.LatLngBounds | null => {
    if (!userLocation) return null;
    
    const points: L.LatLng[] = [L.latLng(userLocation[0], userLocation[1])];
    
    if (routeData) {
      routeData.coordinates.forEach(([lng, lat]) => {
        points.push(L.latLng(lat, lng));
      });
    }
    
    reliefCentres.forEach((centre) => {
      points.push(L.latLng(centre.latitude, centre.longitude));
    });
    
    return L.latLngBounds(points);
  };

  const routeCoordinates = routeData?.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]) || [];

  // Get weather icon URL
  const getWeatherIconUrl = (icon: string) => {
    return `https://openweathermap.org/img/wn/${icon}@2x.png`;
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Disaster Relief Dispatch System</h1>
              <p className="text-blue-100 text-sm mt-1">Real-time assistance and routing</p>
            </div>
            
            {/* Weather Display */}
            {weather && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                  {weather.api_available && weather.icon && (
                    <img 
                      src={getWeatherIconUrl(weather.icon)} 
                      alt={weather.condition}
                      className="w-12 h-12"
                    />
                  )}
                  <div>
                    <div className="text-sm font-semibold">
                      {weather.temperature !== null ? `${Math.round(weather.temperature)}°C` : "N/A"}
                    </div>
                    <div className="text-xs text-blue-100">{weather.description}</div>
                    {weather.rainfall && weather.rainfall > 0 && (
                      <div className="text-xs text-yellow-200">🌧️ {weather.rainfall.toFixed(1)}mm/h</div>
                    )}
                  </div>
                </div>
                {!showWeatherBanner && (
                  <button
                    onClick={() => setShowWeatherBanner(true)}
                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg px-3 py-2 text-sm font-semibold text-white transition"
                    title="Show weather banner"
                  >
                    📍 Show Safety Status
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Map Area */}
        <div className="flex-1 relative">
          {/* Weather & Safety Banner - positioned near user location */}
          {userLocation && weather && showWeatherBanner && (
            <div 
              className="absolute top-4 left-4 z-[1000] max-w-md"
              style={{ zIndex: 1000 }}
            >
              <div className={`rounded-lg shadow-2xl border-2 p-4 backdrop-blur-sm ${
                weather.safety_status === "unsafe" 
                  ? "bg-red-500/95 border-red-600 text-white" 
                  : weather.safety_status === "caution"
                  ? "bg-yellow-500/95 border-yellow-600 text-white"
                  : "bg-green-500/95 border-green-600 text-white"
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {weather.api_available && weather.icon && (
                      <img 
                        src={getWeatherIconUrl(weather.icon)} 
                        alt={weather.condition}
                        className="w-10 h-10"
                      />
                    )}
                    <div>
                      <div className="font-bold text-lg">
                        {weather.temperature !== null ? `${Math.round(weather.temperature)}°C` : "N/A"}
                      </div>
                      <div className="text-sm opacity-90">{weather.description}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowWeatherBanner(false)}
                    className="text-white/80 hover:text-white text-xl font-bold leading-none"
                  >
                    ×
                  </button>
                </div>
                
                {/* Safety Status */}
                {weather.safety_message && (
                  <div className={`mt-3 p-2 rounded ${
                    weather.safety_status === "unsafe" 
                      ? "bg-red-600/50" 
                      : weather.safety_status === "caution"
                      ? "bg-yellow-600/50"
                      : "bg-green-600/50"
                  }`}>
                    <div className="font-semibold text-sm">{weather.safety_message}</div>
                  </div>
                )}
                
                {/* Calamities List */}
                {weather.calamities && weather.calamities.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="text-xs font-semibold opacity-90">Active Conditions:</div>
                    {weather.calamities.map((calamity, idx) => (
                      <div key={idx} className="text-xs opacity-90 flex items-center gap-1">
                        <span>⚠️</span>
                        <span>{calamity.type}: {calamity.description}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Additional Weather Info */}
                <div className="mt-2 flex gap-4 text-xs opacity-80">
                  {weather.rainfall !== null && weather.rainfall > 0 && (
                    <div>🌧️ {weather.rainfall.toFixed(1)}mm/h</div>
                  )}
                  {weather.wind_speed !== null && (
                    <div>💨 {weather.wind_speed.toFixed(1)} m/s</div>
                  )}
                  {weather.humidity !== null && (
                    <div>💧 {weather.humidity}%</div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {userLocation ? (
            <MapContainer
              center={userLocation}
              zoom={13}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapBounds bounds={getBounds()} />
              
              {/* User location marker */}
              <Marker position={userLocation} icon={userIcon}>
                <Popup>
                  <div className="text-center">
                    <strong>Your Location</strong>
                    {weather && (
                      <div className="text-xs mt-1">
                        {weather.temperature !== null && `${Math.round(weather.temperature)}°C`}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
              
              {/* Relief centre markers */}
              {reliefCentres.map((centre) => {
                const isNearest = nearestReliefCentre?.relief_centre.id === centre.id;
                return (
                  <Marker
                    key={centre.id}
                    position={[centre.latitude, centre.longitude]}
                    icon={isNearest ? nearestReliefCentreIcon : reliefCentreIcon}
                  >
                    <Popup>
                      <div>
                        <strong>{centre.name}</strong>
                        {centre.capacity && <div>Capacity: {centre.capacity} people</div>}
                        {isNearest && (
                          <div className="text-orange-600 font-semibold mt-1">
                            ⭐ Nearest Centre
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
              
              {/* Route polyline */}
              {routeCoordinates.length > 0 && (
                <Polyline
                  positions={routeCoordinates}
                  color="#f59e0b"
                  weight={6}
                  opacity={0.8}
                />
              )}
            </MapContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading your location...</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-96 bg-white shadow-xl flex flex-col overflow-y-auto">
          {/* Supply Request CTA */}
          {!requestConfirmed && (
            <div className="p-6 bg-gradient-to-br from-red-500 to-red-600 text-white">
              <h2 className="text-xl font-bold mb-2">Need Emergency Supplies?</h2>
              <p className="text-red-100 text-sm mb-4">
                Request assistance and get routed to the nearest relief centre
              </p>
              <button
                onClick={handleSupplyRequest}
                className="w-full bg-white text-red-600 font-bold py-3 px-4 rounded-lg shadow-lg hover:bg-red-50 transition transform hover:scale-105"
              >
                🆘 Request Supplies
              </button>
            </div>
          )}

          {/* Route Information */}
          {requestConfirmed && nearestReliefCentre && (
            <div className="p-6 border-b">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">✅</span>
                <h2 className="text-xl font-bold text-gray-800">Request Confirmed</h2>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <h3 className="font-bold text-green-800 mb-2">
                  {nearestReliefCentre.relief_centre.name}
                </h3>
                <div className="space-y-1 text-sm text-green-700">
                  <div>
                    <span className="font-semibold">Distance: </span>
                    {nearestReliefCentre.distance_formatted}
                  </div>
                  <div>
                    <span className="font-semibold">Travel Time: </span>
                    {nearestReliefCentre.duration_formatted}
                  </div>
                  {nearestReliefCentre.relief_centre.capacity && (
                    <div>
                      <span className="font-semibold">Capacity: </span>
                      {nearestReliefCentre.relief_centre.capacity} people
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Supplies */}
              <div className="mb-4">
                <h3 className="font-semibold text-gray-700 mb-2">Requested Supplies:</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedSupplies.map((supplyId) => {
                    const supply = SUPPLIES.find((s) => s.id === supplyId);
                    return supply ? (
                      <span
                        key={supplyId}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                      >
                        {supply.icon} {supply.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>

              {/* Route Weather Summary */}
              {routeWeather && routeWeather.summary && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-blue-800 mb-2">Route Weather</h3>
                  <div className="text-sm text-blue-700 space-y-1">
                    {routeWeather.summary.avg_temperature !== null && (
                      <div>Avg Temp: {routeWeather.summary.avg_temperature}°C</div>
                    )}
                    {routeWeather.summary.max_rainfall !== null && routeWeather.summary.max_rainfall > 0 && (
                      <div className="text-orange-600">
                        ⚠️ Max Rainfall: {routeWeather.summary.max_rainfall}mm/h
                      </div>
                    )}
                    {routeWeather.summary.has_alerts && (
                      <div className="text-red-600 font-semibold">⚠️ Weather Alerts Active</div>
                    )}
                  </div>
                </div>
              )}

              {/* Directions Toggle */}
              <button
                onClick={() => setShowDirections(!showDirections)}
                className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition mb-4"
              >
                {showDirections ? "Hide" : "Show"} Step-by-Step Directions
              </button>
            </div>
          )}

          {/* Google Maps Style Step-by-Step Directions */}
          {showDirections && directions.length > 0 && (
            <div className="border-t bg-white">
              <div className="sticky top-0 bg-white border-b px-4 py-3 z-10">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-800 text-lg">Directions</h3>
                  <button
                    onClick={() => setShowDirections(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                {routeData && (
                  <div className="text-sm text-gray-600 mt-1">
                    {routeData.summary.distance_formatted} • {routeData.summary.duration_formatted}
                  </div>
                )}
              </div>
              
              <div className="overflow-y-auto max-h-96">
                {directions.map((direction, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-4 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition ${
                      index === 0 ? "bg-blue-50" : ""
                    }`}
                  >
                    {/* Step Number & Icon */}
                    <div className="flex-shrink-0">
                      {index === 0 ? (
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                          {direction.step}
                        </div>
                      ) : index === directions.length - 1 ? (
                        <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">
                          {direction.step}
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-sm">
                          {direction.step}
                        </div>
                      )}
                    </div>
                    
                    {/* Direction Icon */}
                    <div className="flex-shrink-0 text-2xl w-8 h-8 flex items-center justify-center">
                      {direction.icon}
                    </div>
                    
                    {/* Instruction & Distance */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm">
                        {direction.instruction}
                      </div>
                      {index < directions.length - 1 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {direction.distance}
                        </div>
                      )}
                    </div>
                    
                    {/* Distance Badge */}
                    {index < directions.length - 1 && (
                      <div className="flex-shrink-0">
                        <div className="bg-gray-100 text-gray-700 text-xs font-semibold px-2 py-1 rounded">
                          {direction.distance}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Summary Footer */}
              {routeData && (
                <div className="bg-blue-50 border-t px-4 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-gray-700">
                      <span className="font-semibold">Total:</span> {routeData.summary.distance_formatted}
                    </div>
                    <div className="text-gray-700">
                      <span className="font-semibold">Time:</span> {routeData.summary.duration_formatted}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Weather Alerts */}
          {weather && weather.alerts && weather.alerts.length > 0 && (
            <div className="p-6 border-t bg-yellow-50">
              <h3 className="font-bold text-yellow-800 mb-2">⚠️ Weather Alerts</h3>
              {weather.alerts.map((alert, index) => (
                <div key={index} className="bg-yellow-100 border border-yellow-300 rounded p-2 mb-2">
                  <div className="font-semibold text-yellow-800">{alert.event}</div>
                  <div className="text-sm text-yellow-700">{alert.description}</div>
                </div>
              ))}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-6 border-t bg-red-50">
              <div className="bg-red-100 border border-red-300 rounded p-3">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="p-6 border-t">
              <div className="flex items-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-sm">Processing request...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Supply Selection Modal */}
      {showSupplyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative" style={{ zIndex: 10000 }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Select Supplies Needed</h2>
                <button
                  onClick={() => {
                    setShowSupplyModal(false);
                    setSelectedSupplies([]);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none"
                  style={{ zIndex: 10001 }}
                >
                  ×
                </button>
              </div>
              
              <p className="text-gray-600 mb-4">
                Select all supplies you need. You'll be routed to the nearest relief centre.
              </p>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                {SUPPLIES.map((supply) => (
                  <button
                    key={supply.id}
                    onClick={() => toggleSupply(supply.id)}
                    className={`p-4 rounded-lg border-2 transition relative ${
                      selectedSupplies.includes(supply.id)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    style={{ zIndex: 10001 }}
                  >
                    <div className="text-3xl mb-2">{supply.icon}</div>
                    <div className="font-semibold text-sm text-gray-800">{supply.name}</div>
                  </button>
                ))}
              </div>
              
              <div className="flex gap-3 relative" style={{ zIndex: 10001 }}>
                <button
                  onClick={() => {
                    setShowSupplyModal(false);
                    setSelectedSupplies([]);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRequest}
                  disabled={selectedSupplies.length === 0}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4" style={{ zIndex: 10000 }}>
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full relative" style={{ zIndex: 10001 }}>
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Confirm Request</h2>
              
              <p className="text-gray-600 mb-4">
                You've selected {selectedSupplies.length} supply type(s). We'll route you to the nearest relief centre.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="text-sm font-semibold mb-2 text-gray-800">Selected Supplies:</div>
                <div className="space-y-1">
                  {selectedSupplies.map((supplyId) => {
                    const supply = SUPPLIES.find((s) => s.id === supplyId);
                    return supply ? (
                      <div key={supplyId} className="text-sm text-gray-700">
                        {supply.icon} {supply.name}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
              
              <div className="flex gap-3 relative" style={{ zIndex: 10002 }}>
                <button
                  onClick={() => {
                    setShowConfirmation(false);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-800 font-semibold"
                >
                  Back
                </button>
                <button
                  onClick={handleFinalConfirm}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  ✅ Confirm & Route
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
