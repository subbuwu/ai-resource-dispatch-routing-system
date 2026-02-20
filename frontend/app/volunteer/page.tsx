"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { apiRequest, acceptRequest, updateRequestStatus, updateDispatchLocation, getMyActiveDispatch } from "@/lib/api";

// Supply id -> label for display (match Need Help page)
const SUPPLY_LABELS: Record<string, string> = {
  food: "Food & Water",
  medical: "Medical Supplies",
  shelter: "Shelter",
  clothing: "Clothing",
  blankets: "Blankets",
  hygiene: "Hygiene Items",
  batteries: "Batteries & Flashlights",
  communication: "Communication Devices",
};

interface ReliefCentre {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface ReliefRequest {
  id: string;
  relief_centre_id: string;
  requester_name: string;
  requester_phone: string;
  latitude: number;
  longitude: number;
  supplies: string[];
  status: string;
  created_at: string;
}

const POLL_INTERVAL_MS = 5000;

function VolunteerPageContent() {
  const [centres, setCentres] = useState<ReliefCentre[]>([]);
  const [selectedCentreId, setSelectedCentreId] = useState<string | null>(null);
  const [requests, setRequests] = useState<ReliefRequest[]>([]);
  const [loadingCentres, setLoadingCentres] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [myDispatchId, setMyDispatchId] = useState<string | null>(null);
  const [myRequestId, setMyRequestId] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [locationSharing, setLocationSharing] = useState(false);
  const locationWatchRef = useRef<number | null>(null);

  const fetchCentres = useCallback(async () => {
    setLoadingCentres(true);
    setError(null);
    try {
      const data = await apiRequest<ReliefCentre[]>("/relief-centres/");
      setCentres(data);
      if (data.length > 0) {
        setSelectedCentreId((prev) => prev ?? data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect to server");
    } finally {
      setLoadingCentres(false);
    }
  }, []);

  useEffect(() => {
    fetchCentres();
  }, [fetchCentres]);

  // Restore "my active dispatch" after refresh
  useEffect(() => {
    getMyActiveDispatch()
      .then(({ request_id, dispatch_id }) => {
        if (request_id && dispatch_id) {
          setMyRequestId(request_id);
          setMyDispatchId(dispatch_id);
        }
      })
      .catch(() => {});
  }, []);

  const fetchRequests = useCallback(async () => {
    if (!selectedCentreId) return;
    setError(null);
    try {
      const data = await apiRequest<ReliefRequest[]>(`/relief-centres/${selectedCentreId}/requests`);
      setRequests(data);
    } catch {
      setError("Failed to load requests");
    } finally {
      setLoadingRequests(false);
    }
  }, [selectedCentreId]);

  useEffect(() => {
    if (!selectedCentreId) {
      setRequests([]);
      return;
    }
    setLoadingRequests(true);
    fetchRequests();
  }, [selectedCentreId, fetchRequests]);

  // Realtime polling: refresh requests every 5s
  useEffect(() => {
    if (!selectedCentreId) return;
    const interval = setInterval(fetchRequests, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [selectedCentreId, fetchRequests]);

  const handleAccept = async (requestId: string) => {
    setAcceptingId(requestId);
    try {
      const res = await acceptRequest(requestId);
      setMyDispatchId(res.dispatch_id);
      setMyRequestId(res.request_id);
      await fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept");
    } finally {
      setAcceptingId(null);
    }
  };

  const handleStatus = async (requestId: string, status: "IN_PROGRESS" | "COMPLETED") => {
    setStatusUpdating(true);
    try {
      await updateRequestStatus(requestId, status);
      if (status === "COMPLETED") {
        setLocationSharing(false);
        if (locationWatchRef.current != null) {
          navigator.geolocation.clearWatch(locationWatchRef.current);
          locationWatchRef.current = null;
        }
        setMyDispatchId(null);
        setMyRequestId(null);
      }
      await fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setStatusUpdating(false);
    }
  };

  // Share live location when IN_PROGRESS and locationSharing is on
  useEffect(() => {
    if (!locationSharing || !myDispatchId) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        updateDispatchLocation(myDispatchId, pos.coords.latitude, pos.coords.longitude).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    locationWatchRef.current = watchId;
    return () => {
      navigator.geolocation.clearWatch(watchId);
      locationWatchRef.current = null;
    };
  }, [locationSharing, myDispatchId]);

  const selectedCentre = centres.find((c) => c.id === selectedCentreId);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-slate-700 text-white shadow z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="text-slate-200 hover:text-white text-sm font-medium"
              >
                ← Home
              </Link>
              <h1 className="text-xl font-bold">Volunteer</h1>
            </div>
            <p className="text-slate-300 text-sm hidden sm:block">
              View your relief centre and incoming requests
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        <section className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Your relief centre
          </h2>
          {loadingCentres ? (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-400 border-t-transparent" />
              <span>Loading relief centres…</span>
            </div>
          ) : centres.length === 0 ? (
            <p className="text-gray-600">No relief centres found.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {centres.map((centre) => (
                <button
                  key={centre.id}
                  onClick={() => setSelectedCentreId(centre.id)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                    selectedCentreId === centre.id
                      ? "bg-slate-700 text-white"
                      : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {centre.name}
                </button>
              ))}
            </div>
          )}
        </section>

        {selectedCentre && (
          <section className="mb-6 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-2">
              {selectedCentre.name}
            </h3>
            <div className="text-sm text-gray-600">
              <div>Location: {selectedCentre.latitude.toFixed(4)}, {selectedCentre.longitude.toFixed(4)}</div>
            </div>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Requests for this centre
          </h2>
          {loadingRequests ? (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-400 border-t-transparent" />
              <span>Loading requests…</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
              {error}
            </div>
          ) : requests.length === 0 ? (
            <div className="p-6 rounded-xl bg-white border border-gray-200 text-center text-gray-500">
              No requests yet for this relief centre.
            </div>
          ) : (
            <ul className="space-y-4">
              {requests.map((req) => (
                <li
                  key={req.id}
                  className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="text-xs text-gray-500">
                      Request #{req.id} · {new Date(req.created_at).toLocaleString()}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${
                        req.status === "PENDING"
                          ? "bg-amber-100 text-amber-800"
                          : req.status === "IN_PROGRESS"
                          ? "bg-blue-100 text-blue-800"
                          : req.status === "ACCEPTED"
                          ? "bg-purple-100 text-purple-800"
                          : req.status === "COMPLETED"
                          ? "bg-green-100 text-green-800"
                          : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {req.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 mb-1">
                    <strong>{req.requester_name}</strong> · {req.requester_phone}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    Location: {req.latitude.toFixed(4)}, {req.longitude.toFixed(4)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {req.supplies.map((id) => (
                      <span
                        key={id}
                        className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-sm"
                      >
                        {SUPPLY_LABELS[id] ?? id}
                      </span>
                    ))}
                  </div>
                  {req.status === "PENDING" && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => handleAccept(req.id)}
                        disabled={acceptingId !== null || !!myRequestId}
                        className="w-full py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {acceptingId === req.id ? "Accepting…" : "Accept request"}
                      </button>
                    </div>
                  )}
                  {req.status === "ACCEPTED" && myRequestId === req.id && (
                    <div className="mt-3 space-y-2">
                      <button
                        type="button"
                        onClick={() => handleStatus(req.id, "IN_PROGRESS")}
                        disabled={statusUpdating}
                        className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        Start trip
                      </button>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${req.latitude},${req.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full py-2 text-center bg-slate-100 text-slate-800 rounded-lg font-medium hover:bg-slate-200"
                      >
                        Open in Google Maps
                      </a>
                    </div>
                  )}
                  {req.status === "IN_PROGRESS" && myRequestId === req.id && (
                    <div className="mt-3 space-y-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={locationSharing}
                          onChange={(e) => setLocationSharing(e.target.checked)}
                        />
                        Share my location with requester
                      </label>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${req.latitude},${req.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full py-2 text-center bg-slate-100 text-slate-800 rounded-lg font-medium hover:bg-slate-200"
                      >
                        Navigate (Google Maps)
                      </a>
                      <button
                        type="button"
                        onClick={() => handleStatus(req.id, "COMPLETED")}
                        disabled={statusUpdating}
                        className="w-full py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                      >
                        Mark completed
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

export default function VolunteerPage() {
  return (
    <ProtectedRoute requireVolunteer>
      <VolunteerPageContent />
    </ProtectedRoute>
  );
}
