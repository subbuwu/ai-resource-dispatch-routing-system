"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import ProtectedRoute from "@/components/ProtectedRoute";
import { apiRequest } from "@/lib/api";

const defaultIcon = L.icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
const greenIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface ReliefCentre {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

function MapClickHandler({
  onMapClick,
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  const map = useMap();
  useEffect(() => {
    const handleClick = (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    };
    map.on("click", handleClick);
    return () => map.off("click", handleClick);
  }, [map, onMapClick]);
  return null;
}

function AdminPageContent() {
  const [centres, setCentres] = useState<ReliefCentre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formLat, setFormLat] = useState("");
  const [formLng, setFormLng] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editLat, setEditLat] = useState("");
  const [editLng, setEditLng] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchCentres = useCallback(async () => {
    setError(null);
    try {
      const data = await apiRequest<ReliefCentre[]>("/admin/relief-centres");
      setCentres(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load centres");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCentres();
  }, [fetchCentres]);

  const handleMapClick = (lat: number, lng: number) => {
    setFormLat(lat.toFixed(6));
    setFormLng(lng.toFixed(6));
  };

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = formName.trim();
    const lat = parseFloat(formLat);
    const lng = parseFloat(formLng);
    if (!name || isNaN(lat) || isNaN(lng)) {
      setError("Name, latitude and longitude are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest<ReliefCentre>("/admin/relief-centres", {
        method: "POST",
        body: JSON.stringify({ name, latitude: lat, longitude: lng }),
      });
      setFormName("");
      setFormLat("");
      setFormLng("");
      await fetchCentres();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create centre");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (c: ReliefCentre) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditLat(String(c.latitude));
    setEditLng(String(c.longitude));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditLat("");
    setEditLng("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const name = editName.trim();
    const lat = parseFloat(editLat);
    const lng = parseFloat(editLng);
    if (!name || isNaN(lat) || isNaN(lng)) return;
    setSubmitting(true);
    setError(null);
    try {
      await apiRequest<ReliefCentre>(`/admin/relief-centres/${editingId}`, {
        method: "PUT",
        body: JSON.stringify({ name, latitude: lat, longitude: lng }),
      });
      cancelEdit();
      await fetchCentres();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update centre");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this relief centre? This cannot be undone.")) return;
    setError(null);
    try {
      await apiRequest(`/admin/relief-centres/${id}`, { method: "DELETE" });
      if (editingId === id) cancelEdit();
      await fetchCentres();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete centre");
    }
  };

  const defaultCenter: [number, number] = [20.5937, 78.9629];
  const hasNewMarker =
    formLat && formLng && !isNaN(parseFloat(formLat)) && !isNaN(parseFloat(formLng));

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-slate-800 text-white shadow z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-slate-200 hover:text-white text-sm font-medium">
                ← Home
              </Link>
              <h1 className="text-xl font-semibold">Admin · Relief Centres</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map: click to set lat/lng for new centre */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <h2 className="font-medium text-gray-800">Map · Click to set location for new centre</h2>
            </div>
            <div className="h-[400px] relative">
              <MapContainer
                center={defaultCenter}
                zoom={5}
                className="h-full w-full"
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickHandler onMapClick={handleMapClick} />
                {centres.map((c) => (
                  <Marker
                    key={c.id}
                    position={[c.latitude, c.longitude]}
                    icon={defaultIcon}
                  >
                    <Popup>{c.name}</Popup>
                  </Marker>
                ))}
                {hasNewMarker && (
                  <Marker
                    position={[parseFloat(formLat), parseFloat(formLng)]}
                    icon={greenIcon}
                  >
                    <Popup>New: {formName || "—"}</Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          </section>

          {/* Form: add new centre */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h2 className="font-medium text-gray-800 mb-3">Add relief centre</h2>
            <form onSubmit={handleSubmitNew} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g. Central Relief Camp"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Latitude</label>
                  <input
                    type="text"
                    value={formLat}
                    onChange={(e) => setFormLat(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g. 20.5937"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Longitude</label>
                  <input
                    type="text"
                    value={formLng}
                    onChange={(e) => setFormLng(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g. 78.9629"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Add centre"}
              </button>
            </form>
          </section>
        </div>

        {/* List of centres */}
        <section className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <h2 className="font-medium text-gray-800">All relief centres</h2>
          </div>
          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading…</div>
          ) : centres.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No relief centres yet. Add one using the map and form above.</div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {centres.map((c) => (
                <li key={c.id} className="p-4 flex flex-wrap items-center justify-between gap-2">
                  {editingId === c.id ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 flex-1 min-w-[120px]"
                        />
                        <input
                          type="text"
                          value={editLat}
                          onChange={(e) => setEditLat(e.target.value)}
                          className="w-24 border border-gray-300 rounded px-2 py-1"
                          placeholder="Lat"
                        />
                        <input
                          type="text"
                          value={editLng}
                          onChange={(e) => setEditLng(e.target.value)}
                          className="w-24 border border-gray-300 rounded px-2 py-1"
                          placeholder="Lng"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={submitting}
                          className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-3 py-1 bg-gray-200 text-gray-800 rounded text-sm hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-gray-800">
                        <span className="font-medium">{c.name}</span>
                        <span className="text-gray-500 text-sm ml-2">
                          {c.latitude.toFixed(4)}, {c.longitude.toFixed(4)}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          className="px-3 py-1 bg-slate-100 text-slate-700 rounded text-sm hover:bg-slate-200"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          className="px-3 py-1 bg-red-50 text-red-700 rounded text-sm hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </>
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

export default function AdminPage() {
  return (
    <ProtectedRoute requireAdmin>
      <AdminPageContent />
    </ProtectedRoute>
  );
}
