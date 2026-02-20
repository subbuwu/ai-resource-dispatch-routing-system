/**
 * API client. Public endpoints need no token; volunteer/admin endpoints send Bearer token.
 */
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export interface ApiError {
  detail: string;
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("auth_token", token);
}

export function removeAuthToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("auth_token");
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${BACKEND_URL}${endpoint}`, { ...options, headers });
  if (!response.ok) {
    const errorData: ApiError = await response.json().catch(() => ({
      detail: `HTTP ${response.status}`,
    }));
    if (response.status === 401) removeAuthToken();
    throw new Error(errorData.detail || String(response.status));
  }
  return response.json();
}

/** Requester (victim) device registration - no auth */
export async function registerRequesterDevice(
  fullName: string,
  phone: string,
  existingDeviceId?: string | null
): Promise<{ device_id: string; full_name: string; phone: string }> {
  return apiRequest<{ device_id: string; full_name: string; phone: string }>(
    "/requesters/register-device",
    {
      method: "POST",
      body: JSON.stringify({
        full_name: fullName,
        phone,
        device_id: existingDeviceId || undefined,
      }),
    }
  );
}

/** Volunteer/Admin auth */
export const authApi = {
  register: async (data: {
    name: string;
    email: string;
    password: string;
    role?: "VOLUNTEER";
    phone?: string;
  }) =>
    apiRequest<{ id: string; name: string; email: string; role: string; phone: string | null; created_at: string }>(
      "/auth/register",
      { method: "POST", body: JSON.stringify({ ...data, role: "VOLUNTEER" }) }
    ),
  login: async (email: string, password: string) =>
    apiRequest<{ access_token: string; token_type: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  getMe: async () =>
    apiRequest<{
      id: string;
      name: string;
      email: string;
      role: "VOLUNTEER" | "ADMIN";
      phone: string | null;
      created_at: string;
    }>("/auth/me"),
};

/** Victim: get request tracking (status, volunteer location, route, ETA) */
export interface TrackingData {
  request_id: string;
  status: string;
  requester_name?: string;
  requester_phone?: string;
  victim_latitude: number;
  victim_longitude: number;
  relief_centre_id: string;
  relief_centre_name?: string;
  volunteer_name?: string;
  volunteer_latitude?: number;
  volunteer_longitude?: number;
  location_updated_at?: string;
  route_to_victim?: {
    summary: { distance: number; duration: number; distance_formatted: string; duration_formatted: string };
    coordinates: number[][];
  };
  eta_minutes?: number;
}

export async function getTracking(
  requestId: string,
  deviceId: string
): Promise<TrackingData> {
  return apiRequest<TrackingData>(
    `/relief-requests/${requestId}/tracking?device_id=${encodeURIComponent(deviceId)}`
  );
}

/** Volunteer: get my active dispatch (for restoring state after refresh) */
export async function getMyActiveDispatch(): Promise<{ request_id: string | null; dispatch_id: string | null }> {
  return apiRequest<{ request_id: string | null; dispatch_id: string | null }>("/relief-requests/my-active");
}

/** Volunteer: accept a relief request */
export async function acceptRequest(requestId: string): Promise<{ ok: boolean; dispatch_id: string; request_id: string }> {
  return apiRequest<{ ok: boolean; dispatch_id: string; request_id: string }>(
    `/relief-requests/${requestId}/accept`,
    { method: "POST" }
  );
}

/** Volunteer: update request status (IN_PROGRESS | COMPLETED) */
export async function updateRequestStatus(
  requestId: string,
  status: "IN_PROGRESS" | "COMPLETED"
): Promise<{ ok: boolean; status: string }> {
  return apiRequest<{ ok: boolean; status: string }>(
    `/relief-requests/${requestId}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) }
  );
}

/** Volunteer: send current GPS for live tracking */
export async function updateDispatchLocation(
  dispatchId: string,
  latitude: number,
  longitude: number
): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(
    `/relief-requests/dispatches/${dispatchId}/location`,
    { method: "POST", body: JSON.stringify({ latitude, longitude }) }
  );
}
