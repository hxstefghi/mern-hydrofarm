import React, { useState } from 'react';
import axios from 'axios';

const TrainModel = () => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');

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
      const res = await axios.post('http://localhost:5000/api/model/train', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.status === 200) {
        const msg = res.data && res.data.message ? res.data.message : 'Train request finished';
        setStatus(msg + (res.data && res.data.thresholds ? ' — thresholds available' : ''));
      } else {
        setStatus('Training finished with status: ' + res.status);
      }
    } catch (err) {
      console.error(err);
      setStatus('Upload failed. See console for details.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">Train Model</h2>

      <p className="text-sm text-gray-600 mb-4">Upload a CSV file with training samples (temperature,humidity,ph_level,health_status).</p>

      <div className="space-y-3">
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
