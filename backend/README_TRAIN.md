This file explains how to train the simple model used by the HydroFarm dashboard.

Prerequisites
- Python 3.8+
- pip

Install dependencies

```powershell
cd backend
pip install pandas scikit-learn joblib
```

Train the model

```powershell
# By default the script will look for uploads/pechay_conditions.csv relative to backend/
python train_model.py --csv path\to\pechay_conditions.csv
```

Output
- `backend/models/trained_model.joblib` - serialized scikit-learn pipeline
- `backend/config/model_thresholds.json` - JSON file containing healthy ranges for temperature, humidity, ph_level and `model_accuracy` (test accuracy)

Notes
- The script trains a simple logistic regression classifier and computes min/max thresholds from samples labeled `healthy` in the CSV. The dashboard reads `GET /api/model/thresholds` to display thresholds under the charts.
