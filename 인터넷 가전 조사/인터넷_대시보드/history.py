"""
월별 스냅샷 저장/로드 모듈
data/{YYYY-MM}.json 형태로 관리
"""
import json
import os
from pathlib import Path
from datetime import datetime

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)


def save_snapshot(month: str, sheets: dict) -> None:
    """sheets = {sheet_name: df} → JSON 저장"""
    payload = {}
    for name, df in sheets.items():
        payload[name] = df.to_dict(orient="records")
    path = DATA_DIR / f"{month}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2, default=str)


def load_snapshot(month: str):
    path = DATA_DIR / f"{month}.json"
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    import pandas as pd
    return {name: pd.DataFrame(rows) for name, rows in data.items()}


def list_months() -> list[str]:
    """저장된 월 목록 (최신순)"""
    months = [p.stem for p in DATA_DIR.glob("*.json")]
    return sorted(months, reverse=True)


def prev_month(month: str):
    months = sorted(list_months())
    if month in months:
        idx = months.index(month)
        if idx > 0:
            return months[idx - 1]
    return None
