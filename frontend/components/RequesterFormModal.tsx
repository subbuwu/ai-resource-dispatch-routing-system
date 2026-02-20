"use client";

import { useState } from "react";
import { registerRequesterDevice } from "@/lib/api";
import {
  getDeviceId,
  setDeviceId,
  setRequesterInfo,
  type RequesterInfo,
} from "@/lib/requester";

interface RequesterFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  loading?: boolean;
}

export default function RequesterFormModal({
  open,
  onClose,
  onSuccess,
  loading = false,
}: RequesterFormModalProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || !phone.trim()) {
      setError("Please enter your name and phone number.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await registerRequesterDevice(
        fullName.trim(),
        phone.trim(),
        getDeviceId()
      );
      setDeviceId(res.device_id);
      setRequesterInfo({ full_name: res.full_name, phone: res.phone });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Quick details
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          We need your name and phone so volunteers can reach you. Stored only on this device.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g. Jane Doe"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g. +1 234 567 8900"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loading}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
