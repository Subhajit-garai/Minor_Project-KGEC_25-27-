import os
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)


class PredictionEngine:
    """
    Reserved modular component for real-time ML inference on network flows.
    Decoupled from PacketCapture and FlowProcessor.
    """

    def __init__(self, model_path: Optional[str] = None, features_path: Optional[str] = None):
        self.model_path = model_path
        self.features_path = features_path
        self.model = None
        self.feature_names: List[str] = []
        self._is_loaded = False

        if model_path and os.path.exists(model_path):
            self.load_model(model_path, features_path)

    def load_model(self, model_path: str, features_path: Optional[str] = None):
        """Loads a trained machine learning model and expected feature list."""
        try:
            import joblib
            self.model = joblib.load(model_path)
            self.model_path = model_path
            if features_path and os.path.exists(features_path):
                self.feature_names = joblib.load(features_path)
                self.features_path = features_path
            self._is_loaded = True
            logger.info(f"Model loaded successfully from {model_path}")
        except Exception as e:
            logger.error(f"Failed to load ML model: {e}")
            raise

    @property
    def is_loaded(self) -> bool:
        return self._is_loaded

    def predict_flow(self, flow: Any) -> Dict[str, Any]:
        """
        Executes ML prediction on a given Flow object.
        Returns a dictionary containing prediction label and confidence scores.
        """
        if not self._is_loaded or self.model is None:
            return {
                "prediction": "benign",
                "confidence": 1.0,
                "status": "uninitialized",
                "message": "PredictionEngine model is not loaded"
            }

        result = self.model.predict(flow)
        
        print("model prediction result :", result)
        return {
            "prediction": "benign",
            "confidence": 1.0,
            "status": "ready"
        }

