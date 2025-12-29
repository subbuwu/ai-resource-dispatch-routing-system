"use client";

import { useEffect, useState, useCallback } from "react";
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

const BACKEND_URL = "http://localhost:8000";

export default function RoutePage() {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [destination, setDestination] = useState<[number, number] | null>(null);
  const [routeData, setRouteData] = useState<RouteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

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
          // Default to a location if geolocation fails (e.g., Coimbatore, India)
          setUserLocation([10.6625, 76.9922]);
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
      setUserLocation([10.6625, 76.9922]);
    }
  }, []);

  // Handle map click to set destination
  const handleMapClick = (lat: number, lng: number) => {
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
      const response = await fetch(`${BACKEND_URL}/route/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          start_lat: userLocation[0],
          start_lng: userLocation[1],
          end_lat: destination[0],
          end_lng: destination[1],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data: RouteResponse = await response.json();
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

  return (
    <div className="h-screen w-screen flex flex-col">
      {/* Header with controls */}
      <div className="bg-white shadow-md p-4 z-10">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Route Planner</h1>
          
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-sm  text-black">Your Location</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <span className="text-sm text-black">Destination</span>
            </div>
            
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
            Click on the map to set your destination
          </p>
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
            
            {/* Destination marker */}
            {destination && (
              <Marker position={destination} icon={endIcon}>
                <Popup>Destination</Popup>
              </Marker>
            )}
            
            {/* Route polyline */}
            {routeCoordinates.length > 0 && (
              <Polyline
                positions={routeCoordinates}
                color="#3b82f6"
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

