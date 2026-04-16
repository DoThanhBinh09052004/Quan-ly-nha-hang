import os
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'quanlynhahang'),
    'port': int(os.getenv('DB_PORT', 3306))
}

MODEL_PATH = os.getenv('MODEL_PATH', './saved_models/')