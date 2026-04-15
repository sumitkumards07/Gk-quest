import React from "react";

export default function Maintenance() {
  return (
    <div className="bg-white min-h-screen flex flex-col items-center justify-center p-8 text-center font-body">
      <div className="relative mb-12 flex items-center justify-center">
        <div className="absolute w-40 h-40 bg-blue-50 blur-3xl rounded-full"></div>
        <span className="material-symbols-outlined text-8xl text-blue-600 animate-pulse relative z-10" style={{ fontVariationSettings: "'FILL' 1" }}>
          construction
        </span>
      </div>
      <h1 className="font-headline text-5xl font-black text-gray-900 tracking-tighter mb-4 italic leading-none">
        Quest Evolution In Progress
      </h1>
      <p className="text-gray-500 max-w-sm mx-auto text-lg font-medium leading-relaxed">
        Our architects are currently upgrading the GK Quest terminal. 
        We'll be back online with enhanced rewards and features shortly.
      </p>
      <div className="mt-12 flex flex-col items-center gap-6">
        <div className="flex items-center gap-3 px-6 py-2 bg-blue-50 rounded-full border border-blue-100">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
            System Upgrade Active
          </span>
        </div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Expected Completion: T-Minus 2 Hours
        </p>
      </div>
    </div>
  );
}
