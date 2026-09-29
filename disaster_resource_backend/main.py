from typing import Optional

from datetime import datetime

import math

import json

from urllib.request import urlopen, Request

from urllib.parse import quote



import requests

import joblib

import pandas as pd



from fastapi import FastAPI, Depends, HTTPException

from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel

from sqlalchemy import inspect, text

from sqlalchemy.orm import Session



from database import Base, engine, SessionLocal

from models import (

    User,

    Disaster,

    Resource,

    Vehicle,

    FieldTeam,

    Mission,

    MissionResource,

    Zone,

    AuditLog,

    SOSRequest,

)



from auth import (

    get_password_hash,

    create_access_token,

    verify_password,

    get_current_user,

)





# ============================================================

# DATABASE

# ============================================================



Base.metadata.create_all(bind=engine)



# Keep existing SQLite installations compatible when new user preferences

# are introduced without requiring a destructive database reset.

if "language" not in {

    column["name"]

    for column in inspect(engine).get_columns("users")

}:

    with engine.begin() as connection:

        connection.execute(

            text("ALTER TABLE users ADD COLUMN language VARCHAR DEFAULT 'en'")

        )


# Keep existing SQLite installations compatible when the new
# mission-linking columns are introduced without requiring a
# destructive database reset.
def ensure_column(table_name, column_name, ddl):
    inspector = inspect(engine)

    if table_name not in inspector.get_table_names():
        return

    existing_columns = {
        column["name"]
        for column in inspector.get_columns(table_name)
    }

    if column_name in existing_columns:
        return

    with engine.begin() as connection:
        connection.execute(text(ddl))


ensure_column(
    "missions",
    "vehicle_id",
    "ALTER TABLE missions ADD COLUMN vehicle_id INTEGER",
)

ensure_column(
    "missions",
    "sos_id",
    "ALTER TABLE missions ADD COLUMN sos_id INTEGER",
)





def get_db():

    db = SessionLocal()

    try:

        yield db

    finally:

        db.close()





# ============================================================

# FASTAPI

# ============================================================



app = FastAPI(

    title="AI-Based Disaster Response Management System",

    version="1.0.0",

    servers=[

        {"url": "http://localhost:8000", "description": "Local development server"},

    ],

)





app.add_middleware(

    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=False,

    allow_methods=["*"],

    allow_headers=["*"],

)





# ============================================================

# ML MODEL

# ============================================================



try:

    model = joblib.load("final_resource_demand_model.pkl")

    model_features = joblib.load("model_features.pkl")



    print("ML model loaded successfully.")

    print(f"Number of model features: {len(model_features)}")



except Exception as e:

    model = None

    model_features = []



    print("WARNING: ML model could not be loaded.")

    print(f"Model loading error: {e}")





# ============================================================

# HELPER FUNCTIONS

# ============================================================



def safe_float(value, default=0.0):

    try:

        if value is None or value == "":

            return float(default)



        result = float(value)



        if math.isnan(result) or math.isinf(result):

            return float(default)



        return result



    except (TypeError, ValueError):

        return float(default)





def safe_int(value, default=0):

    try:

        return int(float(value))

    except (TypeError, ValueError):

        return int(default)





def normalize_text(value):

    if value is None:

        return ""



    return str(value).strip().lower()





def calculate_vulnerability_ratio(zone):

    if not zone or zone.population <= 0:

        return 0.0



    return min(

        max(

            zone.vulnerable_population / zone.population,

            0.0,

        ),

        1.0,

    )





# ============================================================

# ML INPUT BUILDER

# ============================================================



def build_model_input(raw_data: dict):

    """

    Build the exact feature structure expected by model_features.pkl.



    The training notebook:

    - removed the original date column

    - extracted year/month/day

    - one-hot encoded categorical variables

    - converted values to numeric

    - filled missing values



    This function follows that final structure.

    """



    data = dict(raw_data)



    # --------------------------------------------------------

    # DATE

    # --------------------------------------------------------



    date_value = data.pop("date", None)



    if date_value is not None:



        try:

            parsed_date = pd.to_datetime(

                date_value,

                errors="coerce",

            )



            if pd.notna(parsed_date):

                data["year"] = parsed_date.year

                data["month"] = parsed_date.month

                data["day"] = parsed_date.day



        except Exception:

            pass



    # --------------------------------------------------------

    # CATEGORICAL VALUES

    # --------------------------------------------------------



    disaster_type = normalize_text(

        data.pop("disaster_type", "")

    )



    disaster_subtype = normalize_text(

        data.pop("disaster_subtype", "")

    )



    # --------------------------------------------------------

    # ONE-HOT DISASTER TYPE

    # --------------------------------------------------------



    for feature in model_features:



        if feature.startswith("disaster_type_"):



            category = normalize_text(

                feature.replace(

                    "disaster_type_",

                    "",

                    1,

                )

            )



            data[feature] = (

                1

                if disaster_type == category

                else 0

            )



        elif feature.startswith("disaster_subtype_"):



            category = normalize_text(

                feature.replace(

                    "disaster_subtype_",

                    "",

                    1,

                )

            )



            data[feature] = (

                1

                if disaster_subtype == category

                else 0

            )



    # --------------------------------------------------------

    # FINAL FEATURE DATA

    # --------------------------------------------------------



    final_data = {}

    defaulted_features = []



    for feature in model_features:



        value = data.get(feature)



        if value is None or value == "":



            final_data[feature] = 0.0

            defaulted_features.append(feature)



            continue



        try:



            numeric_value = float(value)



            if math.isnan(numeric_value) or math.isinf(

                numeric_value

            ):

                numeric_value = 0.0

                defaulted_features.append(feature)



            final_data[feature] = numeric_value



        except (TypeError, ValueError):



            final_data[feature] = 0.0

            defaulted_features.append(feature)



    input_df = pd.DataFrame(

        [final_data],

        columns=model_features,

    )



    return input_df, defaulted_features





# ============================================================

# BUILD REALISTIC ZONE MODEL INPUT

# ============================================================



