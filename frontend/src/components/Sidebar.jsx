import React, { useState } from "react";

const Sidebar = ({ current = "dashboard", onNavigate = () => {}, token = null, onLogout = () => {} }) => {
  const items = [
    { id: "dashboard", label: "Dashboard", icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h7v7H3V3zM14 3h7v7h-7V3zM3 14h7v7H3v-7zM14 14h7v7h-7v-7z" />
        </svg>
      ) },
    { id: "train-model", label: "Train Model", icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c1.657 0 3-1.567 3-3.5S13.657 1 12 1 9 2.567 9 4.5 10.343 8 12 8zM5 21a7 7 0 0114 0" />
        </svg>
      ) },
    { id: "yearly", label: "Yearly Overview", icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3v18h18" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 13l3-4 4 6 3-8 3 6" />
        </svg>
      ) },
    { id: "data-purging", label: "Data Purging", icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6h18M8 6v14a2 2 0 002 2h4a2 2 0 002-2V6M10 11v6M14 11v6" />
        </svg>
      ) },
    { id: "activity-log", label: "Activity Log", icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ) },
    { id: "user-management", label: "User Management", icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
        </svg>
      ) },
  ];

  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger (top-right) */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-white rounded-md shadow-sm"
        aria-label="Open menu"
      >
        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>
      </button>

      {/* Drawer for mobile */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="relative w-72 h-full bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="text-lg font-semibold">
                <span className="text-gray-800">Hydro</span>
                <span className="text-green-500">Farm</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded-md text-gray-600">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex flex-col gap-2">
              {items.map((item) => {
                const active = current === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { onNavigate(item.id); setOpen(false); }}
                    aria-current={active ? 'true' : undefined}
                    className={`group flex items-center gap-3 w-full text-left px-3 py-2 rounded-md transition-colors focus:outline-none ${active ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <span className={`shrink-0 ${active ? 'text-green-600' : 'text-gray-400'} group-hover:text-gray-600`}>
                      {item.icon}
                    </span>
                    <span className="flex-1 text-gray-700">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-6 border-t border-gray-100 pt-4 text-sm text-gray-500">
              <div className="mb-2 font-semibold text-gray-700">HydroFarm</div>
              <div className="text-xs text-gray-500">Compact hydroponic monitoring — temperature, humidity, water level and pH tracking.</div>
            </div>

            {token && (
              <div className="mt-4">
                <button onClick={() => { onLogout(); setOpen(false); }} className="w-full px-3 py-2 bg-red-500 text-white rounded">Logout</button>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:block w-72 shrink-0 sticky top-6 self-start">
        <div className="bg-white rounded-xl shadow-sm p-6 max-h-[calc(100vh-48px)] flex flex-col justify-between overflow-auto">
          <div>
            <div className="mb-6">
              <div className="text-lg font-semibold">
                <span className="text-gray-800">Hydro</span>
                <span className="text-green-500">Farm</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">Monitoring</div>
            </div>

            <nav className="flex flex-col gap-2">
                {items.map((item) => {
                  const active = current === item.id;
                  // protect certain pages when not authenticated
                  const protectedPages = ['dashboard', 'train-model'];
                  const disabled = !token && protectedPages.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => { if (!disabled) onNavigate(item.id); }}
                      aria-current={active ? 'true' : undefined}
                      className={`group flex items-center gap-3 w-full text-left px-3 py-2 rounded-md transition-colors focus:outline-none ${active ? 'bg-green-50 text-green-700 font-medium' : disabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-50'}`}
                      disabled={disabled}
                    >
                      <span className={`shrink-0 ${active ? 'text-green-600' : disabled ? 'text-gray-300' : 'text-gray-400'} group-hover:text-gray-600`}>
                        {item.icon}
                      </span>
                      <span className="flex-1 text-gray-700">{item.label}</span>
                    </button>
                  );
                })}
            </nav>

            <div className="mt-6 border-t border-black-100 pt-4 text-sm text-gray-500">
              <div className="mb-2 font-semibold text-gray-700">HydroFarm</div>
              <div className="text-xs text-gray-500">Compact hydroponic monitoring — temperature, humidity, water level and pH tracking.</div>
            </div>
          </div>

          {token && (
            <div className="mt-4">
              <button onClick={onLogout} className="w-full px-3 py-2 bg-red-500 text-white rounded">Logout</button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
