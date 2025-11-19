import React, { useState } from "react";
import Dashboard from "./components/Dashboard";
import Sidebar from "./components/Sidebar";
import TrainModel from "./components/TrainModel";


const App = () => {
  const [page, setPage] = useState("dashboard");
  const [, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <title>HydroFarm Monitoring Dashboard</title>
      <div className="w-full flex items-start gap-6">
        <Sidebar current={page} onNavigate={(p) => { setPage(p); setDrawerOpen(false); }} />

        <main className="flex-1">
          <header className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-center">HydroFarm Monitoring Dashboard</h1>
          </header>

          {page === "dashboard" && (
            <div className="">
              <Dashboard />
            </div>
          )}

          {page === 'train-model' && (
            <TrainModel />
          )}

          {page !== "dashboard" && page !== 'train-model' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-2">{page.charAt(0).toUpperCase() + page.slice(1)}</h2>
              <p className="text-sm text-gray-600">Placeholder for future {page} content.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;