def build_zone_model_data(

    db: Session,

    zone: Zone,

    disaster: Disaster,

):

    """

    Creates model input using information actually available

    in the current database.



    Database-backed values:

    - latitude / longitude

    - population

    - vulnerable population

    - severity

    - disaster type

    - resource inventory

    - vehicles

    - field-team personnel



    Flood-specific scenario values are used because the current

    database does not contain weather/flood sensor columns.

    """



    vulnerable_ratio = calculate_vulnerability_ratio(zone)



    # --------------------------------------------------------

    # RESOURCE INVENTORY

    # --------------------------------------------------------



    resources = db.query(Resource).all()



    food_available = 0

    water_available = 0

    medical_available = 0

    shelter_available = 0



    for resource in resources:



        resource_type = normalize_text(

            resource.resource_type

        )



        quantity = max(

            safe_int(resource.quantity),

            0,

        )



        if resource_type == "food":

            food_available += quantity



        elif resource_type == "water":

            water_available += quantity



        elif resource_type in [

            "medical",

            "medical kit",

            "medical kits",

        ]:

            medical_available += quantity



        elif resource_type == "shelter":

            shelter_available += quantity



    # --------------------------------------------------------

    # VEHICLES

    # --------------------------------------------------------



    vehicles = db.query(Vehicle).all()



    available_vehicle_count = 0



    for vehicle in vehicles:



        status = normalize_text(

            vehicle.status

        )



        if status in [

            "available",

            "active",

        ]:

            available_vehicle_count += 1



    # --------------------------------------------------------

    # FIELD TEAM PERSONNEL

    # --------------------------------------------------------



    field_teams = db.query(FieldTeam).all()



    personnel_available = 0



    for team in field_teams:



        status = normalize_text(

            team.status

        )



        if status in [

            "active",

            "available",

        ]:

            personnel_available += safe_int(

                team.members

            )



    # --------------------------------------------------------

    # BASIC DISASTER DATA

    # --------------------------------------------------------



    disaster_type = normalize_text(

        disaster.disaster_type

    )



    severity_text = normalize_text(

        disaster.severity

    )



    severity_map = {

        "low": 3.0,

        "medium": 5.0,

        "high": 8.0,

        "critical": 10.0,

    }



    severity_score = max(

        safe_float(

            zone.severity_score,

            severity_map.get(

                severity_text,

                5.0,

            ),

        ),

        0.0,

    )



    latitude = safe_float(

        zone.latitude,

        disaster.latitude or 0,

    )



    longitude = safe_float(

        zone.longitude,

        disaster.longitude or 0,

    )



    population = max(

        safe_int(zone.population),

        0,

    )



    vulnerable_population = max(

        safe_int(zone.vulnerable_population),

        0,

    )



    # --------------------------------------------------------

    # BASE INPUT

    # --------------------------------------------------------



    input_data = {

        "latitude": latitude,

        "longitude": longitude,



        "magnitude": 0.0,

        "depth": 0.0,



        "population": population,



        "population_density": (

            population / 10.0

            if population > 0

            else 0.0

        ),



        "children_pct": 15.0,

        "elderly_pct": 8.0,

        "medically_dependent_pct": 5.0,

        "disability_pct": 4.0,



        "vulnerability_score": vulnerable_ratio,



        "housing_risk_score": min(

            severity_score,

            10.0,

        ),



        "building_count": max(

            int(population / 4),

            0,

        ),



        "building_density_km2": 500.0,



        "builtup_pct": 65.0,

        "water_pct": 5.0,

        "forest_pct": 2.0,

        "agriculture_pct": 3.0,



        "infrastructure_score": max(

            0.0,

            10.0 - severity_score * 0.5,

        ),



        "impact_score": severity_score,



        "building_damage_pct": min(

            severity_score * 5.0,

            100.0,

        ),



        "road_damage_pct": min(

            severity_score * 4.0,

            100.0,

        ),



        "utility_damage_pct": min(

            severity_score * 3.0,

            100.0,

        ),



        "road_density": 8.0,

        "road_connectivity": 0.75,

        "highway_distance": 5.0,



        "accessibility_score": max(

            0.0,

            10.0 - severity_score * 0.4,

        ),



        "major_road_access_score": max(

            0.0,

            10.0 - severity_score * 0.3,

        ),



        "road_blockage_probability": min(

            severity_score / 10.0,

            1.0,

        ),



        "logistics_accessibility_score": max(

            0.0,

            10.0 - severity_score * 0.4,

        ),



        "nearest_depot_distance_km": 10.0,

        "nearest_hospital_distance_km": 5.0,

        "nearest_evacuation_center_distance_km": 5.0,



        "estimated_travel_time_minutes": 30.0,



        "hospital_count": 3,

        "health_center_count": 5,

        "shelter_center_count": 4,

        "critical_facility_count": 5,

        "relief_warehouse_count": 1,

        "water_facility_count": 2,



        # Actual DB inventory

        "food_packets_available": food_available,

        "water_litres_available": water_available,

        "medical_kits_available": medical_available,

        "shelter_capacity": shelter_available,



        # Actual DB availability

        "rescue_vehicles_available": available_vehicle_count,

        "personnel_available": personnel_available,



        "depot_operational_score": 0.9,



        "event_duration_hours": 24.0,



        "severity_score": severity_score,



        "affected_area_km2": max(

            population / 5000.0,

            1.0,

        ),



        "flood_extent_km2": 0.0,

        "flood_depth_m": 0.0,

        "flood_velocity_ms": 0.0,

        "flood_severity": 0.0,



        "fire_detection_count": 0.0,

        "fire_frp_sum": 0.0,

        "fire_frp_max": 0.0,



        "earthquake_count": 0.0,



        # DRIS

        "dris_hazard": severity_score / 10.0,

        "dris_exposure": min(

            population / 50000.0,

            1.0,

        ),

        "dris_vulnerability": vulnerable_ratio,

        "dris_infrastructure": max(

            0.0,

            1.0 - severity_score / 10.0,

        ),

        "dris_weather": severity_score / 10.0,

        "dris_score": severity_score * 10.0,



        "date": datetime.now().strftime(

            "%Y-%m-%d"

        ),



        "disaster_type": disaster.disaster_type,

        "disaster_subtype": "",

    }



    # --------------------------------------------------------

    # FLOOD-SPECIFIC INPUT

    # --------------------------------------------------------



    if disaster_type == "flood":



        input_data.update({

            "rainfall": 85.0,

            "rainfall_72h_mm": 210.0,

            "flood_extent_km2": max(

                population / 2000.0,

                10.0,

            ),

            "flood_depth_m": 1.2,

            "flood_velocity_ms": 1.5,

            "flood_severity": severity_score,

            "event_duration_hours": 24.0,

        })



    # --------------------------------------------------------

    # EARTHQUAKE-SPECIFIC INPUT

    # --------------------------------------------------------



    elif disaster_type == "earthquake":



        input_data.update({

            "magnitude": 6.0,

            "depth": 10.0,

            "earthquake_count": 1.0,

        })



    # --------------------------------------------------------

    # FIRE-SPECIFIC INPUT

    # --------------------------------------------------------



    elif disaster_type == "wildfire":



        input_data.update({

            "fire_detection_count": 1.0,

            "fire_frp_sum": 50.0,

            "fire_frp_max": 50.0,

        })



    return input_data





# ============================================================

# USER SCHEMAS

# ============================================================



class UserCreate(BaseModel):

    name: str

    email: str

    role: str

    password: str

    language: str = "en"





class UserUpdate(BaseModel):

    name: Optional[str] = None

    email: Optional[str] = None

    role: Optional[str] = None

    password: Optional[str] = None

    language: Optional[str] = None





class LanguageUpdate(BaseModel):

    language: str





# ============================================================

# DISASTER SCHEMAS

# ============================================================



class DisasterCreate(BaseModel):

    disaster_type: str

    location: str

    latitude: Optional[float] = None

    longitude: Optional[float] = None

    severity: str

    description: Optional[str] = None





class DisasterUpdate(BaseModel):

    disaster_type: Optional[str] = None

    location: Optional[str] = None

    latitude: Optional[float] = None

    longitude: Optional[float] = None

    severity: Optional[str] = None

    description: Optional[str] = None





# ============================================================

# RESOURCE SCHEMAS

# ============================================================



class ResourceCreate(BaseModel):

    resource_type: str

    quantity: int

    location: str

    status: str





class ResourceUpdate(BaseModel):

    resource_type: Optional[str] = None

    quantity: Optional[int] = None

    location: Optional[str] = None

    status: Optional[str] = None





# ============================================================

# VEHICLE SCHEMAS

# ============================================================



class VehicleCreate(BaseModel):

    vehicle_number: str

    vehicle_type: str

    driver_name: str

    location: str

    status: str





class VehicleUpdate(BaseModel):

    vehicle_number: Optional[str] = None

    vehicle_type: Optional[str] = None

    driver_name: Optional[str] = None

    location: Optional[str] = None

    status: Optional[str] = None





# ============================================================

# FIELD TEAM SCHEMAS

# ============================================================



class FieldTeamCreate(BaseModel):

    name: str

    members: int

    zone: str

    leader: str

    status: str





class FieldTeamUpdate(BaseModel):

    name: Optional[str] = None

    members: Optional[int] = None

    zone: Optional[str] = None

    leader: Optional[str] = None

    status: Optional[str] = None





# ============================================================

# MISSION SCHEMAS

# ============================================================



class MissionCreate(BaseModel):

    title: str

    disaster_id: Optional[int] = None

    field_team_id: Optional[int] = None

    location: Optional[str] = None

    status: str = "Pending"

    description: Optional[str] = None

    # Vehicle assigned to execute this mission (Mission -> Vehicle link)
    vehicle_id: Optional[int] = None

    # SOS request this mission was raised from (SOS -> Mission link)
    sos_id: Optional[int] = None





class MissionUpdate(BaseModel):

    title: Optional[str] = None

    disaster_id: Optional[int] = None

    field_team_id: Optional[int] = None

    vehicle_id: Optional[int] = None

    location: Optional[str] = None

    status: Optional[str] = None

    description: Optional[str] = None

    sos_id: Optional[int] = None





# ============================================================

# MISSION RESOURCE SCHEMAS

# ============================================================



class MissionResourceCreate(BaseModel):

    mission_id: int

    resource_id: int

    quantity: int

    status: str = "Assigned"





class MissionResourceUpdate(BaseModel):

    quantity: Optional[int] = None

    status: Optional[str] = None





# ============================================================

# ZONE SCHEMAS

# ============================================================



class ZoneCreate(BaseModel):

    grid_cell_id: str

    disaster_id: int

    location: str

    latitude: Optional[float] = None

    longitude: Optional[float] = None

    severity_score: float = 0

    population: int = 0

    vulnerable_population: int = 0





class ZoneUpdate(BaseModel):

    grid_cell_id: Optional[str] = None

    disaster_id: Optional[int] = None

    location: Optional[str] = None

    latitude: Optional[float] = None

    longitude: Optional[float] = None

    severity_score: Optional[float] = None

    population: Optional[int] = None

    vulnerable_population: Optional[int] = None





class ScenarioSimulationRequest(BaseModel):

    population: int

    vulnerable_population: int

    severity_score: float

    latitude: float

    longitude: float

    disaster_type: str

    severity: str





# ============================================================

# LOGISTICS SCHEMAS

# ============================================================



class LogisticsOptimizeRequest(BaseModel):

    disaster_id: int

    zone_id: int

    vehicle_id: Optional[int] = None

    priority: str = "High"





class LogisticsPlanCreate(BaseModel):

    disaster_id: int

    source_location: str

    destination_location: str

    resource_type: str

    quantity: int

    vehicle_id: Optional[int] = None

    # Mission that requested this movement (Mission -> Logistics link)
    mission_id: Optional[int] = None

    priority: str = "High"

    status: str = "Planned"





class LogisticsPlanUpdate(BaseModel):

    status: Optional[str] = None

    vehicle_id: Optional[int] = None

    priority: Optional[str] = None

    quantity: Optional[int] = None





# ============================================================

# LOGIN

# ============================================================



class LoginRequest(BaseModel):

    username: str

    password: str





@app.post("/login")

def login(

    data: LoginRequest,

    db: Session = Depends(get_db),

):



    user = (

        db.query(User)

        .filter(User.email == data.username)

        .first()

    )



    if not user:

        raise HTTPException(

            status_code=401,

            detail="Invalid email or password",

        )



    if not verify_password(

        data.password,

        user.password,

    ):

        raise HTTPException(

            status_code=401,

            detail="Invalid email or password",

        )



    token = create_access_token(

        data={

            "sub": str(user.id),

            "email": user.email,

            "role": user.role,

        }

    )



    return {

        "access_token": token,

        "token_type": "bearer",

        "user": {

            "id": user.id,

            "name": user.name,

            "email": user.email,

            "role": user.role,

            "language": user.language or "en",

        },

    }





