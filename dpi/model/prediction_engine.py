import os
import logging
from typing import Optional, Dict, Any, List
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)


class PredictionEngine:
    """
    Modular component for real-time ML inference on network flows.
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

    def extract_flow_features(self, flow: Any) -> Dict[str, float]:
        """
        Converts a Flow object or dictionary into the 26 statistical features
        expected by the trained Decision Tree model.
        """
        import numpy as np

        # Handle dictionary input
        if isinstance(flow, dict):
            return {feat: float(flow.get(feat, 0.0)) for feat in self.feature_names}

        # Duration in microseconds (CIC-IDS standard)
        duration_sec = getattr(flow, "duration", 0.0)
        duration_us = duration_sec * 1_000_000.0

        fwd_lengths = getattr(flow, "fwd_lengths", []) or [0]
        bwd_lengths = getattr(flow, "bwd_lengths", []) or [0]
        all_lengths = fwd_lengths + bwd_lengths

        total_fwd_pkts = len(getattr(flow, "fwd_lengths", []))
        total_bwd_pkts = len(getattr(flow, "bwd_lengths", []))
        total_pkts = getattr(flow, "total_packets", total_fwd_pkts + total_bwd_pkts)

        fwd_bytes = getattr(flow, "fwd_bytes", sum(fwd_lengths))
        bwd_bytes = getattr(flow, "bwd_bytes", sum(bwd_lengths))
        total_bytes = fwd_bytes + bwd_bytes

        flow_bytes_s = (total_bytes / duration_sec) if duration_sec > 0 else 0.0
        flow_pkts_s = (total_pkts / duration_sec) if duration_sec > 0 else 0.0

        def calc_iats(times):
            if len(times) < 2:
                return [0.0]
            diffs = [max(0.0, (t2 - t1) * 1_000_000.0) for t1, t2 in zip(times[:-1], times[1:])]
            return diffs if diffs else [0.0]

        all_times = getattr(flow, "all_times", [])
        fwd_times = getattr(flow, "fwd_times", [])
        bwd_times = getattr(flow, "bwd_times", [])

        flow_iats = calc_iats(all_times)
        fwd_iats = calc_iats(fwd_times)
        bwd_iats = calc_iats(bwd_times)

        down_up_ratio = (total_bwd_pkts / total_fwd_pkts) if total_fwd_pkts > 0 else 0.0

        feature_map = {
            'Protocol': float(getattr(flow, "protocol", 0)),
            'Flow Duration': float(duration_us),
            'Total Fwd Packets': float(total_fwd_pkts),
            'Total Backward Packets': float(total_bwd_pkts),
            'Fwd Packets Length Total': float(fwd_bytes),
            'Bwd Packets Length Total': float(bwd_bytes),
            'Flow Bytes/s': float(flow_bytes_s),
            'Flow Packets/s': float(flow_pkts_s),
            'Flow IAT Mean': float(np.mean(flow_iats)),
            'Flow IAT Std': float(np.std(flow_iats)),
            'Flow IAT Max': float(np.max(flow_iats)),
            'Fwd IAT Mean': float(np.mean(fwd_iats)),
            'Bwd IAT Mean': float(np.mean(bwd_iats)),
            'SYN Flag Count': float(getattr(flow, "syn", 0)),
            'RST Flag Count': float(getattr(flow, "rst", 0)),
            'FIN Flag Count': float(getattr(flow, "fin", 0)),
            'ACK Flag Count': float(getattr(flow, "ack", 0)),
            'PSH Flag Count': float(getattr(flow, "psh", 0)),
            'Packet Length Mean': float(np.mean(all_lengths)),
            'Packet Length Std': float(np.std(all_lengths)),
            'Packet Length Max': float(np.max(all_lengths)),
            'Packet Length Min': float(np.min(all_lengths)),
            'Down/Up Ratio': float(down_up_ratio),
            'Init Fwd Win Bytes': float(getattr(flow, "init_fwd_win", 0)),
            'Init Bwd Win Bytes': float(getattr(flow, "init_bwd_win", 0))
        }

        return feature_map

    def predict_flow(self, flow: Any) -> Dict[str, Any]:
        """
        Executes ML prediction on a given Flow object or feature dictionary.
        Returns a dictionary containing prediction label and confidence scores.
        """
        if not self._is_loaded or self.model is None:
            return {
                "prediction": "Unknown",
                "confidence": 0.0,
                "status": "uninitialized",
                "message": "PredictionEngine model is not loaded"
            }



        features_dict = self.extract_flow_features(flow)
        
        print("Extracted Features for Prediction:")
        print("features_dict:", features_dict)
        
        row = [features_dict.get(feat, 0.0) for feat in self.feature_names]
        df = pd.DataFrame([row], columns=self.feature_names)

        prediction = self.model.predict(df)[0]
        probabilities = None
        confidence = 1.0

        if hasattr(self.model, "predict_proba"):
            probs = self.model.predict_proba(df)[0]
            confidence = float(np.max(probs))
            probabilities = dict(zip(self.model.classes_, [float(p) for p in probs]))

        return {
            "prediction": str(prediction),
            "confidence": confidence,
            "probabilities": probabilities,
            "status": "success"
        }
