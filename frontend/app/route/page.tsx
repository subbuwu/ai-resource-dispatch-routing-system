"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { apiRequest } from "@/lib/api";

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as unknown as { _getIconUrl: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom icons
const startIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const endIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Relief centre icon (blue)
const reliefCentreIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Nearest relief centre icon (highlighted - orange)
const nearestReliefCentreIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [30, 50],
  iconAnchor: [15, 50],
  popupAnchor: [1, -34],
  shadowSize: [50, 50],
});

// Emergency service icons
const fireStationIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const ambulanceIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Component to handle map click
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  const map = useMap();
  
  useEffect(() => {
    const handleClick = (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    };
    
    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [map, onMapClick]);
  
  return null;
}

// Component to fit map bounds
function MapBounds({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, bounds]);
  
  return null;
}

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
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

type ReliefSupplyType = "food" | "clothes" | "medicine";

const RELIEF_SUPPLIES_BY_NAME: Record<string, ReliefSupplyType[]> = {
  "Guduvancherry Central Relief Centre": ["food", "clothes", "medicine"],
  "Maraimalai Nagar Emergency Shelter": ["food", "medicine"],
  "Potheri Relief Camp": ["clothes", "medicine"],
  "Singaperumal Koil Relief Centre": ["food"],
  "Padappai Emergency Camp": ["clothes"],
  "Chengalpattu District Relief Centre": ["food", "clothes", "medicine"],
  "Tambaram Relief Centre": ["food", "medicine"],
};

type EmergencyServiceType = "Fire Station" | "Ambulance";

interface EmergencyServiceLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: EmergencyServiceType;
}

// Static emergency service locations around Guduvancherry / Chengalpattu area
const EMERGENCY_SERVICES: EmergencyServiceLocation[] = [
  {
    id: "guduvancherry-fire",
    name: "Guduvancherry Fire Station",
    latitude: 12.695,
    longitude: 79.9735,
    type: "Fire Station",
  },
  {
    id: "chengalpattu-fire",
    name: "Chengalpattu Fire Station",
    latitude: 12.69,
    longitude: 79.965,
    type: "Fire Station",
  },
  {
    id: "guduvancherry-ambulance",
    name: "Guduvancherry Government Hospital Ambulance",
    latitude: 12.6975,
    longitude: 79.979,
    type: "Ambulance",
  },
  {
    id: "tambaram-ambulance",
    name: "Tambaram Emergency Ambulance Point",
    latitude: 12.93,
    longitude: 80.095,
    type: "Ambulance",
  },
];

interface NearestReliefCentreResponse {
  relief_centre: ReliefCentre;
  route: RouteResponse;
  distance: number;
  duration: number;
  distance_formatted: string;
  duration_formatted: string;
}