SUPPORTED_LANGUAGES = {

    "en": "English",

    "hi": "Hindi",

    "ta": "Tamil",

    "te": "Telugu",

    "kn": "Kannada",

    "ml": "Malayalam",

    "bn": "Bengali",

    "mr": "Marathi",

    "gu": "Gujarati",

    "pa": "Punjabi",

    "ur": "Urdu",

    "es": "Spanish",

    "fr": "French",

    "ar": "Arabic",

    "zh": "Chinese",

}





@app.get("/languages")

def get_supported_languages():

    return {

        "default": "en",

        "languages": SUPPORTED_LANGUAGES,

    }





@app.put("/me/language")

def update_my_language(

    data: LanguageUpdate,

    current_user: dict = Depends(get_current_user),

    db: Session = Depends(get_db),

):

    language = data.language.strip().lower()



    if language not in SUPPORTED_LANGUAGES:

        raise HTTPException(

            status_code=400,

            detail="Language is not supported",

        )



    user = db.query(User).filter(

        User.id == int(current_user.get("sub", 0))

    ).first()



    if not user:

        raise HTTPException(status_code=404, detail="User not found")



    user.language = language

    db.commit()

    db.refresh(user)



    return {

        "user_id": user.id,

        "language": user.language,

        "language_name": SUPPORTED_LANGUAGES[language],

    }





@app.get("/translations/{language}")

def get_translations(language: str):

    language = language.lower().strip()



    if language not in SUPPORTED_LANGUAGES:

        raise HTTPException(

            status_code=404,

            detail="Language is not supported",

        )



    translations = {

        "en": {

            "settings": "Settings",

            "missions": "My Missions",

            "save_changes": "Save Changes",

            "system_operational": "System Operational",

        },

        "hi": {

            "settings": "सेटिंग्स",

            "missions": "मेरे मिशन",

            "save_changes": "परिवर्तन सहेजें",

            "system_operational": "सिस्टम चालू है",

        },

        "ta": {

            "settings": "அமைப்புகள்",

            "missions": "என் பணிகள்",

            "save_changes": "மாற்றங்களை சேமிக்கவும்",

            "system_operational": "சிஸ்டம் செயல்பாட்டில் உள்ளது",

        },

    }



    translations.setdefault(language, translations["en"])



    return {

        "language": language,

        "name": SUPPORTED_LANGUAGES[language],

        "translations": translations[language],

    }





# ============================================================

# USERS

# ============================================================



@app.get("/users")

def get_users(db: Session = Depends(get_db)):

    return db.query(User).all()





@app.post("/users")

def create_user(

    data: UserCreate,

    db: Session = Depends(get_db),

):



    existing = (

        db.query(User)

        .filter(User.email == data.email)

        .first()

    )



    if existing:

        raise HTTPException(

            status_code=400,

            detail="Email already exists",

        )



    user = User(

        name=data.name,

        email=data.email,

        role=data.role,

        password=get_password_hash(data.password),

        language=data.language if data.language in SUPPORTED_LANGUAGES else "en",

    )



    db.add(user)

    db.commit()

    db.refresh(user)



    return user





@app.get("/users/{user_id}")

def get_user(

    user_id: int,

    db: Session = Depends(get_db),

):



    user = db.query(User).filter(

        User.id == user_id

    ).first()



    if not user:

        raise HTTPException(

            status_code=404,

            detail="User not found",

        )



    return user





@app.put("/users/{user_id}")

def update_user(

    user_id: int,

    data: UserUpdate,

    current_user: dict = Depends(get_current_user),

    db: Session = Depends(get_db),

):



    current_role = str(current_user.get("role") or "").strip().lower()

    current_id = str(current_user.get("sub") or "")

    if current_role not in {"admin", "administrator"} and current_id != str(user_id):

        raise HTTPException(status_code=403, detail="You do not have permission to update this user")



    user = db.query(User).filter(

        User.id == user_id

    ).first()



    if not user:

        raise HTTPException(

            status_code=404,

            detail="User not found",

        )



    updates = data.model_dump(

        exclude_unset=True

    )



    if current_role not in {"admin", "administrator"}:

        updates.pop("role", None)

        updates.pop("password", None)



    if (

        "language" in updates and

        updates["language"] not in SUPPORTED_LANGUAGES

    ):

        raise HTTPException(

            status_code=400,

            detail="Language is not supported",

        )



    if "password" in updates:

        updates["password"] = get_password_hash(

            updates["password"]

        )



    for key, value in updates.items():

        setattr(user, key, value)



    db.commit()

    db.refresh(user)



    return user





@app.delete("/users/{user_id}")

def delete_user(

    user_id: int,

    db: Session = Depends(get_db),

):



    user = db.query(User).filter(

        User.id == user_id

    ).first()



    if not user:

        raise HTTPException(

            status_code=404,

            detail="User not found",

        )



    db.delete(user)

    db.commit()



    return {

        "message": "User deleted successfully"

    }





# ============================================================

# DISASTERS

# ============================================================



@app.get("/disasters")

def get_disasters(

    db: Session = Depends(get_db),

):

    return db.query(Disaster).all()





@app.post("/disasters")

def create_disaster(

    data: DisasterCreate,

    db: Session = Depends(get_db),

):



    disaster = Disaster(

        **data.model_dump()

    )



    db.add(disaster)

    db.commit()

    db.refresh(disaster)



    log_action(
        db,
        action=f"Disaster reported: {disaster.disaster_type}",
        entity_type="Disaster",
        entity_id=disaster.id,
        detail=(
            f"location={disaster.location}, "
            f"severity={disaster.severity}"
        ),
    )



    return disaster





@app.get("/disasters/{disaster_id}")

def get_disaster(

    disaster_id: int,

    db: Session = Depends(get_db),

):



    disaster = db.query(Disaster).filter(

        Disaster.id == disaster_id

    ).first()



    if not disaster:

        raise HTTPException(

            status_code=404,

            detail="Disaster not found",

        )



    return disaster





@app.put("/disasters/{disaster_id}")

def update_disaster(

    disaster_id: int,

    data: DisasterUpdate,

    db: Session = Depends(get_db),

):



    disaster = db.query(Disaster).filter(

        Disaster.id == disaster_id

    ).first()



    if not disaster:

        raise HTTPException(

            status_code=404,

            detail="Disaster not found",

        )



    for key, value in data.model_dump(

        exclude_unset=True

    ).items():

        setattr(disaster, key, value)



    db.commit()

    db.refresh(disaster)



    return disaster





@app.delete("/disasters/{disaster_id}")

def delete_disaster(

    disaster_id: int,

    db: Session = Depends(get_db),

):



    disaster = db.query(Disaster).filter(

        Disaster.id == disaster_id

    ).first()



    if not disaster:

        raise HTTPException(

            status_code=404,

            detail="Disaster not found",

        )



    db.delete(disaster)

    db.commit()



    return {

        "message": "Disaster deleted successfully"

    }





# ============================================================

# RESOURCES

# ============================================================



@app.get("/resources")

def get_resources(

    db: Session = Depends(get_db),

):

    return db.query(Resource).all()





@app.post("/resources")

def create_resource(

    data: ResourceCreate,

    db: Session = Depends(get_db),

):



    resource = Resource(

        **data.model_dump()

    )



    db.add(resource)

    db.commit()

    db.refresh(resource)



    return resource





SHORTAGE_THRESHOLD = 50

@app.get("/resources/shortage-alerts")
def get_shortage_alerts(
    db: Session = Depends(get_db),
):
    resources = db.query(Resource).all()
    alerts = []

    for resource in resources:
        qty = safe_int(resource.quantity)
        if qty <= SHORTAGE_THRESHOLD:
            level = "critical" if qty == 0 else "warning"
            alerts.append({
                "id": resource.id,
                "resource_type": resource.resource_type,
                "quantity": qty,
                "location": resource.location,
                "status": resource.status,
                "alert_level": level,
                "threshold": SHORTAGE_THRESHOLD,
            })

    alerts.sort(key=lambda x: x["quantity"])
    return {"alerts": alerts, "count": len(alerts)}


@app.get("/resources/{resource_id}")

def get_resource(

    resource_id: int,

    db: Session = Depends(get_db),

):



    resource = db.query(Resource).filter(

        Resource.id == resource_id

    ).first()



    if not resource:

        raise HTTPException(

            status_code=404,

            detail="Resource not found",

        )



    return resource





@app.put("/resources/{resource_id}")

def update_resource(

    resource_id: int,

    data: ResourceUpdate,

    db: Session = Depends(get_db),

):



    resource = db.query(Resource).filter(

        Resource.id == resource_id

    ).first()



    if not resource:

        raise HTTPException(

            status_code=404,

            detail="Resource not found",

        )



    for key, value in data.model_dump(

        exclude_unset=True

    ).items():

        setattr(resource, key, value)



    db.commit()

    db.refresh(resource)



    return resource





@app.delete("/resources/{resource_id}")

