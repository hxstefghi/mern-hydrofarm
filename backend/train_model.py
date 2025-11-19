import json
import os
import argparse
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
import joblib

BASE_DIR = os.path.dirname(__file__)
MODELS_DIR = os.path.join(BASE_DIR, 'models')
CONFIG_DIR = os.path.join(BASE_DIR, 'config')

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(CONFIG_DIR, exist_ok=True)


def train(csv_path):
    df = pd.read_csv(csv_path)
    # Expect columns: temperature, humidity, ph_level, health_status
    # Normalize health_status into binary: healthy -> 1, else 0
    df = df.dropna(subset=['temperature', 'humidity', 'ph_level', 'health_status'])
    # Map health_status to binary label.
    # Use exact comparison to avoid treating 'unhealthy' as containing 'healthy'.
    df['label'] = df['health_status'].astype(str).str.strip().str.lower().map(lambda v: 1 if v == 'healthy' else 0)

    # Ensure we have at least two classes in the labels (required by sklearn)
    if df['label'].nunique() < 2:
        print("ERROR: Training data contains only one class after labeling. Need both healthy and unhealthy samples.")
        # exit with non-zero code so the caller (server) knows training failed
        import sys
        sys.exit(2)

    X = df[['temperature', 'humidity', 'ph_level']]
    y = df['label']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.15, random_state=42)

    pipe = Pipeline([
        ('scaler', StandardScaler()),
        ('clf', LogisticRegression(max_iter=1000))
    ])

    pipe.fit(X_train, y_train)

    acc = pipe.score(X_test, y_test)
    print(f"Model trained — test accuracy: {acc:.3f}")

    model_path = os.path.join(MODELS_DIR, 'trained_model.joblib')
    joblib.dump(pipe, model_path)
    print(f"Saved model to {model_path}")

    # Derive simple healthy thresholds from examples labeled 'healthy'
    healthy = df[df['label'] == 1]
    if healthy.empty:
        thresholds = {}
    else:
        thresholds = {
            'temperature': {
                'min': float(healthy['temperature'].min()),
                'max': float(healthy['temperature'].max())
            },
            'humidity': {
                'min': float(healthy['humidity'].min()),
                'max': float(healthy['humidity'].max())
            },
            'ph_level': {
                'min': float(healthy['ph_level'].min()),
                'max': float(healthy['ph_level'].max())
            },
            'model_accuracy': float(acc)
        }

    cfg_path = os.path.join(CONFIG_DIR, 'model_thresholds.json')
    with open(cfg_path, 'w') as f:
        json.dump(thresholds, f, indent=2)

    print(f"Wrote thresholds to {cfg_path}")


def main():
    parser = argparse.ArgumentParser(description='Train hydrofarm model from CSV')
    parser.add_argument('--csv', default=os.path.join(BASE_DIR, 'uploads', 'pechay_conditions.csv'), help='Path to training CSV')
    args = parser.parse_args()
    train(args.csv)


if __name__ == '__main__':
    main()
