"use client";

import Link from "next/link";

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br bg-amber-50">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center max-w-xl mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Disaster Relief Dispatch
          </h1>
          <p className="text-gray-600 text-lg">
            Get help from a relief centre. Request for supplies or emergency services from your place and also find the nearest assistance if needed.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md">
          <Link
            href="/need-help"
            className="w-full sm:flex-1 flex items-center justify-center gap-3 px-8 py-5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
          >
            <span className="text-2xl">🆘</span>
            Need Help
          </Link>
          <Link
            href="/volunteer"
            className="w-full sm:flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-sm border border-slate-300 transition"
          >
            <span className="text-lg">🙌</span>
            Volunteer
          </Link>
        </div>

      </div>
    </div>
  );
}