def delete_resource(

    resource_id: int,

    db: Session = Depends(get_db),

):



    resource = db.query(Resource).filter(

        Resource.id == resource_id

    ).first()



    if not resource:

        raise HTTPException(

            status_code=404,

            detail="Resource not found",

        )



    db.delete(resource)

    db.commit()



    return {

        "message": "Resource deleted successfully"

    }





# ============================================================

# VEHICLES

# ============================================================



@app.get("/vehicles")

def get_vehicles(

    db: Session = Depends(get_db),

):

    return db.query(Vehicle).all()





@app.post("/vehicles")

def create_vehicle(

    data: VehicleCreate,

    db: Session = Depends(get_db),

):



    vehicle = Vehicle(

        **data.model_dump()

    )



    db.add(vehicle)

    db.commit()

    db.refresh(vehicle)



    return vehicle





@app.get("/vehicles/{vehicle_id}")

def get_vehicle(

    vehicle_id: int,

    db: Session = Depends(get_db),

):



    vehicle = db.query(Vehicle).filter(

        Vehicle.id == vehicle_id

    ).first()



    if not vehicle:

        raise HTTPException(

            status_code=404,

            detail="Vehicle not found",

        )



    return vehicle





@app.put("/vehicles/{vehicle_id}")

def update_vehicle(

    vehicle_id: int,

    data: VehicleUpdate,

    db: Session = Depends(get_db),

):



    vehicle = db.query(Vehicle).filter(

        Vehicle.id == vehicle_id

    ).first()



    if not vehicle:

        raise HTTPException(

            status_code=404,

            detail="Vehicle not found",

        )



    for key, value in data.model_dump(

        exclude_unset=True

    ).items():

        setattr(vehicle, key, value)



    db.commit()

    db.refresh(vehicle)



    return vehicle





@app.delete("/vehicles/{vehicle_id}")

def delete_vehicle(

    vehicle_id: int,

    db: Session = Depends(get_db),

):



    vehicle = db.query(Vehicle).filter(

        Vehicle.id == vehicle_id

    ).first()



    if not vehicle:

        raise HTTPException(

            status_code=404,

            detail="Vehicle not found",

        )



    db.delete(vehicle)

    db.commit()



    return {

        "message": "Vehicle deleted successfully"

    }





# ============================================================

# FIELD TEAMS

# ============================================================



@app.get("/field-teams")

def get_field_teams(

    db: Session = Depends(get_db),

):

    return db.query(FieldTeam).all()





@app.post("/field-teams")

def create_field_team(

    data: FieldTeamCreate,

    db: Session = Depends(get_db),

):



    team = FieldTeam(

        **data.model_dump()

    )



    db.add(team)

    db.commit()

    db.refresh(team)



    return team





@app.put("/field-teams/{team_id}")

def update_field_team(

    team_id: int,

    data: FieldTeamUpdate,

    db: Session = Depends(get_db),

):



    team = db.query(FieldTeam).filter(

        FieldTeam.id == team_id

    ).first()



    if not team:

        raise HTTPException(

            status_code=404,

            detail="Field team not found",

        )



    for key, value in data.model_dump(

        exclude_unset=True

    ).items():

        setattr(team, key, value)



    db.commit()

    db.refresh(team)



    return team





@app.delete("/field-teams/{team_id}")

def delete_field_team(

    team_id: int,

    db: Session = Depends(get_db),

):



    team = db.query(FieldTeam).filter(

        FieldTeam.id == team_id

    ).first()



    if not team:

        raise HTTPException(

            status_code=404,

            detail="Field team not found",

        )



    db.delete(team)

    db.commit()



    return {

        "message": "Field team deleted successfully"

    }





# ============================================================

# MISSIONS

# ============================================================



@app.get("/missions")

def get_missions(

    db: Session = Depends(get_db),

):

    return db.query(Mission).all()





@app.post("/missions")

def create_mission(

    data: MissionCreate,

    db: Session = Depends(get_db),

):

    disaster = None

    if data.disaster_id is not None:
        disaster = db.query(Disaster).filter(
            Disaster.id == data.disaster_id
        ).first()

        if not disaster:
            raise HTTPException(
                status_code=404,
                detail="Disaster not found",
            )

    field_team = None

    if data.field_team_id is not None:
        field_team = db.query(FieldTeam).filter(
            FieldTeam.id == data.field_team_id
        ).first()

        if not field_team:
            raise HTTPException(
                status_code=404,
                detail="Field team not found",
            )

    vehicle = None

    if data.vehicle_id is not None:
        vehicle = db.query(Vehicle).filter(
            Vehicle.id == data.vehicle_id
        ).first()

        if not vehicle:
            raise HTTPException(
                status_code=404,
                detail="Vehicle not found",
            )

    sos_request = None

    if data.sos_id is not None:
        sos_request = db.query(SOSRequest).filter(
            SOSRequest.id == data.sos_id
        ).first()

        if not sos_request:
            raise HTTPException(
                status_code=404,
                detail="SOS request not found",
            )



    mission = Mission(

        **data.model_dump()

    )



    db.add(mission)

    db.commit()

    db.refresh(mission)



    # Raising a mission from an SOS request acknowledges that request.
    if sos_request is not None:
        sos_request.status = "Acknowledged"
        db.commit()



    log_action(
        db,
        action=f"Mission created: {mission.title}",
        entity_type="Mission",
        entity_id=mission.id,
        detail=(
            f"disaster_id={mission.disaster_id}, "
            f"field_team_id={mission.field_team_id}, "
            f"vehicle_id={mission.vehicle_id}, "
            f"sos_id={mission.sos_id}"
        ),
    )



    return mission





@app.put("/missions/{mission_id}")

def update_mission(

    mission_id: int,

    data: MissionUpdate,

    db: Session = Depends(get_db),

):

    if data.vehicle_id is not None:
        vehicle = db.query(Vehicle).filter(
            Vehicle.id == data.vehicle_id
        ).first()

        if not vehicle:
            raise HTTPException(
                status_code=404,
                detail="Vehicle not found",
            )

    if data.sos_id is not None:
        sos_request = db.query(SOSRequest).filter(
            SOSRequest.id == data.sos_id
        ).first()

        if not sos_request:
            raise HTTPException(
                status_code=404,
                detail="SOS request not found",
            )



    mission = db.query(Mission).filter(

        Mission.id == mission_id

    ).first()



    if not mission:

        raise HTTPException(

            status_code=404,

            detail="Mission not found",

        )



    for key, value in data.model_dump(

        exclude_unset=True

    ).items():

        setattr(mission, key, value)



    db.commit()

    db.refresh(mission)



    log_action(
        db,
        action=f"Mission updated: {mission.title}",
        entity_type="Mission",
        entity_id=mission.id,
        detail=(
            f"status={mission.status}, "
            f"vehicle_id={mission.vehicle_id}"
        ),
    )



    return mission





@app.delete("/missions/{mission_id}")

def delete_mission(

    mission_id: int,

    db: Session = Depends(get_db),

):



    mission = db.query(Mission).filter(

        Mission.id == mission_id

    ).first()



    if not mission:

        raise HTTPException(

            status_code=404,

            detail="Mission not found",

        )



    db.delete(mission)

    db.commit()



    return {

        "message": "Mission deleted successfully"

    }





# ============================================================

# MISSION RESOURCES

# ============================================================



@app.get("/mission-resources")

def get_mission_resources(

    db: Session = Depends(get_db),

):

    return db.query(MissionResource).all()





@app.post("/mission-resources")

def create_mission_resource(

    data: MissionResourceCreate,

    db: Session = Depends(get_db),

):



    if data.quantity <= 0:

        raise HTTPException(

            status_code=400,

            detail="Quantity must be greater than zero",

        )



    mission = db.query(Mission).filter(

        Mission.id == data.mission_id

    ).first()



    if not mission:

        raise HTTPException(

            status_code=404,

            detail="Mission not found",

        )



    resource = db.query(Resource).filter(

        Resource.id == data.resource_id

    ).first()



    if not resource:

        raise HTTPException(

            status_code=404,

            detail="Resource not found",

        )



    if resource.quantity < data.quantity:

        raise HTTPException(

            status_code=400,

            detail={

                "message": "Insufficient resource quantity",

                "available": resource.quantity,

                "requested": data.quantity,

            },

        )



    resource.quantity -= data.quantity



    assignment = MissionResource(

        mission_id=data.mission_id,

        resource_id=data.resource_id,

        quantity=data.quantity,

        status=data.status,

    )



    db.add(assignment)

    db.commit()

    db.refresh(assignment)



    return assignment





@app.put("/mission-resources/{mission_resource_id}")

def update_mission_resource(

    mission_resource_id: int,

    data: MissionResourceUpdate,

    db: Session = Depends(get_db),

):



    assignment = db.query(

        MissionResource

    ).filter(

        MissionResource.id == mission_resource_id

    ).first()



    if not assignment:

        raise HTTPException(

            status_code=404,

            detail="Mission resource assignment not found",

        )



    old_quantity = assignment.quantity



    updates = data.model_dump(

        exclude_unset=True

    )



    if "quantity" in updates:



        new_quantity = updates["quantity"]



        if new_quantity <= 0:

            raise HTTPException(

                status_code=400,

                detail="Quantity must be greater than zero",

            )



        resource = db.query(Resource).filter(

            Resource.id == assignment.resource_id

        ).first()



        difference = new_quantity - old_quantity



        if difference > 0:



            if resource.quantity < difference:

                raise HTTPException(

                    status_code=400,

                    detail="Insufficient resource quantity",

                )



            resource.quantity -= difference



        elif difference < 0:

            resource.quantity += abs(difference)



        assignment.quantity = new_quantity



    if "status" in updates:

        assignment.status = updates["status"]



    db.commit()

    db.refresh(assignment)



    return assignment





