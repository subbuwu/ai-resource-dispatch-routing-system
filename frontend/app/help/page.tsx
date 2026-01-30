"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
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

type LatLngTuple = [number, number];

type NeedOptionId = "food" | "clothes" | "medicine" | "emergency_services";

const NEED_OPTIONS: ReadonlyArray<{ id: NeedOptionId; label: string }> = [
  { id: "food", label: "Food" },
  { id: "clothes", label: "Clothes" },
  { id: "medicine", label: "Medicine" },
  { id: "emergency_services", label: "Emergency services" },
] as const;

const DEMO_LOCATION: LatLngTuple = [12.6939, 79.9757];

function formatCoords(value: number) {
  return value.toFixed(5);
}

export default function HelpPage() {
  const [userLocation, setUserLocation] = useState<LatLngTuple | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "requesting" | "ready" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  const userMarkerRef = useRef<L.Marker | null>(null);
  const [selectedNeeds, setSelectedNeeds] = useState<NeedOptionId[]>([]);
  const [popupDismissed, setPopupDismissed] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);

  // Weather (Tamil Nadu only via OpenWeather reverse geocoding)
  const OPENWEATHER_API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY?.trim() || "";
  const [weatherStatus, setWeatherStatus] = useState<
    "idle" | "loading" | "ready" | "error" | "unsupported_region"
  >("idle");
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weather, setWeather] = useState<{
    placeName: string;
    temperatureC: number;
    description: string;
    main: string;
    icon: string;
    windSpeedMps: number;
  } | null>(null);

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setStatus("requesting");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setAccuracyMeters(
          typeof pos.coords.accuracy === "number" ? pos.coords.accuracy : null
        );
        setStatus("ready");
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

        setStatus("error");
        setError(`${base}${err.message ? ` (${err.message})` : ""}`);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 10_000 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    if (!userLocation) return;

    const run = async () => {
      if (!OPENWEATHER_API_KEY) {
        setWeatherStatus("error");
        setWeatherError(
          "Missing OpenWeather API key. Set NEXT_PUBLIC_OPENWEATHER_API_KEY in your frontend environment."
        );
        setWeather(null);
        return;
      }

      setWeatherStatus("loading");
      setWeatherError(null);
      setWeather(null);

      try {
        // Confirm user is in Tamil Nadu, India
        const geoRes = await fetch(
          `https://api.openweathermap.org/geo/1.0/reverse?lat=${encodeURIComponent(
            userLocation[0]
          )}&lon=${encodeURIComponent(userLocation[1])}&limit=1&appid=${encodeURIComponent(
            OPENWEATHER_API_KEY
          )}`
        );
        if (!geoRes.ok) throw new Error(`Geocoding HTTP ${geoRes.status}`);
        const geoData = (await geoRes.json()) as Array<{
          name?: string;
          state?: string;
          country?: string;
        }>;

        const place = geoData?.[0];
        const state = (place?.state || "").trim();
        const country = (place?.country || "").trim();
        const placeName = (place?.name || "Your location").trim();

        if (country !== "IN" || state.toLowerCase() !== "tamil nadu") {
          setWeatherStatus("unsupported_region");
          setWeatherError(
            `Weather checks are enabled only for Tamil Nadu, India. Detected: ${state || "Unknown state"}, ${country || "Unknown country"}.`
          );
          return;
        }

        const wRes = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(
            userLocation[0]
          )}&lon=${encodeURIComponent(userLocation[1])}&appid=${encodeURIComponent(
            OPENWEATHER_API_KEY
          )}&units=metric`
        );
        if (!wRes.ok) throw new Error(`Weather HTTP ${wRes.status}`);
        const w = (await wRes.json()) as {
          weather?: Array<{ main?: string; description?: string; icon?: string }>;
          main?: { temp?: number };
          wind?: { speed?: number };
          name?: string;
        };

        const first = w.weather?.[0];
        const main = (first?.main || "Unknown").trim();
        const description = (first?.description || "Unknown").trim();
        const icon = (first?.icon || "").trim();

        setWeather({
          placeName: w.name?.trim() || placeName,
          temperatureC: typeof w.main?.temp === "number" ? w.main.temp : NaN,
          description,
          main,
          icon,
          windSpeedMps: typeof w.wind?.speed === "number" ? w.wind.speed : NaN,
        });
        setWeatherStatus("ready");
      } catch (e) {
        setWeatherStatus("error");
        setWeatherError(
          e instanceof Error ? `Weather fetch failed (${e.message}).` : "Weather fetch failed."
        );
      }
    };

    run();
  }, [userLocation, OPENWEATHER_API_KEY]);

  const hasNaturalCalamity = (() => {
    const main = weather?.main?.toLowerCase() || "";
    // OpenWeather "main" values we treat as potential disaster signals
    return (
      main === "rain" ||
      main === "drizzle" ||
      main === "thunderstorm" ||
      main === "tornado" ||
      main === "squall" ||
      main === "snow"
    );
  })();

  // Auto-open the "needs" popup 2 seconds after map is visible.
  useEffect(() => {
    if (!userLocation) return;
    if (popupDismissed) return;

    const t = window.setTimeout(() => setPopupOpen(true), 2000);
    return () => window.clearTimeout(t);
  }, [userLocation, popupDismissed]);

  useEffect(() => {
    if (!popupOpen) return;
    userMarkerRef.current?.openPopup();
  }, [popupOpen]);

  const toggleNeed = useCallback((id: NeedOptionId) => {
    setSelectedNeeds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col">
      <div className="bg-white/95 backdrop-blur border-b border-black/5 shadow-sm z-10">
        <div className="max-w-7xl mx-auto p-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-black">Need Help</h1>
            <p className="text-sm text-black/70">
              Share what you need; we’ll use your location to dispatch resources.
            </p>
            {status === "error" && error ? (
              <p className="text-sm text-red-700 mt-2">{error}</p>
            ) : null}
            {weatherStatus === "ready" && !hasNaturalCalamity ? (
              <p className="text-sm font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-3">
                There is no natural calamity in your region. Please refrain from giving false alarms.
              </p>
            ) : null}
            {weatherStatus === "error" && weatherError ? (
              <p className="text-sm text-red-700 mt-2">{weatherError}</p>
            ) : null}
            {weatherStatus === "unsupported_region" && weatherError ? (
              <p className="text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2 mt-3">
                {weatherError}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/"
              className="px-3 py-2 rounded-md text-sm font-semibold bg-white border border-black/15 hover:bg-black/5"
            >
              Back
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
                setStatus("ready");
                setError(null);
              }}
              className="px-3 py-2 rounded-md text-sm font-semibold bg-amber-500 text-black hover:bg-amber-400"
              title="Use a demo location (for development/testing)"
            >
              Use demo location
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        {userLocation ? (
          <>
            {/* Weather overlay (on the map) */}
            <div className="absolute top-4 left-4 z-1000 pointer-events-none">
              <div className="pointer-events-auto rounded-lg border border-black/10 bg-white/90 backdrop-blur p-3 shadow-sm min-w-[220px]">
                <div className="text-xs font-semibold text-black/60">Weather (Tamil Nadu)</div>
                {weatherStatus === "loading" ? (
                  <div className="text-sm text-black mt-1">Loading weather…</div>
                ) : weatherStatus === "ready" && weather ? (
                  <div className="mt-1 flex items-center gap-3">
                    {weather.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt={weather.description}
                        src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                        width={50}
                        height={50}
                      />
                    ) : null}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-black truncate">
                        {weather.placeName}
                      </div>
                      <div className="text-sm text-black/80 capitalize">
                        {weather.description}
                      </div>
                      <div className="text-xs text-black/60">
                        {Number.isFinite(weather.temperatureC)
                          ? `${Math.round(weather.temperatureC)}°C`
                          : "—"}
                        {Number.isFinite(weather.windSpeedMps)
                          ? ` • Wind ${Math.round(weather.windSpeedMps)} m/s`
                          : ""}
                      </div>
                    </div>
                  </div>
                ) : weatherStatus === "unsupported_region" ? (
                  <div className="text-sm text-black mt-1">Region not supported.</div>
                ) : weatherStatus === "error" ? (
                  <div className="text-sm text-red-700 mt-1">Weather unavailable.</div>
                ) : (
                  <div className="text-sm text-black mt-1">—</div>
                )}
              </div>
            </div>

          <MapContainer
            center={userLocation}
            zoom={14}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            <Marker
              position={userLocation}
              icon={userIcon}
              ref={(m) => {
                userMarkerRef.current = m;
              }}
            >
              <Popup>
                <div className="text-sm text-black min-w-[220px]">
                  <div className="font-semibold">Your location</div>
                  <div className="text-black/80">
                    {formatCoords(userLocation[0])}, {formatCoords(userLocation[1])}
                  </div>
                  {accuracyMeters ? (
                    <div className="text-black/60">±{Math.round(accuracyMeters)}m</div>
                  ) : null}

                  <div className="h-px bg-black/10 my-3" />

                  <div className="font-semibold mb-2">Weather</div>
                  {weatherStatus === "loading" ? (
                    <div className="text-black/70 mb-3">Loading…</div>
                  ) : weatherStatus === "ready" && weather ? (
                    <div className="text-black/80 mb-3">
                      <div className="capitalize">{weather.description}</div>
                      <div className="text-xs text-black/60">
                        {Number.isFinite(weather.temperatureC)
                          ? `${Math.round(weather.temperatureC)}°C`
                          : "—"}
                      </div>
                    </div>
                  ) : weatherStatus === "unsupported_region" ? (
                    <div className="text-black/70 mb-3">Only Tamil Nadu supported.</div>
                  ) : weatherStatus === "error" ? (
                    <div className="text-red-700 mb-3">Weather unavailable.</div>
                  ) : (
                    <div className="text-black/70 mb-3">—</div>
                  )}

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
                        setPopupOpen(false);
                        setPopupDismissed(true);
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
                        setPopupOpen(false);
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
                center={userLocation}
                radius={accuracyMeters}
                pathOptions={{
                  color: "#22c55e",
                  fillColor: "#22c55e",
                  fillOpacity: 0.12,
                }}
              />
            ) : null}
          </MapContainer>
          </>
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-black/70">
                {status === "requesting" ? "Loading your location…" : "Waiting…"}
              </p>
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

