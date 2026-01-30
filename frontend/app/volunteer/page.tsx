"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

const BACKEND_URL = "http://localhost:8000";

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
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number | null;
  status: string;
}

interface ReliefRequest {
  id: number;
  relief_centre_id: number;
  latitude: number;
  longitude: number;
  supplies: string[];
  status: string;
  created_at: string;
}

export default function VolunteerPage() {
  const [centres, setCentres] = useState<ReliefCentre[]>([]);
  const [selectedCentreId, setSelectedCentreId] = useState<number | null>(null);
  const [requests, setRequests] = useState<ReliefRequest[]>([]);
  const [loadingCentres, setLoadingCentres] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCentres = useCallback(async () => {
    setLoadingCentres(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/relief-centres/`);
      if (res.ok) {
        const data = await res.json();
        setCentres(data);
        if (data.length > 0) {
          setSelectedCentreId((prev) => prev ?? data[0].id);
        }
      } else {
        setError("Failed to load relief centres");
      }
    } catch {
      setError("Could not connect to server");
    } finally {
      setLoadingCentres(false);
    }
  }, []);

  useEffect(() => {
    fetchCentres();
  }, [fetchCentres]);

  useEffect(() => {
    if (!selectedCentreId) {
      setRequests([]);
      return;
    }
    let cancelled = false;
    setLoadingRequests(true);
    setError(null);
    fetch(`${BACKEND_URL}/relief-centres/${selectedCentreId}/requests`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load requests");
        return res.json();
      })
      .then((data: ReliefRequest[]) => {
        if (!cancelled) setRequests(data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load requests");
      })
      .finally(() => {
        if (!cancelled) setLoadingRequests(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCentreId]);

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
                  {centre.capacity != null && (
                    <span className="ml-2 text-slate-400">({centre.capacity} cap.)</span>
                  )}
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
              {selectedCentre.capacity != null && (
                <div>Capacity: {selectedCentre.capacity} people</div>
              )}
              <div>Status: {selectedCentre.status}</div>
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
                        req.status === "pending"
                          ? "bg-amber-100 text-amber-800"
                          : req.status === "in_progress"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {req.status.replace("_", " ")}
                    </span>
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
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
