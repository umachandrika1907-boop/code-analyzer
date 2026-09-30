"""Analysis history persistence and retrieval service."""

import json
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any


@dataclass
class HistoryItem:
    analysis_id: str
    repository_name: str
    timestamp: str
    changed_files_count: int
    affected_files_count: int
    overall_impact_level: str  # 'HIGH', 'MEDIUM', 'LOW'
    status: str  # 'COMPLETED', 'FAILED'
    summary: str
    report_json_path: Optional[str] = None
    report_data: Optional[Dict[str, Any]] = None


class HistoryService:
    """Manages storage and retrieval of historical impact analysis reports."""

    def __init__(self, data_dir: Optional[Path] = None):
        self.data_dir = data_dir or Path(__file__).resolve().parent.parent / "data"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.history_file = self.data_dir / "history.json"
        self._ensure_storage()

    def _ensure_storage(self):
        if not self.history_file.exists():
            self._save_raw([])

    def _load_raw(self) -> List[Dict[str, Any]]:
        try:
            with open(self.history_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def _save_raw(self, items: List[Dict[str, Any]]):
        with open(self.history_file, "w", encoding="utf-8") as f:
            json.dump(items, f, indent=2)

    def list_history(self) -> List[HistoryItem]:
        raw_items = self._load_raw()
        history = []
        for r in raw_items:
            history.append(
                HistoryItem(
                    analysis_id=r.get("analysis_id", ""),
                    repository_name=r.get("repository_name", "Unknown Repo"),
                    timestamp=r.get("timestamp", ""),
                    changed_files_count=r.get("changed_files_count", 0),
                    affected_files_count=r.get("affected_files_count", 0),
                    overall_impact_level=r.get("overall_impact_level", "LOW"),
                    status=r.get("status", "COMPLETED"),
                    summary=r.get("summary", ""),
                    report_json_path=r.get("report_json_path"),
                    report_data=r.get("report_data"),
                )
            )
        history.sort(key=lambda x: x.timestamp, reverse=True)
        return history

    def save_analysis(
        self,
        analysis_id: str,
        repo_name: str,
        changed_count: int,
        affected_count: int,
        impact_level: str,
        summary: str,
        report_data: Optional[Dict[str, Any]] = None
    ) -> HistoryItem:
        item = HistoryItem(
            analysis_id=analysis_id,
            repository_name=repo_name,
            timestamp=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            changed_files_count=changed_count,
            affected_files_count=affected_count,
            overall_impact_level=impact_level,
            status="COMPLETED",
            summary=summary,
            report_data=report_data,
        )
        current = self._load_raw()
        current.insert(0, asdict(item))
        # Keep latest 100
        self._save_raw(current[:100])
        return item

    def get_analysis(self, analysis_id: str) -> Optional[HistoryItem]:
        for h in self.list_history():
            if h.analysis_id == analysis_id:
                return h
        return None
