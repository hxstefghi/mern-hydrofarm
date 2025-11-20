import React, { useState } from 'react';
import api from '../lib/api';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // only login is allowed here; admin creates users via the admin panel
  const [status, setStatus] = useState('');
  const [errorDetails, setErrorDetails] = useState(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setStatus('');
    try {
      const res = await api.post('/api/auth/login', { email, password });
      if (res.data && res.data.token) {
        localStorage.setItem('hf_token', res.data.token);
        localStorage.setItem('hf_user', JSON.stringify(res.data.user || { email }));
        setStatus('');
        setErrorDetails(null);
        onLogin && onLogin(res.data.token);
      } else {
        setStatus('Unexpected response');
      }
    } catch (err) {
      console.error(err);
      // Build a helpful error details object for debugging
      const details = {
        message: err?.message || 'Unknown error',
        status: err?.response?.status || null,
        body: err?.response?.data || null,
        headers: err?.response?.headers || null,
      };
      setErrorDetails(details);
      setShowErrorDetails(true);
      setStatus(details.status ? `Failed (${details.status})` : 'Failed (network)');
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="backdrop-blur-sm bg-white/60 rounded-2xl shadow-lg p-8 text-center">
        <div className="mb-2">
          <div className="text-2xl font-bold text-gray-800">Hydro<span className="text-green-600">Farm</span></div>
          <div className="text-xs uppercase text-gray-500 tracking-widest">Hydroponic</div>
        </div>

        <h1 className="text-2xl font-semibold mt-4 mb-6">Login</h1>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <input
              aria-label="email"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 shadow-sm placeholder-gray-400"
              placeholder="Username"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="relative">
            <input
              aria-label="password"
              type={showPass ? 'text' : 'password'}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 shadow-sm placeholder-gray-400"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-3 text-gray-500">
              {showPass ? 'Hide' : 'Show'}
            </button>
          </div>

          <div>
            <button type="submit" className="w-full bg-green-600 text-white rounded-lg py-3 font-medium shadow">Login</button>
          </div>

          {/* Registration removed; admins create users via User Management */}

          {status && <div className="text-sm text-red-600">{status}</div>}
          {errorDetails && (
            <div className="mt-2 text-xs text-gray-700 bg-gray-50 border rounded p-2">
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm text-red-600">Error details</div>
                <button type="button" className="text-xs text-blue-600" onClick={() => setShowErrorDetails(s => !s)}>{showErrorDetails ? 'Hide' : 'Show'}</button>
              </div>
              {showErrorDetails && (
                <pre className="mt-2 text-xs whitespace-pre-wrap max-h-40 overflow-auto">{JSON.stringify(errorDetails, null, 2)}</pre>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;
