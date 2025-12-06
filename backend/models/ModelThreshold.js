const mongoose = require('mongoose');

const ModelThresholdSchema = new mongoose.Schema({
  temperature: {
    min: { type: Number, required: true },
    max: { type: Number, required: true }
  },
  humidity: {
    min: { type: Number, required: true },
    max: { type: Number, required: true }
  },
  ph_level: {
    min: { type: Number, required: true },
    max: { type: Number, required: true }
  },
  model_accuracy: { type: Number },
  trained_at: { type: Date, default: Date.now },
  active: { type: Boolean, default: true }
});

module.exports = mongoose.model('ModelThreshold', ModelThresholdSchema);