@app.delete("/mission-resources/{mission_resource_id}")

def delete_mission_resource(

    mission_resource_id: int,

    db: Session = Depends(get_db),

):



    assignment = db.query(

        MissionResource

    ).filter(

        MissionResource.id == mission_resource_id

    ).first()



    if not assignment:

        raise HTTPException(

            status_code=404,

            detail="Mission resource assignment not found",

        )



    resource = db.query(Resource).filter(

        Resource.id == assignment.resource_id

    ).first()



    if resource:

        resource.quantity += assignment.quantity



    db.delete(assignment)

    db.commit()



    return {

        "message": "Mission resource deleted successfully"

    }





# ============================================================

# ZONES

# ============================================================



@app.get("/zones")

def get_zones(

    db: Session = Depends(get_db),

):

    return db.query(Zone).all()





@app.post("/zones")

def create_zone(

    data: ZoneCreate,

    db: Session = Depends(get_db),

):



    disaster = db.query(Disaster).filter(

        Disaster.id == data.disaster_id

    ).first()



    if not disaster:

        raise HTTPException(

            status_code=404,

            detail="Disaster not found",

        )



    zone = Zone(

        **data.model_dump()

    )



    db.add(zone)

    db.commit()

    db.refresh(zone)



    return zone





@app.put("/zones/{zone_id}")

def update_zone(

    zone_id: int,

    data: ZoneUpdate,

    db: Session = Depends(get_db),

):



    zone = db.query(Zone).filter(

        Zone.id == zone_id

    ).first()



    if not zone:

        raise HTTPException(

            status_code=404,

            detail="Zone not found",

        )



    for key, value in data.model_dump(

        exclude_unset=True

    ).items():

        setattr(zone, key, value)



    db.commit()

    db.refresh(zone)



    return zone





@app.delete("/zones/{zone_id}")

def delete_zone(

    zone_id: int,

    db: Session = Depends(get_db),

):



    zone = db.query(Zone).filter(

        Zone.id == zone_id

    ).first()



    if not zone:

        raise HTTPException(

            status_code=404,

            detail="Zone not found",

        )



    db.delete(zone)

    db.commit()



    return {

        "message": "Zone deleted successfully"

    }





# ============================================================

# BASIC ML PREDICTION

# ============================================================



class PredictionRequest(BaseModel):

    data: dict





@app.post("/prediction")

def prediction(

    request: PredictionRequest,

):



    if model is None:

        raise HTTPException(

            status_code=500,

            detail="ML model is not loaded",

        )



    X_input, defaulted_features = (

        build_model_input(request.data)

    )



    prediction_result = model.predict(

        X_input

    )[0]



    return {

        "predictions": {

            "food_demand": max(

                0,

                round(

                    safe_float(

                        prediction_result[0]

                    )

                ),

            ),

            "water_demand_litres": max(

                0,

                round(

                    safe_float(

                        prediction_result[1]

                    )

                ),

            ),

            "medical_kit_demand": max(

                0,

                round(

                    safe_float(

                        prediction_result[2]

                    )

                ),

            ),

            "shelter_demand": max(

                0,

                round(

                    safe_float(

                        prediction_result[3]

                    )

                ),

            ),

        },

        "input_summary": X_input.to_dict(

            orient="records"

        )[0],

        "defaulted_features": defaulted_features,

    }





# ============================================================

# ZONE PREDICTION

# ============================================================



@app.post("/prediction/zone/{zone_id}")

def prediction_zone(

    zone_id: int,

    db: Session = Depends(get_db),

):



    if model is None:

        raise HTTPException(

            status_code=500,

            detail="ML model is not loaded",

        )



    zone = db.query(Zone).filter(

        Zone.id == zone_id

    ).first()



    if not zone:

        raise HTTPException(

            status_code=404,

            detail="Zone not found",

        )



    disaster = db.query(Disaster).filter(

        Disaster.id == zone.disaster_id

    ).first()



    if not disaster:

        raise HTTPException(

            status_code=404,

            detail="Disaster associated with zone not found",

        )



    input_data = build_zone_model_data(

        db,

        zone,

        disaster,

    )



    X_input, defaulted_features = (

        build_model_input(input_data)

    )



    raw_prediction = model.predict(

        X_input

    )[0]



    predictions = {

        "food_demand": max(

            0,

            round(

                safe_float(

                    raw_prediction[0]

                )

            ),

        ),

        "water_demand_litres": max(

            0,

            round(

                safe_float(

                    raw_prediction[1]

                )

            ),

        ),

        "medical_kit_demand": max(

            0,

            round(

                safe_float(

                    raw_prediction[2]

                )

            ),

        ),

        "shelter_demand": max(

            0,

            round(

                safe_float(

                    raw_prediction[3]

                )

            ),

        ),

    }



    return {

        "zone_id": zone.id,

        "grid_cell_id": zone.grid_cell_id,

        "location": zone.location,

        "disaster_id": disaster.id,

        "predictions": predictions,

        "defaulted_features": defaulted_features,

        "model_features_count": len(model_features),

    }





# ============================================================

# VULNERABILITY PREDICTION

# ============================================================



@app.post("/prediction/zone/{zone_id}/vulnerability")

def prediction_zone_vulnerability(

    zone_id: int,

    db: Session = Depends(get_db),

):



    if model is None:

        raise HTTPException(

            status_code=500,

            detail="ML model is not loaded",

        )



    zone = db.query(Zone).filter(

        Zone.id == zone_id

    ).first()



    if not zone:

        raise HTTPException(

            status_code=404,

            detail="Zone not found",

        )



    disaster = db.query(Disaster).filter(

        Disaster.id == zone.disaster_id

    ).first()



    if not disaster:

        raise HTTPException(

            status_code=404,

            detail="Disaster not found",

        )



    input_data = build_zone_model_data(

        db,

        zone,

        disaster,

    )



    vulnerability_ratio = (

        zone.vulnerable_population

        / zone.population

        if zone.population > 0

        else 0

    )



    input_data["vulnerability_score"] = (

        vulnerability_ratio

    )



    X_input, defaulted_features = (

        build_model_input(input_data)

    )



    raw_prediction = model.predict(

        X_input

    )[0]



    multiplier = (

        1 + vulnerability_ratio * 0.30

    )



    return {

        "zone_id": zone.id,

        "vulnerability_ratio": round(

            vulnerability_ratio,

            4,

        ),

        "vulnerability_multiplier": round(

            multiplier,

            4,

        ),

        "predictions": {

            "food_demand": max(

                0,

                round(

                    safe_float(

                        raw_prediction[0]

                    ) * multiplier

                ),

            ),

            "water_demand_litres": max(

                0,

                round(

                    safe_float(

                        raw_prediction[1]

                    ) * multiplier

                ),

            ),

            "medical_kit_demand": max(

                0,

                round(

                    safe_float(

                        raw_prediction[2]

                    ) * multiplier

                ),

            ),

            "shelter_demand": max(

                0,

                round(

                    safe_float(

                        raw_prediction[3]

                    ) * multiplier

                ),

            ),

        },

        "defaulted_features": defaulted_features,

    }





# ============================================================

# SCENARIO SIMULATION

# ============================================================



@app.post("/prediction/simulate")

def simulate_prediction(

    request: ScenarioSimulationRequest,

):



    if model is None:

        raise HTTPException(

            status_code=500,

            detail="ML model is not loaded",

        )



    vulnerability_ratio = (

        request.vulnerable_population

        / request.population

        if request.population > 0

        else 0

    )



    input_data = {

        "latitude": request.latitude,

        "longitude": request.longitude,

        "population": request.population,

        "vulnerability_score": vulnerability_ratio,

        "impact_score": request.severity_score,

        "severity_score": request.severity_score,

        "disaster_type": request.disaster_type,

        "severity": request.severity,

        "date": datetime.now().strftime(

            "%Y-%m-%d"

        ),

    }



    disaster_type = normalize_text(

        request.disaster_type

    )



    if disaster_type == "flood":



        input_data.update({

            "rainfall": 85.0,

            "rainfall_72h_mm": 210.0,

            "flood_extent_km2": 25.0,

            "flood_depth_m": 1.2,

            "flood_velocity_ms": 1.5,

            "flood_severity": request.severity_score,

        })



    X_input, defaulted_features = (

        build_model_input(input_data)

    )



    raw_prediction = model.predict(

        X_input

    )[0]



    multiplier = (

        1 + vulnerability_ratio * 0.30

    )



    return {

        "predictions": {

            "food_demand": max(

                0,

                round(

                    safe_float(

                        raw_prediction[0]

                    ) * multiplier

                ),

            ),

            "water_demand_litres": max(

                0,

                round(

                    safe_float(

                        raw_prediction[1]

                    ) * multiplier

                ),

            ),

            "medical_kit_demand": max(

                0,

                round(

                    safe_float(

                        raw_prediction[2]

                    ) * multiplier

                ),

            ),

            "shelter_demand": max(

                0,

                round(

                    safe_float(

                        raw_prediction[3]

                    ) * multiplier

                ),

            ),

        },

        "vulnerability_ratio": round(

            vulnerability_ratio,

            4,

        ),

        "defaulted_features": defaulted_features,

    }





