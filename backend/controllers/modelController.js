const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'config', 'model_thresholds.json');

exports.getThresholds = (req, res) => {
  fs.readFile(configPath, 'utf8', (err, data) => {
    if (err) {
      // If file not found or empty, return 204 No Content
      return res.status(204).json({});
    }
    try {
      const parsed = JSON.parse(data || '{}');
      return res.json(parsed);
    } catch (e) {
      return res.status(500).json({ error: 'Malformed thresholds file' });
    }
  });
};

// Handle CSV upload
exports.uploadCsv = (req, res) => {
  // multer saves file to req.file
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  // respond with path info
  return res.json({ filename: req.file.filename, path: req.file.path });
};

const { spawn } = require('child_process');

// helper to merge uploaded CSV into master
function mergeUploadedCsv(uploadedPath, res) {
  const uploadsDir = path.join(__dirname, '..', 'uploads');
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

    // Read thresholds to return to client
    const cfgPath = path.join(__dirname, '..', 'config', 'model_thresholds.json');
    let thresholds = {};
    try {
      thresholds = JSON.parse(fs.readFileSync(cfgPath, 'utf8') || '{}');
    } catch (e) {
      // ignore
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
  if (!req.file) return res.status(400).json({ error: 'No file uploaded for training' });

  const uploadedPath = req.file.path; // full path
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

      // success: merge
      mergeUploadedCsv(uploadedPath, res);
    });
  };

  // try to spawn trainer using 'python' first
  spawnTrainer('python');
};
