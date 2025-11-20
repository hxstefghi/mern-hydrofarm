import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

const Yearly = ({ token }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/sensors/yearly', { headers: { Authorization: `Bearer ${token}` } });
        setData(res.data || []);
      } catch (err) {
        console.error(err);
      } finally { setLoading(false); }
    };
    fetch();
  }, [token]);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Yearly Overview</h2>
      {loading ? <div>Loading...</div> : (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="avgTemp" name="Avg Temp (°C)" stroke="#f97316" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="avgHum" name="Avg Humidity (%)" stroke="#2563eb" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="avgPh" name="Avg pH" stroke="#16a34a" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 text-sm text-gray-600">Showing monthly averages for the last 12 months. Empty months may have no data.</div>
        </div>
      )}
    </div>
  );
};

export default Yearly;
