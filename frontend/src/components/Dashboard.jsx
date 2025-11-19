import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";

const API = "http://localhost:5000/api/sensors/recent";

const Dashboard = ({ token }) => {
    const [latest, setLatest] = useState(null);
    const HISTORY_SIZE = 7;
    const [history, setHistory] = useState(() => {
        try {
            const raw = sessionStorage.getItem('hf_history');
            if (raw) return JSON.parse(raw);
        } catch {
            /* ignore parse errors */
        }
        return [];
    });
    const [thresholds, setThresholds] = useState(null);
    const mounted = useRef(false);

    const normalizePoint = (point) => {
        // Ensure numeric values where possible
        return {
            timestamp: point.timestamp || new Date().toISOString(),
            temperature: point.temperature != null ? Number(point.temperature) : null,
            humidity: point.humidity != null ? Number(point.humidity) : null,
            ph: point.ph_level != null ? Number(point.ph_level) : null,
        };
    };

    const getRecommendation = (metric, value) => {
        // return { message, status } where status is 'ok'|'low'|'high'|'unknown'
        if (value == null) return { message: 'No reading', status: 'unknown' };

        if (metric === 'temperature') {
            if (!thresholds || !thresholds.temperature) return { message: 'No thresholds available', status: 'unknown' };
            const { min, max } = thresholds.temperature;
            if (value < min) return { message: 'Temperature is below healthy range — increase warmth or move plants to a warmer area.', status: 'low' };
            if (value > max) return { message: 'Temperature is above healthy range — increase ventilation or cooling.', status: 'high' };
            return { message: 'Temperature within healthy range.', status: 'ok' };
        }

        if (metric === 'humidity') {
            if (!thresholds || !thresholds.humidity) return { message: 'No thresholds available', status: 'unknown' };
            const { min, max } = thresholds.humidity;
            if (value < min) return { message: 'Humidity is low — consider increasing misting or humidification.', status: 'low' };
            if (value > max) return { message: 'Humidity is high — improve air circulation or reduce watering.', status: 'high' };
            return { message: 'Humidity within healthy range.', status: 'ok' };
        }

        if (metric === 'ph') {
            if (!thresholds || !thresholds.ph_level) return { message: 'No thresholds available', status: 'unknown' };
            const { min, max } = thresholds.ph_level;
            if (value < min) return { message: 'pH is acidic below healthy range — consider buffering the solution (raise pH).', status: 'low' };
            if (value > max) return { message: 'pH is alkaline above healthy range — consider lowering pH.', status: 'high' };
            return { message: 'pH within healthy range.', status: 'ok' };
        }

        if (metric === 'water') {
            // water level thresholds are not part of model thresholds; apply simple heuristics
            if (typeof value === 'number') {
                if (value <= 20) return { message: 'Water level is low — refill reservoir.', status: 'low' };
                if (value >= 80) return { message: 'Water level is high — reservoir is full.', status: 'ok' };
                return { message: 'Water level is within normal range.', status: 'ok' };
            }
            // string values: check keywords
            const s = String(value).toLowerCase();
            if (s.includes('low')) return { message: 'Water level is low — refill reservoir.', status: 'low' };
            if (s.includes('high') || s.includes('full')) return { message: 'Water level is sufficient.', status: 'ok' };
            return { message: 'Water level status unknown.', status: 'unknown' };
        }

        return { message: 'No recommendation', status: 'unknown' };
    };

    const recClass = (status) => {
        if (status === 'low' || status === 'high') return 'text-red-600';
        if (status === 'ok') return 'text-green-600';
        return 'text-gray-500';
    };

    // compute recommendations for current latest readings
    const tempRec = getRecommendation('temperature', latest && latest.temperature != null ? Number(latest.temperature) : null);
    const humRec = getRecommendation('humidity', latest && latest.humidity != null ? Number(latest.humidity) : null);
    const phRec = getRecommendation('ph', latest && latest.ph_level != null ? Number(latest.ph_level) : null);
    const waterRec = getRecommendation('water', latest && latest.water_level != null ? (isNaN(Number(latest.water_level)) ? latest.water_level : Number(latest.water_level)) : null);

    const formatTime = (iso) => {
        try {
            const d = new Date(iso);
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
            return iso;
        }
    };

    useEffect(() => {
        mounted.current = true;

        // fetch thresholds (if model trained)
        const fetchThresholds = async () => {
            try {
                const res = await axios.get('/api/model/thresholds', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
                if (res.status === 200 && res.data && Object.keys(res.data).length) {
                    setThresholds(res.data);
                }
            } catch {
                // no thresholds yet or not authorized
            }
        };
        fetchThresholds();

        const fetchData = async () => {
            try {
                const res = await axios.get(API, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
                const data = res.data || {};

                // If API returns an array of recent points, normalize, sort by timestamp,
                // then use up to HISTORY_SIZE most recent entries and set latest to the newest.
                if (Array.isArray(data) && data.length > 0) {
                    const normalized = data.map(p => {
                        const tsIso = p.timestamp || p.createdAt || new Date().toISOString();
                        const ts = new Date(tsIso).getTime();
                        return { raw: p, ts, tsIso };
                    });

                    // sort ascending (old -> new)
                    normalized.sort((a, b) => a.ts - b.ts);

                    // take the most recent HISTORY_SIZE entries
                    const lastN = normalized.slice(-HISTORY_SIZE);

                    const items = lastN.map(entry => {
                        const pt = normalizePoint({ ...entry.raw, timestamp: entry.tsIso });
                        return { time: formatTime(pt.timestamp), temperature: pt.temperature, humidity: pt.humidity, ph: pt.ph };
                    });

                    setHistory(items);

                    // newest is the last element after sorting
                    const newest = normalized[normalized.length - 1];
                    setLatest(newest ? newest.raw : null);
                    return;
                }

                // single-point response (fallback)
                const now = data.timestamp || new Date().toISOString();
                const point = normalizePoint({ ...data, timestamp: now });

                setLatest(data);

                setHistory((h) => {
                    // append new point, keep last HISTORY_SIZE points
                    const next = [...h, { time: formatTime(point.timestamp), temperature: point.temperature, humidity: point.humidity, ph: point.ph }];
                    if (next.length > HISTORY_SIZE) next.splice(0, next.length - HISTORY_SIZE);
                    return next;
                });
            } catch {
                console.error("Error fetching data");
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => {
            mounted.current = false;
            clearInterval(interval);
        };
    }, [token]);

    // persist current history to sessionStorage so navigating away/back retains recent points
    useEffect(() => {
        try {
            sessionStorage.setItem('hf_history', JSON.stringify(history));
        } catch {
            /* ignore */
        }
    }, [history]);


    return (
        <div className="space-y-6">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-sm text-gray-500">Temperature</div>
                        <div className="text-2xl font-bold text-gray-900">{latest && latest.temperature != null ? `${latest.temperature}°C` : '—'}</div>
                    </div>
                    <div className="bg-green-500 text-white rounded-lg p-3 shadow-md ml-4">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v12m0 0l3-3m-3 3-3-3"></path>
                        </svg>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-sm text-gray-500">Humidity</div>
                        <div className="text-2xl font-bold text-gray-900">{latest && latest.humidity != null ? `${latest.humidity}%` : '—'}</div>
                    </div>
                    <div className="bg-green-500 text-white rounded-lg p-3 shadow-md ml-4">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2C12 2 7 8 7 12a5 5 0 0010 0c0-4-5-10-5-10z"></path>
                        </svg>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-sm text-gray-500">Water Level</div>
                        <div className="text-2xl font-bold text-gray-900">{latest && latest.water_level != null ? `${latest.water_level}` : '—'}</div>
                    </div>
                    <div className="bg-green-500 text-white rounded-lg p-3 shadow-md ml-4">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v20m0 0c4-2 6-6 6-10S16 4 12 2z"></path>
                        </svg>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-sm text-gray-500">pH Level</div>
                        <div className="text-2xl font-bold text-gray-900">{latest && latest.ph_level != null ? `${latest.ph_level}` : '—'}</div>
                    </div>
                    <div className="bg-green-500 text-white rounded-lg p-3 shadow-md ml-4">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h18M6 7v10a2 2 0 002 2h8a2 2 0 002-2V7"></path>
                        </svg>
                    </div>
                </div>
            </div>

            {/* Recommendation summary above charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[{k:'temperature', label:'Temperature', rec: tempRec}, {k:'humidity', label:'Humidity', rec: humRec}, {k:'water', label:'Water Level', rec: waterRec}, {k:'ph', label:'pH', rec: phRec}].map(item => (
                    <div key={item.k} className="bg-white p-3 rounded-lg shadow-sm flex items-start gap-3">
                        <div className={`w-2 h-8 rounded ${item.rec.status === 'ok' ? 'bg-green-400' : item.rec.status === 'unknown' ? 'bg-gray-300' : 'bg-red-400'}`}></div>
                        <div>
                            <div className="text-sm font-medium text-gray-700">{item.label}</div>
                            <div className={`text-sm mt-1 ${recClass(item.rec.status)}`}>{item.rec.message}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">Temperature</h3>
                    <div style={{ width: '100%', height: 220 }}>
                        <ResponsiveContainer>
                            <LineChart data={history}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time" />
                                <YAxis domain={[dataMin => (dataMin ? Math.floor(dataMin - 5) : 'auto'), 'auto']} />
                                <Tooltip />
                                <Line type="monotone" dataKey="temperature" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">Humidity</h3>
                    <div style={{ width: '100%', height: 220 }}>
                        <ResponsiveContainer>
                            <LineChart data={history}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="time" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="humidity" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-lg font-semibold mb-4">pH Level</h3>
                <div style={{ width: '100%', height: 220 }}>
                    <ResponsiveContainer>
                        <LineChart data={history}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="time" />
                            <YAxis domain={[0, 14]} />
                            <Tooltip />
                            <Line type="monotone" dataKey="ph" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {thresholds && Object.keys(thresholds).length > 0 && (
                <div className="mt-6">
                    <div className="rounded-lg overflow-hidden shadow-sm">
                        <div className="bg-green-600 text-white text-center font-semibold py-3 text-xl">Current Threshold</div>
                        <div className="bg-white p-6 flex items-center justify-between">
                            <div className="space-y-4">
                                <div className="text-sm text-gray-500">Temperature:</div>
                                <div className="text-sm text-gray-500">Humidity:</div>
                                <div className="text-sm text-gray-500">pH Level:</div>
                            </div>

                            <div className="flex flex-col items-end space-y-3">
                                <div className="inline-flex items-center px-4 py-2 rounded-full bg-pink-100 text-pink-800 font-medium shadow">
                                    <span className="text-sm">
                                        {thresholds.temperature ? `${Number(thresholds.temperature.min).toFixed(1)}°C - ${Number(thresholds.temperature.max).toFixed(1)}°C` : '—'}
                                    </span>
                                </div>

                                <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-800 font-medium shadow">
                                    <span className="text-sm">
                                        {thresholds.humidity ? `${Number(thresholds.humidity.min).toFixed(1)}% - ${Number(thresholds.humidity.max).toFixed(1)}%` : '—'}
                                    </span>
                                </div>

                                <div className="inline-flex items-center px-4 py-2 rounded-full bg-yellow-100 text-yellow-800 font-medium shadow">
                                    <span className="text-sm">
                                        {thresholds.ph_level ? `${Number(thresholds.ph_level.min).toFixed(2)} - ${Number(thresholds.ph_level.max).toFixed(2)}` : '—'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;