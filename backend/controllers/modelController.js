const fs = require('fs');
const path = require('path');
const ModelThreshold = require('../models/ModelThreshold');

const configPath = path.join(__dirname, '..', 'config', 'model_thresholds.json');

exports.getThresholds = async (req, res) => {
  try {
    // Get the most recent active threshold from MongoDB
    const threshold = await ModelThreshold.findOne({ active: true }).sort({ trained_at: -1 });
    if (!threshold) {
      return res.status(204).json({});
    }
    return res.json({
      temperature: threshold.temperature,
      humidity: threshold.humidity,
      ph_level: threshold.ph_level,
      model_accuracy: threshold.model_accuracy
    });
  } catch (err) {
    console.error('Error fetching thresholds from DB:', err);
    return res.status(500).json({ error: 'Failed to fetch thresholds' });
  }
};

// Handle CSV upload
exports.uploadCsv = (req, res) => {
  // multer saves file to req.file
  console.log('Upload CSV - req.file:', req.file ? 'present' : 'missing');
  console.log('Upload CSV - req.body:', req.body);
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  // respond with path info
  console.log('File uploaded successfully:', req.file.filename);
  return res.json({ filename: req.file.filename, path: req.file.path });
};

const { spawn } = require('child_process');

// helper to merge uploaded CSV into master and save thresholds to MongoDB
async function mergeUploadedCsv(uploadedPath, res) {
  // Check if response already sent
  if (res.headersSent) {
    console.log('Response already sent, skipping merge');
    return;
  }
  
  // Always use local uploads dir for training_data.csv (for local development)
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const masterPath = path.join(uploadsDir, 'training_data.csv');
  
  try {
    const uploadedContent = fs.readFileSync(uploadedPath, 'utf8');
    const lines = uploadedContent.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) {
      try { fs.unlinkSync(uploadedPath); } catch (e) {}
      return res.status(200).json({ message: 'Trained (no rows to merge)' });
    }

    const header = lines[0];
    const rows = lines.slice(1);

    if (!fs.existsSync(masterPath)) {
      // create master by copying uploaded file
      fs.copyFileSync(uploadedPath, masterPath);
    } else {
      // check headers match
      const masterHeader = fs.readFileSync(masterPath, 'utf8').split(/\r?\n/)[0];
      if (masterHeader.trim() !== header.trim()) {
        // rollback: remove uploaded file
        try { fs.unlinkSync(uploadedPath); } catch (e) {}
        return res.status(400).json({ error: 'CSV header mismatch with existing training data' });
      }

      // append rows (avoid duplicating header)
      if (rows.length > 0) {
        fs.appendFileSync(masterPath, '\n' + rows.join('\n'));
      }
    }

    // Read thresholds from JSON file and save to MongoDB
    const cfgPath = path.join(__dirname, '..', 'config', 'model_thresholds.json');
    let thresholds = {};
    try {
      const thresholdData = JSON.parse(fs.readFileSync(cfgPath, 'utf8') || '{}');
      
      // Save to MongoDB for persistence across deployments (optional - don't fail if DB unavailable)
      if (thresholdData.temperature && thresholdData.humidity && thresholdData.ph_level) {
        try {
          await ModelThreshold.create({
            temperature: thresholdData.temperature,
            humidity: thresholdData.humidity,
            ph_level: thresholdData.ph_level,
            model_accuracy: thresholdData.model_accuracy,
            active: true
          });
          console.log('Thresholds saved to MongoDB');
        } catch (dbErr) {
          console.warn('Could not save to MongoDB (continuing anyway):', dbErr.message);
        }
      }
      
      thresholds = thresholdData;
    } catch (e) {
      console.error('Error processing thresholds:', e);
    }

    // success
    try { fs.unlinkSync(uploadedPath); } catch (e) {}
    return res.json({ message: 'Training successful', thresholds });
  } catch (e) {
    // cleanup uploaded file on unexpected error
    try { fs.unlinkSync(uploadedPath); } catch (ex) {}
    return res.status(500).json({ error: 'Failed to merge training data', details: e.message });
  }
}

// Train with uploaded file, and on success merge into master training CSV.
exports.trainUploaded = (req, res) => {
  console.log('Train uploaded - req.file:', req.file ? 'present' : 'missing');
  console.log('Train uploaded - Content-Type:', req.headers['content-type']);
  if (!req.file) {
    console.error('No file uploaded for training');
    return res.status(400).json({ error: 'No file uploaded for training' });
  }

  const uploadedPath = req.file.path; // full path
  console.log('Training with file:', uploadedPath);
  let responded = false;

  const spawnTrainer = (pythonCmd) => {
    const args = [path.join(__dirname, '..', 'train_model.py'), '--csv', uploadedPath];
    const trainer = spawn(pythonCmd, args, { cwd: path.join(__dirname, '..') });

    let stdout = '';
    let stderr = '';
    trainer.stdout.on('data', (d) => { stdout += d.toString(); process.stdout.write(d.toString()); });
    trainer.stderr.on('data', (d) => { stderr += d.toString(); process.stdout.write(d.toString()); });

    trainer.on('error', (err) => {
      // If command not found, try Windows launcher 'py' as a fallback
      if (err && err.code === 'ENOENT' && pythonCmd !== 'py') {
        return spawnTrainer('py');
      }
      if (!responded) {
        responded = true;
        try { fs.unlinkSync(uploadedPath); } catch (e) {}
        return res.status(500).json({ error: 'Failed to start trainer', details: err.message });
      }
    });

    trainer.on('close', (code) => {
      if (responded) return;
      if (code !== 0) {
        responded = true;
        try { fs.unlinkSync(uploadedPath); } catch (e) {}
        return res.status(500).json({ error: 'Training failed', details: stderr || stdout });
      }

      // success: merge (use promise chain to handle async)
      responded = true;
      mergeUploadedCsv(uploadedPath, res).catch(err => {
        console.error('Error in mergeUploadedCsv:', err);
        console.error('Stack:', err.stack);
        if (!res.headersSent) {
          try {
            res.status(500).json({ error: 'Failed to save training results', details: err.message });
          } catch (resErr) {
            console.error('Could not send error response:', resErr);
          }
        }
      });
    });
  };

  try {
    // try to spawn trainer using 'python' first
    spawnTrainer('python');
  } catch (err) {
    console.error('Error spawning trainer:', err);
    if (!responded && !res.headersSent) {
      res.status(500).json({ error: 'Failed to start training', details: err.message });
    }
  }
};
