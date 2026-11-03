from typing import Literal
import time

class logger:
    records = []
    _instance = None
    def __new__(self):
        if self._instance is None:
            self._instance = super().__new__(self)
            self.name = self.__class__.__name__
        return self._instance


    def _print_formatted(self, type: Literal["info", "error", "debug"], message: str):
        match type:
            case "info":
                return f"[{self.name}] [INFO] {message}"
            case "error":
                return f"[{self.name}] [ERROR] {message}"
            case "debug":
                return f"[{self.name}] [DEBUG] {message}"
            case _:
                return f"[{self.name}] [UNKNOWN] {message}"
            
    def save(self, message: str):
        # Placeholder for saving logs to a file or database
        message = f"{time.strftime('%Y-%m-%d %H:%M:%S')} {message }"
        self.records.append(message)
        return True
    def get_logs(self):
        return self.records
    def clear_logs(self):
        self.records = []
        return True
    def log(self,type: Literal["info", "error", "debug"], message: str):
        
        formatted_message = self._print_formatted(type, message)
        print(formatted_message)
        self.save(formatted_message)