function RoutePageContent() {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [routeData, setRouteData] = useState<RouteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  // Relief centre state
  const [reliefCentres, setReliefCentres] = useState<ReliefCentre[]>([]);
  const [nearestReliefCentre, setNearestReliefCentre] = useState<NearestReliefCentreResponse | null>(null);
  const [loadingReliefCentres, setLoadingReliefCentres] = useState(false);

  // Fetch all relief centres on page load
  useEffect(() => {
    const fetchReliefCentres = async () => {
      setLoadingReliefCentres(true);
      try {
        const centres = await apiRequest<ReliefCentre[]>("/relief-centres/");
        setReliefCentres(centres);
      } catch (err) {
        console.error("Error fetching relief centres:", err);
      } finally {
        setLoadingReliefCentres(false);
      }
    };
    
    fetchReliefCentres();
  }, []);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setLoading(false);
          setLocationError(null);
        },
        (err) => {
          setLocationError(`Location error: ${err.message}`);
          setLoading(false);
          // Default to a location if geolocation fails (Guduvancherry area, Tamil Nadu)
          setUserLocation([12.6939, 79.9757]);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser");
      // Default location
      setUserLocation([12.6939, 79.9757]);
    }
  }, []);

  // Find nearest relief centre when user location is available
  useEffect(() => {
    if (userLocation && reliefCentres.length > 0) {
      const findNearest = async () => {
        try {
          setLoading(true);
          const data = await apiRequest<NearestReliefCentreResponse>("/relief-centres/nearest", {
            method: "POST",
            body: JSON.stringify({
              latitude: userLocation[0],
              longitude: userLocation[1],
            }),
          });
          setNearestReliefCentre(data);
          setRouteData(data.route);
          setDestination([data.relief_centre.latitude, data.relief_centre.longitude]);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to find nearest relief centre");
          console.error("Nearest relief centre error:", err);
        } finally {
          setLoading(false);
        }
      };

      findNearest();
    }
  }, [userLocation, reliefCentres.length]);

  // Handle map click to set destination (manual override)
  const handleMapClick = (lat: number, lng: number) => {
    // Clear nearest relief centre selection when manually setting destination
    setNearestReliefCentre(null);
    setDestination([lat, lng]);
    setRouteData(null);
    setError(null);
  };

  // Fetch route from backend
  const fetchRoute = useCallback(async () => {
    if (!userLocation || !destination) {
      setError("Please set both start and destination locations");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await apiRequest<RouteResponse>("/route/", {
        method: "POST",
        body: JSON.stringify({
          start_lat: userLocation[0],
          start_lng: userLocation[1],
          end_lat: destination[0],
          end_lng: destination[1],
        }),
      });
      setRouteData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch route");
      console.error("Route fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [userLocation, destination]);

  // Auto-fetch route when destination is set (but not on initial load)
  useEffect(() => {
    if (userLocation && destination && !routeData && !loading) {
      // Small delay to ensure map is ready
      const timer = setTimeout(() => {
        fetchRoute();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [userLocation, destination, fetchRoute]);

  // Calculate bounds for map view
  const getBounds = (): L.LatLngBounds | null => {
    if (!userLocation) return null;
    
    const points: L.LatLng[] = [L.latLng(userLocation[0], userLocation[1])];
    
    // Include all relief centres in bounds
    reliefCentres.forEach(centre => {
      points.push(L.latLng(centre.latitude, centre.longitude));
    });

    // Include emergency service locations
    EMERGENCY_SERVICES.forEach((svc) => {
      points.push(L.latLng(svc.latitude, svc.longitude));
    });
    
    if (destination) {
      points.push(L.latLng(destination[0], destination[1]));
    }
    if (routeData) {
      routeData.coordinates.forEach(([lng, lat]) => {
        points.push(L.latLng(lat, lng));
      });
    }
    
    return L.latLngBounds(points);
  };

  // Convert coordinates from [lng, lat] to [lat, lng] for Leaflet
  const routeCoordinates = routeData?.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]) || [];

  const reliefCentreWithSupplies = useMemo(
    () =>
      reliefCentres.map((centre) => ({
        ...centre,
        supplies: RELIEF_SUPPLIES_BY_NAME[centre.name] ?? [],
      })),
    [reliefCentres]
  );

  return (
    <div className="h-screen w-screen flex flex-col">
      {/* Header with controls */}
      <div className="bg-white shadow-md p-4 z-10">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Route Planner</h1>
          
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-sm text-black">Your Location</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-black">Relief Centres</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
              <span className="text-sm text-black">Nearest Centre</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-violet-600 rounded-full"></div>
              <span className="text-sm text-black">Emergency service - Fire Station</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-400 rounded-full border border-yellow-600"></div>
              <span className="text-sm text-black">Emergency service - Ambulance</span>
            </div>
            {destination && !nearestReliefCentre && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span className="text-sm text-black">Destination</span>
              </div>
            )}
            
            {locationError && (
              <div className="text-sm text-yellow-600 bg-yellow-50 px-3 py-1 rounded">
                {locationError}
              </div>
            )}
            
            {error && (
              <div className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded">
                {error}
              </div>
            )}
            
            {routeData && (
              <div className="flex gap-4 text-sm">
                <div className="bg-blue-50 px-3 py-1 rounded text-black">
                  <span className="font-semibold">Distance: </span>
                  {routeData.summary.distance_formatted}
                </div>
                <div className="bg-blue-50 px-3 py-1 rounded text-black">
                  <span className="font-semibold">Duration: </span>
                  {routeData.summary.duration_formatted}
                </div>
              </div>
            )}
            
            {loading && (
              <div className="text-sm text-blue-600">Loading route...</div>
            )}
            
            <button
              onClick={fetchRoute}
              disabled={!userLocation || !destination || loading}
              className="ml-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Calculate Route
            </button>
          </div>
          
          <p className="text-sm text-gray-600 mt-2">
            {nearestReliefCentre 
              ? `Nearest relief centre: ${nearestReliefCentre.relief_centre.name}`
              : "Click on the map to set your destination"}
          </p>
          
          {/* Relief Centre Info Panel */}
          {nearestReliefCentre && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 text-black rounded-lg">
              <h3 className="font-bold text-lg text-black mb-2">
                Nearest Relief Centre
              </h3>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="font-semibold">Name: </span>
                  {nearestReliefCentre.relief_centre.name}
                </div>
                <div>
                  <span className="font-semibold">Distance: </span>
                  {nearestReliefCentre.distance_formatted}
                </div>
                <div>
                  <span className="font-semibold">Travel Time: </span>
                  {nearestReliefCentre.duration_formatted}
                </div>
                {RELIEF_SUPPLIES_BY_NAME[nearestReliefCentre.relief_centre.name]?.length ? (
                  <div>
                    <span className="font-semibold">Supplies: </span>
                    {RELIEF_SUPPLIES_BY_NAME[nearestReliefCentre.relief_centre.name]
                      .map((s) =>
                        s === "food"
                          ? "Food"
                          : s === "clothes"
                          ? "Clothes"
                          : "Medicine"
                      )
                      .join(", ")}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
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
            
            <MapClickHandler onMapClick={handleMapClick} />
            <MapBounds bounds={getBounds()} />
            
            {/* User location marker */}
            <Marker position={userLocation} icon={startIcon}>
              <Popup>Your Location</Popup>
            </Marker>
            
            {/* Relief centre markers */}
            {reliefCentreWithSupplies.map((centre) => {
              const isNearest = nearestReliefCentre?.relief_centre.id === centre.id;
              const supplies = centre.supplies;
              return (
                <Marker
                  key={centre.id}
                  position={[centre.latitude, centre.longitude]}
                  icon={isNearest ? nearestReliefCentreIcon : reliefCentreIcon}
                >
                  <Popup>
                    <div className="text-sm text-black">
                      <strong className="block mb-1">{centre.name}</strong>
                      {supplies.length ? (
                        <div className="mb-1">
                          <span className="font-semibold">Supplies: </span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {supplies.map((s) => (
                              <span
                                key={s}
                                className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200"
                              >
                                {s === "food"
                                  ? "Food"
                                  : s === "clothes"
                                  ? "Clothes"
                                  : "Medicine"}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {isNearest && (
                        <div className="text-orange-600 font-semibold">
                          Nearest Centre
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Emergency service markers */}
            {EMERGENCY_SERVICES.map((svc) => (
              <Marker
                key={svc.id}
                position={[svc.latitude, svc.longitude]}
                icon={svc.type === "Fire Station" ? fireStationIcon : ambulanceIcon}
              >
                <Popup>
                  <div className="text-sm text-black">
                    <strong className="block mb-1">{svc.name}</strong>
                    <div>{`Emergency service - ${svc.type}`}</div>
                  </div>
                </Popup>
              </Marker>
            ))}
            
            {/* Destination marker (if manually set) */}
            {destination && !nearestReliefCentre && (
              <Marker position={destination} icon={endIcon}>
                <Popup>Destination</Popup>
              </Marker>
            )}
            
            {/* Route polyline (to nearest relief centre or manual destination) */}
            {routeCoordinates.length > 0 && (
              <Polyline
                positions={routeCoordinates}
                color={nearestReliefCentre ? "#f59e0b" : "#3b82f6"}
                weight={5}
                opacity={0.7}
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
    </div>
  );
}

export default function RoutePage() {
  return <RoutePageContent />;
}

