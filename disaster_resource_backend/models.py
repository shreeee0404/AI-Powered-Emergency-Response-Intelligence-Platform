# ```python
from typing import Optional

from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    role = Column(String, nullable=False)
    password = Column(String, nullable=False)
    language = Column(String, nullable=False, default="en", server_default="en")


class Disaster(Base):
    __tablename__ = "disasters"

    id = Column(Integer, primary_key=True, index=True)
    disaster_type = Column(String, nullable=False)
    location = Column(String, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    severity = Column(String, nullable=False)
    description = Column(String)


class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    resource_type = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    location = Column(String, nullable=False)
    status = Column(String, nullable=False)


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String, unique=True, nullable=False)
    vehicle_type = Column(String, nullable=False)
    driver_name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    status = Column(String, nullable=False)


class FieldTeam(Base):
    __tablename__ = "field_teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    members = Column(Integer, nullable=False)
    zone = Column(String, nullable=False)
    leader = Column(String, nullable=False)
    status = Column(String, nullable=False)


class Mission(Base):
    __tablename__ = "missions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    disaster_id = Column(Integer, nullable=True)
    field_team_id = Column(Integer, nullable=True)
    location = Column(String, nullable=True)
    status = Column(String, nullable=False, default="Pending")
    description = Column(String, nullable=True)

    # Vehicle assigned to execute this mission (Mission -> Vehicle link)
    vehicle_id = Column(Integer, nullable=True)

    # SOS request that this mission was created from (SOS -> Mission link)
    sos_id = Column(Integer, nullable=True)


class MissionResource(Base):
    __tablename__ = "mission_resources"

    id = Column(Integer, primary_key=True, index=True)
    mission_id = Column(Integer, nullable=False)
    resource_id = Column(Integer, nullable=False)
    quantity = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="Assigned")

class Zone(Base):
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True, index=True)
    grid_cell_id = Column(String, nullable=False)
    disaster_id = Column(Integer, nullable=False)
    location = Column(String, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    severity_score = Column(Float, nullable=False, default=0)
    population = Column(Integer, nullable=False, default=0)
    vulnerable_population = Column(Integer, nullable=False, default=0)


# ============================================================
# AUDIT LOG
# ============================================================

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    user_name = Column(String, nullable=True)
    user_role = Column(String, nullable=True)
    action = Column(String, nullable=False)          # e.g. "Created Disaster"
    entity_type = Column(String, nullable=True)      # e.g. "Disaster"
    entity_id = Column(Integer, nullable=True)       # e.g. 5
    detail = Column(String, nullable=True)           # extra description
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


# ============================================================
# SOS REQUEST
# ============================================================

class SOSRequest(Base):
    __tablename__ = "sos_requests"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    people_count = Column(Integer, nullable=False, default=1)
    needs = Column(String, nullable=True)            # comma-separated: Food,Water,Medical
    description = Column(String, nullable=True)
    contact = Column(String, nullable=True)
    severity = Column(String, nullable=False, default="High")
    status = Column(String, nullable=False, default="Pending")  # Pending/Acknowledged/Resolved
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


class ScenarioSimulationRequest(BaseModel):
    population: int
    vulnerable_population: int
    severity_score: float
    latitude: float
    longitude: float
    disaster_type: str
    severity: str
