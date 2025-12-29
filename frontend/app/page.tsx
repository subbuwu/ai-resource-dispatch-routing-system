"use client";

import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();               

  return (
    <div className="relative min-h-screen">
        <div className="absolute ">
            <iframe src="/dashboard" className="w-full h-full border-0"></iframe>
        </div>
        <div className="absolute inset-0 bg-white/40 backdrop-blur-md"></div>
        <div className="relative z-10 min-h-screen flex items-center justify-center bg-amber-50">
            <button onClick={() => router.push("/dashboard")}
            className="px-8 py-4 text-lg font-bold text-white bg-red-600 rounded-lg
            shadow-lg hover:bg-red-700 transition">
            Need Help!
            </button>
        </div>
    </div>
  );
}