# ============================================================

# LOGISTICS OPTIMIZATION

# ============================================================



@app.post("/logistics/optimize")

def optimize_logistics(

    request: LogisticsOptimizeRequest,

    db: Session = Depends(get_db),

):



    if model is None:

        raise HTTPException(

            status_code=500,

            detail="ML model is not loaded",

        )



    disaster = db.query(Disaster).filter(

        Disaster.id == request.disaster_id

    ).first()



    if not disaster:

        raise HTTPException(

            status_code=404,

            detail="Disaster not found",

        )



    zone = db.query(Zone).filter(

        Zone.id == request.zone_id

    ).first()



    if not zone:

        raise HTTPException(

            status_code=404,

            detail="Zone not found",

        )



    if zone.disaster_id != disaster.id:

        raise HTTPException(

            status_code=400,

            detail="Zone does not belong to selected disaster",

        )



    # --------------------------------------------------------

    # ML INPUT

    # --------------------------------------------------------



    input_data = build_zone_model_data(

        db,

        zone,

        disaster,

    )



    X_input, defaulted_features = (

        build_model_input(input_data)

    )



    raw_prediction = model.predict(

        X_input

    )[0]



    vulnerability_ratio = calculate_vulnerability_ratio(

        zone

    )



    vulnerability_multiplier = (

        1 + vulnerability_ratio * 0.30

    )



    predicted_demand = {

        "Food": max(

            0,

            round(

                safe_float(

                    raw_prediction[0]

                ) * vulnerability_multiplier

            ),

        ),

        "Water": max(

            0,

            round(

                safe_float(

                    raw_prediction[1]

                ) * vulnerability_multiplier

            ),

        ),

        "Medical Kit": max(

            0,

            round(

                safe_float(

                    raw_prediction[2]

                ) * vulnerability_multiplier

            ),

        ),

        "Shelter": max(

            0,

            round(

                safe_float(

                    raw_prediction[3]

                ) * vulnerability_multiplier

            ),

        ),

    }



    # --------------------------------------------------------

    # INVENTORY

    # --------------------------------------------------------



    resources = db.query(Resource).filter(

        Resource.quantity > 0

    ).all()



    resource_mapping = {

        "food": "Food",

        "water": "Water",

        "medical": "Medical Kit",

        "medical kit": "Medical Kit",

        "medical kits": "Medical Kit",

        "shelter": "Shelter",

    }



    available_inventory = {

        "Food": 0,

        "Water": 0,

        "Medical Kit": 0,

        "Shelter": 0,

    }



    for resource in resources:



        resource_type = normalize_text(

            resource.resource_type

        )



        mapped_type = resource_mapping.get(

            resource_type

        )



        if mapped_type:

            available_inventory[mapped_type] += max(

                safe_int(resource.quantity),

                0,

            )



    # --------------------------------------------------------

    # OPTIMIZATION

    # --------------------------------------------------------



    try:

        from ortools.linear_solver import pywraplp



        solver = pywraplp.Solver.CreateSolver(

            "SCIP"

        )



    except Exception:

        solver = None



    allocation = {}



    if solver:



        variables = {}



        for resource_type in predicted_demand:



            demand = predicted_demand[

                resource_type

            ]



            available = available_inventory[

                resource_type

            ]



            variable = solver.IntVar(

                0,

                max(0, available),

                resource_type.replace(

                    " ",

                    "_",

                ),

            )



            solver.Add(

                variable <= max(

                    0,

                    demand,

                )

            )



            variables[

                resource_type

            ] = variable



        objective = solver.Objective()



        for resource_type, variable in variables.items():

            objective.SetCoefficient(

                variable,

                1,

            )



        objective.SetMaximization()



        solver.Solve()



        for resource_type, variable in variables.items():



            allocation[

                resource_type

            ] = int(

                round(

                    variable.solution_value()

                )

            )



    else:



        # Fallback if OR-Tools is unavailable

        for resource_type in predicted_demand:



            allocation[

                resource_type

            ] = min(

                predicted_demand[

                    resource_type

                ],

                available_inventory[

                    resource_type

                ],

            )



    # --------------------------------------------------------

    # RESULT

    # --------------------------------------------------------



    resource_allocation = {}



    total_requested = 0

    total_allocated = 0

    total_shortage = 0



    for resource_type in predicted_demand:



        demand = predicted_demand[

            resource_type

        ]



        available = available_inventory[

            resource_type

        ]



        allocated = allocation.get(

            resource_type,

            0,

        )



        shortage = max(

            demand - allocated,

            0,

        )



        resource_allocation[

            resource_type

        ] = {

            "demand": demand,

            "available": available,

            "allocated": allocated,

            "shortage": shortage,

        }



        total_requested += demand

        total_allocated += allocated

        total_shortage += shortage



    # --------------------------------------------------------

    # VEHICLE

    # --------------------------------------------------------



    selected_vehicle = None



    if request.vehicle_id is not None:



        selected_vehicle = db.query(

            Vehicle

        ).filter(

            Vehicle.id == request.vehicle_id

        ).first()



        if not selected_vehicle:

            raise HTTPException(

                status_code=404,

                detail="Selected vehicle not found",

            )



    else:



        selected_vehicle = db.query(

            Vehicle

        ).filter(

            Vehicle.status.in_([

                "Available",

                "available",

                "Active",

                "active",

            ])

        ).first()



    # --------------------------------------------------------

    # DELIVERY STATUS

    # --------------------------------------------------------



    if total_allocated == 0:



        delivery_status = (

            "No Resources Available"

        )



    elif total_allocated < total_requested:



        delivery_status = (

            "Partially Allocated"

        )



    else:



        delivery_status = (

            "Fully Allocated"

        )



    return {

        "optimization_status": "completed",



        "disaster": {

            "id": disaster.id,

            "type": disaster.disaster_type,

            "location": disaster.location,

            "severity": disaster.severity,

        },



        "zone": {

            "id": zone.id,

            "grid_cell_id": zone.grid_cell_id,

            "location": zone.location,

            "population": zone.population,

            "vulnerable_population": zone.vulnerable_population,

            "severity_score": zone.severity_score,

        },



        "priority": request.priority,



        "prediction": predicted_demand,



        "resource_allocation": resource_allocation,



        "summary": {

            "total_requested": total_requested,

            "total_allocated": total_allocated,

            "total_shortage": total_shortage,

            "delivery_status": delivery_status,

        },



        "vehicle": (

            {

                "id": selected_vehicle.id,

                "vehicle_number": selected_vehicle.vehicle_number,

                "vehicle_type": selected_vehicle.vehicle_type,

                "driver_name": selected_vehicle.driver_name,

                "location": selected_vehicle.location,

                "status": selected_vehicle.status,

            }

            if selected_vehicle

            else None

        ),



        "defaulted_features": defaulted_features,

    }





# ============================================================

# IN-MEMORY LOGISTICS PLANS

# ============================================================



logistics_plans = []

next_logistics_plan_id = 1





@app.post("/logistics/plan")

def create_logistics_plan(

    data: LogisticsPlanCreate,

    db: Session = Depends(get_db),

):



    global next_logistics_plan_id



    disaster = db.query(Disaster).filter(

        Disaster.id == data.disaster_id

    ).first()



    if not disaster:

        raise HTTPException(

            status_code=404,

            detail="Disaster not found",

        )



    if data.vehicle_id is not None:



        vehicle = db.query(Vehicle).filter(

            Vehicle.id == data.vehicle_id

        ).first()



        if not vehicle:

            raise HTTPException(

                status_code=404,

                detail="Vehicle not found",

            )



    mission = None

    if data.mission_id is not None:
        mission = db.query(Mission).filter(
            Mission.id == data.mission_id
        ).first()

        if not mission:
            raise HTTPException(
                status_code=404,
                detail="Mission not found",
            )

    plan = {

        "id": next_logistics_plan_id,

        "disaster_id": data.disaster_id,

        "source_location": data.source_location,

        "destination_location": data.destination_location,

        "resource_type": data.resource_type,

        "quantity": data.quantity,

        "vehicle_id": data.vehicle_id,

        "mission_id": data.mission_id,

        "priority": data.priority,

        "status": "planned",

    }



    logistics_plans.append(plan)



    next_logistics_plan_id += 1



    log_action(
        db,
        action=f"Logistics plan created: #{plan['id']}",
        entity_type="LogisticsPlan",
        entity_id=plan["id"],
        detail=(
            f"disaster_id={plan['disaster_id']}, "
            f"mission_id={plan['mission_id']}, "
            f"resource={plan['resource_type']}, "
            f"quantity={plan['quantity']}, "
            f"vehicle_id={plan['vehicle_id']}"
        ),
    )



    return plan





@app.get("/logistics")

def get_logistics_plans():

    return logistics_plans





@app.get("/logistics/{plan_id}")

def get_logistics_plan(

    plan_id: int,

):



    for plan in logistics_plans:



        if plan["id"] == plan_id:

            return plan



    raise HTTPException(

        status_code=404,

        detail="Logistics plan not found",

    )





