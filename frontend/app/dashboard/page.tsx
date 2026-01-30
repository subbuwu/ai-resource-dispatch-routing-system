"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for Leaflet default marker icons in Next.js
delete (L.Icon.Default.prototype as unknown as { _getIconUrl: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const userIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const reliefCentreIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const nearestReliefCentreIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [30, 50],
  iconAnchor: [15, 50],
  popupAnchor: [1, -34],
  shadowSize: [50, 50],
});

type LatLngTuple = [number, number];

type NeedOptionId = "food" | "clothes" | "medicine" | "emergency_services";

const NEED_OPTIONS: ReadonlyArray<{ id: NeedOptionId; label: string }> = [
  { id: "food", label: "Food" },
  { id: "clothes", label: "Clothes" },
  { id: "medicine", label: "Medicine" },
  { id: "emergency_services", label: "Emergency services" },
] as const;

interface ReliefCentre {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number | null;
  status: string;
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
  // OSRM-service returns "coordinates" as [lng, lat] tuples
  coordinates: [number, number][];
}

interface NearestReliefCentreResponse {
  relief_centre: ReliefCentre;
  route: RouteResponse;
  distance: number;
  duration: number;
  distance_formatted: string;
  duration_formatted: string;
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.trim() || "http://localhost:8000";

function FitBounds({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();

  useEffect(() => {
    if (!bounds) return;
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, bounds]);

  return null;
}

function formatCoords(value: number) {
  return value.toFixed(5);
}

function formatTimestamp(ms: number) {
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return String(ms);
  }
}

const DEMO_LOCATION: LatLngTuple = [12.6939, 79.9757]; // Guduvancherry, Tamil Nadu

export default function DashboardPage() {
  const [userLocation, setUserLocation] = useState<LatLngTuple | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [locationTimestamp, setLocationTimestamp] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "requesting" | "ready" | "error"
  >("idle");
  const [locationError, setLocationError] = useState<string | null>(null);

  const [reliefCentres, setReliefCentres] = useState<ReliefCentre[]>([]);
  const [reliefCentresError, setReliefCentresError] = useState<string | null>(
    null
  );
  const [loadingReliefCentres, setLoadingReliefCentres] = useState(false);

  const [nearest, setNearest] = useState<NearestReliefCentreResponse | null>(
    null
  );
  const [nearestError, setNearestError] = useState<string | null>(null);
  const [loadingNearest, setLoadingNearest] = useState(false);

  // "Need help" popup state (auto-opens 2s after map is visible)
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [selectedNeeds, setSelectedNeeds] = useState<NeedOptionId[]>([]);
  const [needsPopupDismissed, setNeedsPopupDismissed] = useState(false);
  const [needsPopupOpen, setNeedsPopupOpen] = useState(false);

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocationStatus("error");
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    setLocationStatus("requesting");
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setAccuracyMeters(
          typeof pos.coords.accuracy === "number" ? pos.coords.accuracy : null
        );
        setLocationTimestamp(pos.timestamp || Date.now());
        setLocationStatus("ready");
      },
      (err) => {
        const base =
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Enable location access for this site."
            : err.code === err.POSITION_UNAVAILABLE
              ? "Your location is currently unavailable."
              : err.code === err.TIMEOUT
                ? "Timed out while fetching your location. Try again."
                : "Failed to fetch your location.";

        setLocationStatus("error");
        setLocationError(`${base}${err.message ? ` (${err.message})` : ""}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 12_000,
        maximumAge: 10_000,
      }
    );
  }, []);

  // Initial load: request location + fetch relief centres
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    const fetchReliefCentres = async () => {
      setLoadingReliefCentres(true);
      setReliefCentresError(null);
      try {
        const res = await fetch(`${BACKEND_URL}/relief-centres/`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data: ReliefCentre[] = await res.json();
        setReliefCentres(Array.isArray(data) ? data : []);
      } catch (e) {
        setReliefCentresError(
          e instanceof Error
            ? `Failed to load relief centres (${e.message}).`
            : "Failed to load relief centres."
        );
      } finally {
        setLoadingReliefCentres(false);
      }
    };

    fetchReliefCentres();
  }, []);

  // Once we have location, fetch nearest relief centre (OSRM-backed)
  useEffect(() => {
    if (!userLocation) return;

    const fetchNearest = async () => {
      setLoadingNearest(true);
      setNearestError(null);
      try {
        const res = await fetch(`${BACKEND_URL}/relief-centres/nearest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: userLocation[0],
            longitude: userLocation[1],
          }),
        });

        if (!res.ok) {
          const errorData = (await res.json().catch(() => ({}))) as {
            detail?: string;
          };
          throw new Error(errorData.detail || `HTTP ${res.status}`);
        }

        const data: NearestReliefCentreResponse = await res.json();
        setNearest(data);
      } catch (e) {
        setNearest(null);
        setNearestError(
          e instanceof Error
            ? `Failed to find nearest relief centre (${e.message}).`
            : "Failed to find nearest relief centre."
        );
      } finally {
        setLoadingNearest(false);
      }
    };

    fetchNearest();
  }, [userLocation]);

  const routePolyline = useMemo<LatLngTuple[]>(() => {
    const coords = nearest?.route?.coordinates;
    if (!coords?.length) return [];
    return coords.map(([lng, lat]) => [lat, lng]);
  }, [nearest]);

  const bounds = useMemo(() => {
    const points: L.LatLng[] = [];

    if (userLocation) points.push(L.latLng(userLocation[0], userLocation[1]));

    for (const c of reliefCentres) {
      points.push(L.latLng(c.latitude, c.longitude));
    }

    if (routePolyline.length) {
      for (const [lat, lng] of routePolyline) points.push(L.latLng(lat, lng));
    }

    if (!points.length) return null;
    return L.latLngBounds(points);
  }, [userLocation, reliefCentres, routePolyline]);

  const showMap = userLocation !== null;

  // Auto-open the needs popup 2s after map appears (only once per session unless dismissed reset)
  useEffect(() => {
    if (!showMap) return;
    if (needsPopupDismissed) return;

    const t = window.setTimeout(() => {
      setNeedsPopupOpen(true);
    }, 2000);

    return () => window.clearTimeout(t);
  }, [showMap, needsPopupDismissed]);

  // When asked to open, programmatically open the Leaflet popup.
  useEffect(() => {
    if (!needsPopupOpen) return;
    userMarkerRef.current?.openPopup();
  }, [needsPopupOpen]);

  const toggleNeed = useCallback((id: NeedOptionId) => {
    setSelectedNeeds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col">
      {/* Top bar */}
      <div className="bg-white/95 backdrop-blur border-b border-black/5 shadow-sm z-10">
        <div className="max-w-7xl mx-auto p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-black">Dashboard</h1>
              <p className="text-sm text-black/70">
                Live location + nearest relief centre overview.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/route"
                className="px-3 py-2 rounded-md text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
              >
                Open Route Planner
              </Link>
              <button
                type="button"
                onClick={requestLocation}
                className="px-3 py-2 rounded-md text-sm font-semibold bg-black text-white hover:bg-black/90"
              >
                Refresh location
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserLocation(DEMO_LOCATION);
                  setAccuracyMeters(null);
                  setLocationTimestamp(Date.now());
                  setLocationStatus("ready");
                  setLocationError(null);
                }}
                className="px-3 py-2 rounded-md text-sm font-semibold bg-amber-500 text-black hover:bg-amber-400"
                title="Use a demo location (for development/testing)"
              >
                Use demo location
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-black/10 bg-white p-3">
              <div className="text-xs font-semibold text-black/60">
                Your location
              </div>
              <div className="mt-1 text-sm text-black">
                {locationStatus === "requesting" && "Requesting location…"}
                {locationStatus === "idle" && "Waiting to request location…"}
                {locationStatus === "error" && (
                  <span className="text-red-700">{locationError}</span>
                )}
                {locationStatus === "ready" && userLocation && (
                  <div className="space-y-1">
                    <div className="font-semibold">
                      {formatCoords(userLocation[0])},{" "}
                      {formatCoords(userLocation[1])}
                    </div>
                    <div className="text-xs text-black/60">
                      {accuracyMeters ? `±${Math.round(accuracyMeters)}m` : "—"}
                      {locationTimestamp
                        ? ` • ${formatTimestamp(locationTimestamp)}`
                        : ""}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-black/10 bg-white p-3">
              <div className="text-xs font-semibold text-black/60">
                Relief centres
              </div>
              <div className="mt-1 text-sm text-black">
                {loadingReliefCentres ? (
                  "Loading…"
                ) : reliefCentresError ? (
                  <span className="text-red-700">{reliefCentresError}</span>
                ) : (
                  <div className="space-y-1">
                    <div className="font-semibold">
                      {reliefCentres.length} active centre
                      {reliefCentres.length === 1 ? "" : "s"}
                    </div>
                    <div className="text-xs text-black/60">
                      Backend: <span className="font-mono">{BACKEND_URL}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-black/10 bg-white p-3">
              <div className="text-xs font-semibold text-black/60">
                Nearest relief centre
              </div>
              <div className="mt-1 text-sm text-black">
                {loadingNearest ? (
                  "Finding nearest…"
                ) : nearestError ? (
                  <span className="text-red-700">{nearestError}</span>
                ) : nearest ? (
                  <div className="space-y-1">
                    <div className="font-semibold">{nearest.relief_centre.name}</div>
                    <div className="text-xs text-black/60">
                      {nearest.distance_formatted} • {nearest.duration_formatted}
                    </div>
                  </div>
                ) : (
                  "—"
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-black/70">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
              Your location
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-blue-500" />
              Relief centres
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-orange-500" />
              Nearest centre
            </div>
            {routePolyline.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="inline-block h-1 w-6 rounded bg-orange-500" />
                Route to nearest
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {showMap ? (
          <MapContainer
            center={userLocation!}
            zoom={14}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FitBounds bounds={bounds} />

            {/* User */}
            <Marker
              position={userLocation!}
              icon={userIcon}
              ref={(m) => {
                userMarkerRef.current = m;
              }}
            >
              <Popup>
                <div className="text-sm text-black min-w-[220px]">
                  <div className="font-semibold">Your location</div>
                  <div className="text-black/80">
                    {formatCoords(userLocation![0])}, {formatCoords(userLocation![1])}
                  </div>
                  {accuracyMeters ? (
                    <div className="text-black/60">±{Math.round(accuracyMeters)}m</div>
                  ) : null}

                  <div className="h-px bg-black/10 my-3" />

                  <div className="font-semibold mb-2">What do you need?</div>
                  <div className="space-y-2">
                    {NEED_OPTIONS.map((opt) => (
                      <label key={opt.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedNeeds.includes(opt.id)}
                          onChange={() => toggleNeed(opt.id)}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-md text-sm font-semibold bg-white border border-black/15 hover:bg-black/5"
                      onClick={() => {
                        setNeedsPopupOpen(false);
                        setNeedsPopupDismissed(true);
                        userMarkerRef.current?.closePopup();
                      }}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-md text-sm font-semibold bg-green-600 text-white hover:bg-green-700"
                      onClick={() => {
                        // UI-only for now (hook up to backend later if needed)
                        setNeedsPopupOpen(false);
                        userMarkerRef.current?.closePopup();
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>

            {accuracyMeters && accuracyMeters > 0 ? (
              <Circle
                center={userLocation!}
                radius={accuracyMeters}
                pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.12 }}
              />
            ) : null}

            {/* Relief centres */}
            {reliefCentres.map((c) => {
              const isNearest = nearest?.relief_centre.id === c.id;
              return (
                <Marker
                  key={c.id}
                  position={[c.latitude, c.longitude]}
                  icon={isNearest ? nearestReliefCentreIcon : reliefCentreIcon}
                >
                  <Popup>
                    <div className="text-sm">
                      <div className="font-semibold">{c.name}</div>
                      {typeof c.capacity === "number" ? (
                        <div>Capacity: {c.capacity}</div>
                      ) : null}
                      {isNearest ? (
                        <div className="font-semibold text-orange-600">Nearest centre</div>
                      ) : null}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Route to nearest */}
            {routePolyline.length > 0 ? (
              <Polyline
                positions={routePolyline}
                color="#f59e0b"
                weight={5}
                opacity={0.75}
              />
            ) : null}
          </MapContainer>
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-black/70">Loading your location…</p>
              <p className="text-xs text-black/50 mt-2">
                Tip: Geolocation requires a secure context (HTTPS) or localhost.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

