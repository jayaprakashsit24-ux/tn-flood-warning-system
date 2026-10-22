import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from pathlib import Path

from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    mean_absolute_error,
    root_mean_squared_error,
    r2_score
)

from app.ml.features import FEATURE_COLUMNS, FEATURE_LABELS, RISK_CLASSES
from ml_training.dataset_generator import generate_flood_dataset, OUTPUT_CSV

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "ml_models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

CLASSIFIER_PATH = MODEL_DIR / "flood_risk_classifier.joblib"
REGRESSOR_PATH = MODEL_DIR / "water_level_regressor.joblib"
METRICS_JSON_PATH = MODEL_DIR / "model_metrics.json"

def train_and_evaluate():
    """Train Random Forest models using strict time-aware splitting."""
    if not OUTPUT_CSV.exists():
        print("Dataset not found. Generating realistic historical dataset...")
        df = generate_flood_dataset(15000)
    else:
        df = pd.read_csv(OUTPUT_CSV)
        print(f"Loaded existing dataset with {len(df)} records.")

    # Ensure chronological order
    df["dt"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(by="dt").reset_index(drop=True)

    # Time-aware split: First 80% train, last 20% test
    split_idx = int(len(df) * 0.8)
    train_df = df.iloc[:split_idx]
    test_df = df.iloc[split_idx:]

    print(f"Train period: {train_df['dt'].min()} to {train_df['dt'].max()} ({len(train_df)} records)")
    print(f"Test period:  {test_df['dt'].min()} to {test_df['dt'].max()} ({len(test_df)} records)")

    X_train = train_df[FEATURE_COLUMNS].values
    y_train_class = train_df["risk_class"].values
    y_train_reg = train_df["water_level_24h_ahead"].values

    X_test = test_df[FEATURE_COLUMNS].values
    y_test_class = test_df["risk_class"].values
    y_test_reg = test_df["water_level_24h_ahead"].values

    # 1. Train Random Forest Classifier
    print("\nTraining Random Forest Flood Risk Classifier...")
    clf = RandomForestClassifier(
        n_estimators=120,
        max_depth=14,
        min_samples_split=4,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )
    clf.fit(X_train, y_train_class)

    y_pred_class = clf.predict(X_test)

    # Evaluation
    acc = float(accuracy_score(y_test_class, y_pred_class))
    prec = float(precision_score(y_test_class, y_pred_class, average="weighted", zero_division=0))
    rec = float(recall_score(y_test_class, y_pred_class, average="weighted", zero_division=0))
    f1 = float(f1_score(y_test_class, y_pred_class, average="weighted", zero_division=0))

    report = classification_report(y_test_class, y_pred_class, labels=RISK_CLASSES, output_dict=True, zero_division=0)
    cm = confusion_matrix(y_test_class, y_pred_class, labels=RISK_CLASSES).tolist()

    print(f"Classifier Accuracy: {acc:.4f}")
    print(f"Weighted Precision:  {prec:.4f}")
    print(f"Weighted Recall:     {rec:.4f}")
    print(f"Weighted F1-Score:   {f1:.4f}")

    # 2. Train Random Forest Regressor for 24h Water Level
    print("\nTraining Random Forest Water Level Regressor...")
    reg = RandomForestRegressor(
        n_estimators=100,
        max_depth=12,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    reg.fit(X_train, y_train_reg)

    y_pred_reg = reg.predict(X_test)
    mae = float(mean_absolute_error(y_test_reg, y_pred_reg))
    rmse = float(root_mean_squared_error(y_test_reg, y_pred_reg))
    r2 = float(r2_score(y_test_reg, y_pred_reg))

    print(f"Regressor MAE:  {mae:.4f} m")
    print(f"Regressor RMSE: {rmse:.4f} m")
    print(f"Regressor R2:   {r2:.4f}")

    # 3. Extract Feature Importances
    importances = clf.feature_importances_
    feature_importance_list = []
    for col, imp in sorted(zip(FEATURE_COLUMNS, importances), key=lambda x: x[1], reverse=True):
        feature_importance_list.append({
            "feature": col,
            "label": FEATURE_LABELS.get(col, col),
            "importance": round(float(imp), 4)
        })

    # Save models
    joblib.dump(clf, CLASSIFIER_PATH)
    joblib.dump(reg, REGRESSOR_PATH)
    print(f"\nSaved models to {MODEL_DIR}")

    # Save metrics JSON
    metrics_data = {
        "model_name": "Random Forest Hydrological Ensemble (TN Basins)",
        "version": "RF-v1.0.0",
        "trained_at": datetime.utcnow().isoformat(),
        "train_records": int(len(train_df)),
        "test_records": int(len(test_df)),
        "train_period": f"{train_df['dt'].min().strftime('%Y-%m-%d')} to {train_df['dt'].max().strftime('%Y-%m-%d')}",
        "test_period": f"{test_df['dt'].min().strftime('%Y-%m-%d')} to {test_df['dt'].max().strftime('%Y-%m-%d')}",
        "accuracy": round(acc, 4),
        "precision_weighted": round(prec, 4),
        "recall_weighted": round(rec, 4),
        "f1_weighted": round(f1, 4),
        "classes": RISK_CLASSES,
        "classification_report": report,
        "confusion_matrix": cm,
        "regressor_mae": round(mae, 4),
        "regressor_rmse": round(rmse, 4),
        "regressor_r2": round(r2, 4),
        "feature_importance": feature_importance_list,
        "is_active": True
    }

    with open(METRICS_JSON_PATH, "w") as f:
        json.dump(metrics_data, f, indent=2)

    print(f"Saved model metrics to {METRICS_JSON_PATH}")
    return metrics_data

if __name__ == "__main__":
    train_and_evaluate()
