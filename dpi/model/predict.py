from pathlib import Path
import sys

# Ensure dpi root is in sys.path
DPI_DIR = Path(__file__).resolve().parents[1]
if str(DPI_DIR) not in sys.path:
    sys.path.insert(0, str(DPI_DIR))

import joblib
from utils.logger import logger as log
from model.prediction_engine import PredictionEngine

logger = log()

# Resolve path relative to this file's directory (dpi/model/)
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "saved" / "DT" / "dpi_decision_tree.pkl"
FEATURES_PATH = BASE_DIR / "saved" / "DT" / "dpi_features.pkl"

# Initialize PredictionEngine
engine = PredictionEngine(model_path=str(MODEL_PATH), features_path=str(FEATURES_PATH))

# Load model and features directly for direct access
model = joblib.load(MODEL_PATH)
features = joblib.load(FEATURES_PATH)

logger.log("info", "Model and features loaded successfully.")