@app.put("/logistics/{plan_id}")

def update_logistics_plan(

    plan_id: int,

    data: LogisticsPlanUpdate,

):



    for plan in logistics_plans:



        if plan["id"] == plan_id:



            updates = data.model_dump(

                exclude_unset=True

            )



            for key, value in updates.items():



                if key == "status":

                    value = value.lower()



                plan[key] = value



            return plan



    raise HTTPException(

        status_code=404,

        detail="Logistics plan not found",

    )





# ============================================================

# ZONE PRIORITY

# ============================================================



def calculate_zone_priority(

    zone: Zone,

):



    severity = min(

        max(

            safe_float(

                zone.severity_score

            ),

            0,

        ),

        10,

    )



    vulnerable_ratio = (

        zone.vulnerable_population

        / zone.population

        if zone.population > 0

        else 0

    )



    population_score = min(

        zone.population / 25000,

        1,

    ) * 10



    vulnerability_score = (

        vulnerable_ratio * 10

    )



    priority_score = (

        severity * 0.50

        + population_score * 0.25

        + vulnerability_score * 0.25

    )



    if priority_score >= 8:

        category = "Critical"



    elif priority_score >= 6:

        category = "High"



    elif priority_score >= 4:

        category = "Medium"



    else:

        category = "Low"



    return {

        "zone_id": zone.id,

        "grid_cell_id": zone.grid_cell_id,

        "location": zone.location,

        "severity_score": severity,

        "population": zone.population,

        "vulnerable_population": zone.vulnerable_population,

        "priority_score": round(

            priority_score,

            2,

        ),

        "priority": category,

    }





@app.get("/zones/{zone_id}/priority")

def get_zone_priority(

    zone_id: int,

    db: Session = Depends(get_db),

):



    zone = db.query(Zone).filter(

        Zone.id == zone_id

    ).first()



    if not zone:

        raise HTTPException(

            status_code=404,

            detail="Zone not found",

        )



    return calculate_zone_priority(zone)





@app.get("/zones/priorities")

def get_zone_priorities(

    db: Session = Depends(get_db),

):



    zones = db.query(Zone).all()



    return [

        calculate_zone_priority(zone)

        for zone in zones

    ]





# ============================================================

# VEHICLE LIVE LOCATION

# ============================================================



class VehicleLocationUpdate(BaseModel):

    latitude: float

    longitude: float





@app.put("/vehicles/{vehicle_id}/location")

def update_vehicle_location(

    vehicle_id: int,

    data: VehicleLocationUpdate,

    db: Session = Depends(get_db),

):



    vehicle = db.query(Vehicle).filter(

        Vehicle.id == vehicle_id

    ).first()



    if not vehicle:

        raise HTTPException(

            status_code=404,

            detail="Vehicle not found",

        )



    vehicle.location = (

        f"{data.latitude},{data.longitude}"

    )



    db.commit()

    db.refresh(vehicle)



    return {

        "vehicle_id": vehicle.id,

        "vehicle_number": vehicle.vehicle_number,

        "latitude": data.latitude,

        "longitude": data.longitude,

        "location": vehicle.location,

    }





@app.get("/vehicles/{vehicle_id}/location")

def get_vehicle_location(

    vehicle_id: int,

    db: Session = Depends(get_db),

):



    vehicle = db.query(Vehicle).filter(

        Vehicle.id == vehicle_id

    ).first()



    if not vehicle:

        raise HTTPException(

            status_code=404,

            detail="Vehicle not found",

        )



    latitude = None

    longitude = None



    try:

        parts = vehicle.location.split(",")



        if len(parts) == 2:



            latitude = float(

                parts[0].strip()

            )



            longitude = float(

                parts[1].strip()

            )



    except Exception:

        pass



    return {

        "vehicle_id": vehicle.id,

        "vehicle_number": vehicle.vehicle_number,

        "location": vehicle.location,

        "latitude": latitude,

        "longitude": longitude,

    }





# ============================================================

# ROUTE / ETA

# ============================================================



class LogisticsRouteRequest(BaseModel):

    vehicle_id: int

    zone_id: int

    average_speed_kmph: float = 40.0





def haversine_distance(

    lat1,

    lon1,

    lat2,

    lon2,

):



    radius = 6371.0



    p1 = math.radians(lat1)

    p2 = math.radians(lat2)



    dp = math.radians(

        lat2 - lat1

    )



    dl = math.radians(

        lon2 - lon1

    )



    a = (

        math.sin(dp / 2) ** 2

        + math.cos(p1)

        * math.cos(p2)

        * math.sin(dl / 2) ** 2

    )



    return (

        radius

        * 2

        * math.atan2(

            math.sqrt(a),

            math.sqrt(1 - a),

        )

    )





@app.post("/logistics/route")

def calculate_logistics_route(

    request: LogisticsRouteRequest,

    db: Session = Depends(get_db),

):



    vehicle = db.query(Vehicle).filter(

        Vehicle.id == request.vehicle_id

    ).first()



    if not vehicle:

        raise HTTPException(

            status_code=404,

            detail="Vehicle not found",

        )



    zone = db.query(Zone).filter(

        Zone.id == request.zone_id

    ).first()



    if not zone:

        raise HTTPException(

            status_code=404,

            detail="Zone not found",

        )



    start_lat = None

    start_lon = None



    try:



        parts = vehicle.location.split(",")



        if len(parts) == 2:



            start_lat = float(

                parts[0].strip()

            )



            start_lon = float(

                parts[1].strip()

            )



    except Exception:

        pass



    if start_lat is None or start_lon is None:



        disaster = db.query(

            Disaster

        ).filter(

            Disaster.id == zone.disaster_id

        ).first()



        if disaster:



            start_lat = (

                disaster.latitude

                or zone.latitude

                or 0

            )



            start_lon = (

                disaster.longitude

                or zone.longitude

                or 0

            )



        else:



            start_lat = zone.latitude or 0

            start_lon = zone.longitude or 0



    destination_lat = (

        zone.latitude or 0

    )



    destination_lon = (

        zone.longitude or 0

    )



    distance_km = haversine_distance(

        start_lat,

        start_lon,

        destination_lat,

        destination_lon,

    )



    speed = max(

        safe_float(

            request.average_speed_kmph,

            40,

        ),

        1,

    )



    eta_hours = distance_km / speed



    eta_minutes = eta_hours * 60



    return {

        "vehicle_id": vehicle.id,

        "zone_id": zone.id,

        "origin": {

            "latitude": start_lat,

            "longitude": start_lon,

        },

        "destination": {

            "latitude": destination_lat,

            "longitude": destination_lon,

        },

        "distance_km": round(

            distance_km,

            2,

        ),

        "average_speed_kmph": speed,

        "estimated_time_minutes": round(

            eta_minutes,

            2,

        ),

    }





# ============================================================

# DYNAMIC REALLOCATION

# ============================================================



class ReallocationRequest(BaseModel):

    source_zone_id: int

    destination_zone_id: int

    resource_type: str

    quantity: int





@app.post("/logistics/reallocate")

def reallocate_resources(

    request: ReallocationRequest,

    db: Session = Depends(get_db),

):



    if request.quantity <= 0:

        raise HTTPException(

            status_code=400,

            detail="Quantity must be greater than zero",

        )



    source_zone = db.query(Zone).filter(

        Zone.id == request.source_zone_id

    ).first()



    destination_zone = db.query(Zone).filter(

        Zone.id == request.destination_zone_id

    ).first()



    if not source_zone or not destination_zone:



        raise HTTPException(

            status_code=404,

            detail="Source or destination zone not found",

        )



    return {

        "status": "reallocation_planned",

        "source_zone_id": source_zone.id,

        "destination_zone_id": destination_zone.id,

        "resource_type": request.resource_type,

        "quantity": request.quantity,

    }





# ============================================================

# OR-TOOLS GENERAL OPTIMIZATION

# ============================================================



class OptimizationRequest(BaseModel):

    zone_ids: list[int]





@app.post("/logistics/optimize-multiple")

def optimize_multiple_zones(

    request: OptimizationRequest,

    db: Session = Depends(get_db),

):



    results = []



    for zone_id in request.zone_ids:



        zone = db.query(Zone).filter(

            Zone.id == zone_id

        ).first()



        if not zone:

            continue



        disaster = db.query(

            Disaster

        ).filter(

            Disaster.id == zone.disaster_id

        ).first()



        if not disaster:

            continue



        results.append({

            "zone_id": zone.id,

            "location": zone.location,

            "priority": calculate_zone_priority(

                zone

            ),

        })



    results.sort(

        key=lambda x: x["priority"]["priority_score"],

        reverse=True,

    )



    return {

        "zones": results,

        "count": len(results),

    }





# ============================================================

# USGS EARTHQUAKE FEED

# ============================================================



USGS_URL = (

    "https://earthquake.usgs.gov/"
    "earthquakes/feed/v1.0/summary/"
    "all_week.geojson"
)


