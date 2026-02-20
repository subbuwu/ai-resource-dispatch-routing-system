/**
 * Requester (victim) device_id and name/phone - no login.
 * Stored in localStorage; used for first-time form and for every request.
 */
const DEVICE_ID_KEY = "requester_device_id";
const REQUESTER_INFO_KEY = "requester_info";

export interface RequesterInfo {
  full_name: string;
  phone: string;
}

export function getDeviceId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(DEVICE_ID_KEY);
}

export function setDeviceId(deviceId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEVICE_ID_KEY, deviceId);
}

export function getRequesterInfo(): RequesterInfo | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(REQUESTER_INFO_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RequesterInfo;
  } catch {
    return null;
  }
}

export function setRequesterInfo(info: RequesterInfo): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REQUESTER_INFO_KEY, JSON.stringify(info));
}

/** Returns true if we have a device_id and requester info (so we can skip the form). */
export function hasRequesterSession(): boolean {
  return !!(getDeviceId() && getRequesterInfo());
}
