import React, { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import Sidebar from "./components/Sidebar";
import TrainModel from "./components/TrainModel";
import Login from "./components/Login";
import UserManagement from "./components/UserManagement";
import Yearly from "./components/Yearly";


const App = () => {
  const [page, setPage] = useState("dashboard");
  const [, setDrawerOpen] = useState(false);
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem('hf_token'); } catch { return null; }
  });

  useEffect(() => {
    if (token) localStorage.setItem('hf_token', token);
    else localStorage.removeItem('hf_token');
  }, [token]);

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('hf_user');
  };

  const containerClass = token ? 'w-full flex items-start gap-6' : 'w-full flex items-center justify-center min-h-[60vh]';

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <title>HydroFarm Monitoring Dashboard</title>
      <div className={containerClass}>
        {token && <Sidebar current={page} onNavigate={(p) => { setPage(p); setDrawerOpen(false); }} token={token} onLogout={handleLogout} />}

        <main className="flex-1">
          <header className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-center">HydroFarm Monitoring Dashboard</h1>
          </header>

          {!token ? (
            <div className="pt-8">
              <Login onLogin={(tok) => { setToken(tok); setPage('dashboard'); }} />
            </div>
          ) : (
            <>


              {page === "dashboard" && (
                <div className="">
                  <Dashboard token={token} />
                </div>
              )}

              {page === 'train-model' && (
                <TrainModel token={token} />
              )}

              {page === 'user-management' && (
                <UserManagement token={token} />
              )}

              {page === 'yearly' && (
                <Yearly token={token} />
              )}

              {page !== "dashboard" && page !== 'train-model' && page !== 'user-management' && page !== 'yearly' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold mb-2">{page.charAt(0).toUpperCase() + page.slice(1)}</h2>
                  <p className="text-sm text-gray-600">Placeholder for future {page} content.</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;