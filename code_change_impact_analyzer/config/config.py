"""Configuration settings for Code Change Impact Analyzer."""

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional
from dotenv import load_dotenv

# Load .env file from root or analyzer directory
base_dir = Path(__file__).resolve().parent.parent
load_dotenv(base_dir / ".env")
load_dotenv()


@dataclass
class FirebaseConfig:
    """Firebase client configuration."""
    api_key: str = field(default_factory=lambda: os.getenv("FIREBASE_API_KEY", ""))
    auth_domain: str = field(default_factory=lambda: os.getenv("FIREBASE_AUTH_DOMAIN", ""))
    project_id: str = field(default_factory=lambda: os.getenv("FIREBASE_PROJECT_ID", ""))
    storage_bucket: str = field(default_factory=lambda: os.getenv("FIREBASE_STORAGE_BUCKET", ""))
    messaging_sender_id: str = field(default_factory=lambda: os.getenv("FIREBASE_MESSAGING_SENDER_ID", ""))
    app_id: str = field(default_factory=lambda: os.getenv("FIREBASE_APP_ID", ""))

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self.project_id)


@dataclass
class AppConfig:
    """Core application settings."""
    app_name: str = "Code Change Impact Analyzer"
    version: str = "1.0.0"
    gemini_api_key: str = field(default_factory=lambda: os.getenv("GEMINI_API_KEY", ""))
    gemini_model: str = "gemini-3.8-flash"
    embedding_model_name: str = field(
        default_factory=lambda: os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    )
    top_k_retrieval: int = field(
        default_factory=lambda: int(os.getenv("TOP_K_RETRIEVAL", "15"))
    )
    chunk_size_lines: int = 60
    chunk_overlap_lines: int = 10
    max_upload_size_mb: int = field(
        default_factory=lambda: int(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))
    )
    supported_extensions: List[str] = field(
        default_factory=lambda: [
            ".py", ".js", ".jsx", ".ts", ".tsx",
            ".java", ".c", ".cpp", ".h", ".hpp",
            ".cs", ".go", ".php", ".rb", ".sql",
            ".md", ".json", ".yaml", ".yml"
        ]
    )
    ignored_patterns: List[str] = field(
        default_factory=lambda: [
            ".git", "node_modules", "venv", ".venv",
            "__pycache__", "dist", "build", ".next",
            "target", "vendor", ".idea", ".vscode"
        ]
    )
    firebase: FirebaseConfig = field(default_factory=FirebaseConfig)
    base_dir: Path = base_dir
    data_dir: Path = base_dir / "data"
    reports_dir: Path = base_dir / "reports"


_config_instance: Optional[AppConfig] = None


def get_config() -> AppConfig:
    """Return singleton application configuration."""
    global _config_instance
    if _config_instance is None:
        _config_instance = AppConfig()
        _config_instance.data_dir.mkdir(parents=True, exist_ok=True)
        _config_instance.reports_dir.mkdir(parents=True, exist_ok=True)
    return _config_instance
