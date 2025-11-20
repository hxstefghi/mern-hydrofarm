import React, { useState } from 'react';
import api from '../lib/api';

const TrainModel = () => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [toasts, setToasts] = useState([]);

  const onFileChange = (e) => {
    setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null);
    setStatus('');
  };

  const upload = async () => {
    if (!file) return setStatus('Please choose a CSV file first.');
    const fd = new FormData();
    fd.append('file', file);
    try {
      setStatus('Uploading...');
      // POST to the training endpoint which runs training and merges on success
      const headers = { 'Content-Type': 'multipart/form-data' };
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('hf_token');
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      const res = await api.post('/api/model/train', fd, { headers });
      if (res.status === 200) {
        const msg = res.data && res.data.message ? res.data.message : 'Train request finished';
        setStatus(msg + (res.data && res.data.thresholds ? ' — thresholds available' : ''));
        // show success toast
        addToast('Training completed successfully.', 'success');
      } else {
        setStatus('Training finished with status: ' + res.status);
        addToast('Training finished with status: ' + res.status, 'warn');
      }
    } catch (err) {
      console.error(err);
      setStatus('Upload failed. See console for details.');
      addToast('Upload failed — see console for details.', 'error');
    }
  };

  const addToast = (message, kind = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">Train Model</h2>

      <p className="text-sm text-gray-600 mb-4">Upload a CSV file with training samples (temperature,humidity,ph_level,health_status).</p>

      <div className="space-y-3">
        {/* toast container */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map(t => (
            <div key={t.id} className={`max-w-sm w-full px-4 py-2 rounded shadow ${t.kind === 'error' ? 'bg-red-50 border-l-4 border-red-400 text-red-800' : t.kind === 'success' ? 'bg-green-50 border-l-4 border-green-400 text-green-800' : 'bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800'}`}>
              <div className="text-sm">{t.message}</div>
            </div>
          ))}
        </div>
        <input id="train-file" type="file" accept=".csv,text/csv" onChange={onFileChange} className="hidden" />

        <label htmlFor="train-file" className="flex items-center justify-between border border-gray-300 rounded-md px-3 py-2 cursor-pointer hover:border-gray-400">
          <div className="text-sm text-gray-700">{file ? file.name : 'No file chosen'}</div>
          <div className="ml-4 px-3 py-1 bg-gray-100 rounded text-sm text-gray-700">Choose file</div>
        </label>

        <div>
          <button onClick={upload} className="px-4 py-2 bg-green-600 text-white rounded-md">Upload CSV</button>
        </div>

        {status && <div className="text-sm text-gray-700 mt-2">{status}</div>}
      </div>
    </div>
  );
};

export default TrainModel;