@app.get("/external-feeds/earthquakes")
def get_earthquakes():

    try:

        response = requests.get(
            USGS_URL,
            timeout=20,
        )

        response.raise_for_status()

        data = response.json()

        earthquakes = []

        for feature in data.get(
            "features",
            [],
        ):

            properties = feature.get(
                "properties",
                {},
            )

            geometry = feature.get(
                "geometry",
                {},
            )

            coordinates = geometry.get(
                "coordinates",
                [None, None, None],
            )

            earthquakes.append({
                "usgs_id": feature.get("id"),
                "place": properties.get("place"),
                "magnitude": properties.get(
                    "mag"
                ),
                "time": properties.get(
                    "time"
                ),
                "longitude": coordinates[0],
                "latitude": coordinates[1],
                "depth": coordinates[2],
                "url": properties.get("url"),
            })

        return {
            "source": "USGS",
            "count": len(earthquakes),
            "earthquakes": earthquakes,
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"USGS feed error: {str(e)}",
        )


@app.post("/external-feeds/sync")
def sync_earthquakes(
    db: Session = Depends(get_db),
):

    try:

        response = requests.get(
            USGS_URL,
            timeout=20,
        )

        response.raise_for_status()

        data = response.json()

        added = 0
        skipped = 0

        existing_disasters = (
            db.query(Disaster)
            .all()
        )

        existing_descriptions = {
            d.description
            for d in existing_disasters
            if d.description
        }

        for feature in data.get(
            "features",
            [],
        ):

            properties = feature.get(
                "properties",
                {},
            )

            geometry = feature.get(
                "geometry",
                {},
            )

            coordinates = geometry.get(
                "coordinates",
                [None, None, None],
            )

            usgs_id = feature.get(
                "id"
            )

            description = (
                f"USGS_ID:{usgs_id} | "
                f"Magnitude:{properties.get('mag')} | "
                f"Depth:{coordinates[2]}"
            )

            if description in existing_descriptions:

                skipped += 1
                continue

            magnitude = safe_float(
                properties.get("mag")
            )

            if magnitude >= 6.5:
                severity = "High"

            elif magnitude >= 5.5:
                severity = "Medium"

            else:
                severity = "Low"

            disaster = Disaster(
                disaster_type="Earthquake",
                location=properties.get(
                    "place"
                )
                or "Unknown",
                latitude=coordinates[1],
                longitude=coordinates[0],
                severity=severity,
                description=description,
            )

            db.add(disaster)

            added += 1

        db.commit()

        return {
            "status": "success",
            "added": added,
            "skipped": skipped,
        }

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"USGS sync failed: {str(e)}",
        )


@app.get("/external-feeds/status")
def external_feed_status():

    return {
        "usgs": {
            "status": "available",
            "url": USGS_URL,
        }
    }


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "message": "AI-Based Disaster Response Management System API",
        "status": "running",
        "ml_model_loaded": model is not None,
        "model_features": len(model_features),
}


# ============================================================
# AUDIT LOG HELPER
# ============================================================

def log_action(
    db,
    action: str,
    entity_type: str = None,
    entity_id: int = None,
    detail: str = None,
    user=None,
):
    entry = AuditLog(
        user_id=int(user.get("sub", 0)) if user else None,
        user_name=user.get("name") or user.get("email") if user else None,
        user_role=user.get("role") if user else None,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        detail=detail,
    )
    db.add(entry)
    db.commit()


# ============================================================
# AUDIT LOG ENDPOINTS
# ============================================================

@app.get("/audit-logs")
def get_audit_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
):
    logs = (
        db.query(AuditLog)
        .order_by(AuditLog.id.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "user_name": log.user_name,
            "user_role": log.user_role,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "detail": log.detail,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
        }
        for log in logs
    ]


# ============================================================
# SOS SCHEMAS
# ============================================================

class SOSCreate(BaseModel):
    name: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    people_count: int = 1
    needs: Optional[str] = None
    description: Optional[str] = None
    contact: Optional[str] = None
    severity: str = "High"


class SOSStatusUpdate(BaseModel):
    status: str


# ============================================================
# SOS ENDPOINTS
# ============================================================

@app.post("/sos")
def create_sos(
    data: SOSCreate,
    db: Session = Depends(get_db),
):
    sos = SOSRequest(
        name=data.name,
        location=data.location,
        latitude=data.latitude,
        longitude=data.longitude,
        people_count=data.people_count,
        needs=data.needs,
        description=data.description,
        contact=data.contact,
        severity=data.severity,
        status="Pending",
    )
    db.add(sos)
    db.commit()
    db.refresh(sos)

    log_action(
        db,
        action=f"SOS Request submitted from {data.location}",
        entity_type="SOSRequest",
        entity_id=sos.id,
        detail=f"People: {data.people_count}, Needs: {data.needs}",
    )

    return {
        "id": sos.id,
        "name": sos.name,
        "location": sos.location,
        "latitude": sos.latitude,
        "longitude": sos.longitude,
        "people_count": sos.people_count,
        "needs": sos.needs,
        "description": sos.description,
        "contact": sos.contact,
        "severity": sos.severity,
        "status": sos.status,
        "timestamp": sos.timestamp.isoformat() if sos.timestamp else None,
    }


@app.get("/sos")
def get_sos_requests(
    db: Session = Depends(get_db),
):
    requests = (
        db.query(SOSRequest)
        .order_by(SOSRequest.id.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "name": r.name,
            "location": r.location,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "people_count": r.people_count,
            "needs": r.needs,
            "description": r.description,
            "contact": r.contact,
            "severity": r.severity,
            "status": r.status,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
        }
        for r in requests
    ]


@app.put("/sos/{sos_id}")
def update_sos_status(
    sos_id: int,
    data: SOSStatusUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sos = db.query(SOSRequest).filter(SOSRequest.id == sos_id).first()

    if not sos:
        raise HTTPException(status_code=404, detail="SOS request not found")

    sos.status = data.status
    db.commit()
    db.refresh(sos)

    log_action(
        db,
        action=f"SOS #{sos_id} status updated to {data.status}",
        entity_type="SOSRequest",
        entity_id=sos_id,
        user=current_user,
    )

    return {
        "id": sos.id,
        "status": sos.status,
        "name": sos.name,
        "location": sos.location,
    }


@app.delete("/sos/{sos_id}")
def delete_sos(
    sos_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sos = db.query(SOSRequest).filter(SOSRequest.id == sos_id).first()

    if not sos:
        raise HTTPException(status_code=404, detail="SOS request not found")

    db.delete(sos)
    db.commit()

    log_action(
        db,
        action=f"SOS #{sos_id} deleted",
        entity_type="SOSRequest",
        entity_id=sos_id,
        user=current_user,
    )

    return {"message": "SOS request deleted"}


# ============================================================
# RESOURCE SHORTAGE CHECK
# ============================================================

# ============================================================
# DASHBOARD STATS (single endpoint for all chart data)
# ============================================================

@app.get("/dashboard/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
):
    disasters = db.query(Disaster).all()
    resources = db.query(Resource).all()
    vehicles = db.query(Vehicle).all()
    missions = db.query(Mission).all()
    sos_list = db.query(SOSRequest).all()

    # Disaster severity breakdown
    severity_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for d in disasters:
        sev = str(d.severity or "").strip().title()
        if sev in severity_counts:
            severity_counts[sev] += 1

    # Disaster type breakdown
    type_counts = {}
    for d in disasters:
        dtype = str(d.disaster_type or "Unknown").strip()
        type_counts[dtype] = type_counts.get(dtype, 0) + 1

    # Resource inventory by type
    resource_by_type = {}
    for r in resources:
        rtype = str(r.resource_type or "Other").strip()
        resource_by_type[rtype] = resource_by_type.get(rtype, 0) + safe_int(r.quantity)

    # Vehicle status breakdown
    vehicle_status = {}
    for v in vehicles:
        vstatus = str(v.status or "Unknown").strip().title()
        vehicle_status[vstatus] = vehicle_status.get(vstatus, 0) + 1

    # Mission status breakdown
    mission_status = {}
    for m in missions:
        mstatus = str(m.status or "Unknown").strip().title()
        mission_status[mstatus] = mission_status.get(mstatus, 0) + 1

    # SOS breakdown
    sos_pending = sum(1 for s in sos_list if str(s.status or "").lower() == "pending")
    sos_acknowledged = sum(1 for s in sos_list if str(s.status or "").lower() == "acknowledged")
    sos_resolved = sum(1 for s in sos_list if str(s.status or "").lower() == "resolved")

    # Shortage alerts
    shortage_resources = [
        r for r in resources if safe_int(r.quantity) <= SHORTAGE_THRESHOLD
    ]

    return {
        "totals": {
            "disasters": len(disasters),
            "resources": len(resources),
            "vehicles": len(vehicles),
            "missions": len(missions),
            "sos_requests": len(sos_list),
            "sos_pending": sos_pending,
        },
        "disaster_severity": [
            {"label": k, "value": v}
            for k, v in severity_counts.items()
            if v > 0
        ],
        "disaster_types": [
            {"label": k, "value": v}
            for k, v in type_counts.items()
        ],
        "resource_inventory": [
            {"label": k, "value": v}
            for k, v in resource_by_type.items()
        ],
        "vehicle_status": [
            {"label": k, "value": v}
            for k, v in vehicle_status.items()
        ],
        "mission_status": [
            {"label": k, "value": v}
            for k, v in mission_status.items()
        ],
        "sos_summary": {
            "pending": sos_pending,
            "acknowledged": sos_acknowledged,
            "resolved": sos_resolved,
            "total": len(sos_list),
        },
        "shortage_count": len(shortage_resources),
    }
