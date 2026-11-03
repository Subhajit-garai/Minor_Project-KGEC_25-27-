from pathlib import Path
import sys
ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
    
import joblib
from model_service.utils.logger import logger as log
# load the model and features

# set up logger 

logger = log()

# Resolve path relative to this file's directory (model/ml/)
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "DT" / "dpi_decision_tree.pkl"
FEATURES_PATH = BASE_DIR / "models"/ "DT" / "dpi_features.pkl"


model = joblib.load(MODEL_PATH)

features = joblib.load(FEATURES_PATH)


logger.log("info", "Model and features loaded successfully.")

print("model features:", features)
# Make sure the order is identical:
# flow_df = flow_df[features]

##  MODLE RUN
# prediction = model.predict(flow_df)[0]

# probability = model.predict_proba(flow_df)[0]

# print("Prediction:", prediction)
# print("Probability:", probability)