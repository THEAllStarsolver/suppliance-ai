"""
firebase_store.py
Responsibility: In-memory store simulating Firebase Firestore per-user data.
Stores suppliers, dealers, and shipment history keyed by user_id.
Swap _store with actual Firestore calls in production.
"""
from typing import Dict, List, Any
import uuid

_store: Dict[str, Dict[str, List[Any]]] = {}


def _user(user_id: str) -> Dict[str, List]:
    if user_id not in _store:
        _store[user_id] = {"suppliers": [], "dealers": [], "shipments": []}
    return _store[user_id]


# --- Suppliers ---
def add_supplier(user_id: str, data: dict) -> dict:
    data["id"] = str(uuid.uuid4())[:8]
    data["user_id"] = user_id
    _user(user_id)["suppliers"].append(data)
    return data


def get_suppliers(user_id: str) -> List[dict]:
    return _user(user_id)["suppliers"]


def get_supplier(user_id: str, supplier_id: str) -> dict | None:
    return next((s for s in get_suppliers(user_id) if s["id"] == supplier_id), None)


# --- Dealers ---
def add_dealer(user_id: str, data: dict) -> dict:
    data["id"] = str(uuid.uuid4())[:8]
    data["user_id"] = user_id
    _user(user_id)["dealers"].append(data)
    return data


def get_dealers(user_id: str) -> List[dict]:
    return _user(user_id)["dealers"]


# --- Shipment history ---
def record_shipment(user_id: str, record: dict):
    _user(user_id)["shipments"].append(record)


def get_shipments(user_id: str) -> List[dict]:
    return _user(user_id)["shipments"]
