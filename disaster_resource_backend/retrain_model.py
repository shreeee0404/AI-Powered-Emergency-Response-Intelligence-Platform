"""
Retrain the resource demand model using the current sklearn version.
Run: python retrain_model.py
"""
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.multioutput import MultiOutputRegressor

# ── Feature list (must match what main.py expects) ──────────────────────────
FEATURES = [
    "latitude", "longitude",
    "magnitude", "depth",
    "population", "population_density",
    "children_pct", "elderly_pct", "medically_dependent_pct", "disability_pct",
    "vulnerability_score",
    "housing_risk_score",
    "building_count", "building_density_km2",
    "builtup_pct", "water_pct", "forest_pct", "agriculture_pct",
    "infrastructure_score",
    "impact_score",
    "building_damage_pct", "road_damage_pct", "utility_damage_pct",
    "road_density", "road_connectivity", "highway_distance",
    "accessibility_score", "major_road_access_score",
    "road_blockage_probability",
    "logistics_accessibility_score",
    "nearest_depot_distance_km", "nearest_hospital_distance_km",
    "nearest_evacuation_center_distance_km",
    "estimated_travel_time_minutes",
    "hospital_count", "health_center_count", "shelter_center_count",
    "critical_facility_count", "relief_warehouse_count", "water_facility_count",
    "food_packets_available", "water_litres_available",
    "medical_kits_available", "shelter_capacity",
    "rescue_vehicles_available", "personnel_available",
    "depot_operational_score",
    "event_duration_hours",
    "severity_score",
    "affected_area_km2",
    "flood_extent_km2", "flood_depth_m", "flood_velocity_ms", "flood_severity",
    "fire_detection_count", "fire_frp_sum", "fire_frp_max",
    "earthquake_count",
    "dris_hazard", "dris_exposure", "dris_vulnerability",
    "dris_infrastructure", "dris_weather", "dris_score",
    "year", "month", "day",
    # one-hot disaster types
    "disaster_type_flood", "disaster_type_earthquake", "disaster_type_wildfire",
    "disaster_type_cyclone", "disaster_type_landslide", "disaster_type_drought",
    # one-hot disaster subtypes
    "disaster_subtype_flash flood", "disaster_subtype_riverine flood",
    "disaster_subtype_coastal flood",
    "disaster_subtype_ground shaking", "disaster_subtype_tsunami",
    "disaster_subtype_forest fire", "disaster_subtype_urban fire",
    "disaster_subtype_tropical storm", "disaster_subtype_extratropical storm",
]

N = 2000
rng = np.random.default_rng(42)

# ── Synthetic training data ──────────────────────────────────────────────────
X = pd.DataFrame(index=range(N), columns=FEATURES, dtype=float)

X["latitude"]              = rng.uniform(-90, 90, N)
X["longitude"]             = rng.uniform(-180, 180, N)
X["magnitude"]             = rng.uniform(0, 9, N)
X["depth"]                 = rng.uniform(0, 100, N)
X["population"]            = rng.integers(1000, 500000, N).astype(float)
X["population_density"]    = X["population"] / rng.uniform(5, 50, N)
X["children_pct"]          = rng.uniform(5, 30, N)
X["elderly_pct"]           = rng.uniform(3, 20, N)
X["medically_dependent_pct"] = rng.uniform(1, 10, N)
X["disability_pct"]        = rng.uniform(1, 8, N)
X["vulnerability_score"]   = rng.uniform(0, 1, N)
X["housing_risk_score"]    = rng.uniform(0, 10, N)
X["building_count"]        = (X["population"] / 4).astype(float)
X["building_density_km2"]  = rng.uniform(100, 2000, N)
X["builtup_pct"]           = rng.uniform(10, 90, N)
X["water_pct"]             = rng.uniform(0, 20, N)
X["forest_pct"]            = rng.uniform(0, 30, N)
X["agriculture_pct"]       = rng.uniform(0, 40, N)
X["infrastructure_score"]  = rng.uniform(0, 10, N)
X["impact_score"]          = rng.uniform(0, 10, N)
X["building_damage_pct"]   = rng.uniform(0, 100, N)
X["road_damage_pct"]       = rng.uniform(0, 100, N)
X["utility_damage_pct"]    = rng.uniform(0, 100, N)
X["road_density"]          = rng.uniform(1, 20, N)
X["road_connectivity"]     = rng.uniform(0, 1, N)
X["highway_distance"]      = rng.uniform(0, 50, N)
X["accessibility_score"]   = rng.uniform(0, 10, N)
X["major_road_access_score"] = rng.uniform(0, 10, N)
X["road_blockage_probability"] = rng.uniform(0, 1, N)
X["logistics_accessibility_score"] = rng.uniform(0, 10, N)
X["nearest_depot_distance_km"] = rng.uniform(1, 100, N)
X["nearest_hospital_distance_km"] = rng.uniform(1, 50, N)
X["nearest_evacuation_center_distance_km"] = rng.uniform(1, 50, N)
X["estimated_travel_time_minutes"] = rng.uniform(10, 180, N)
X["hospital_count"]        = rng.integers(0, 10, N).astype(float)
X["health_center_count"]   = rng.integers(0, 15, N).astype(float)
X["shelter_center_count"]  = rng.integers(0, 10, N).astype(float)
X["critical_facility_count"] = rng.integers(0, 20, N).astype(float)
X["relief_warehouse_count"] = rng.integers(0, 5, N).astype(float)
X["water_facility_count"]  = rng.integers(0, 8, N).astype(float)
X["food_packets_available"] = rng.integers(0, 10000, N).astype(float)
X["water_litres_available"] = rng.integers(0, 50000, N).astype(float)
X["medical_kits_available"] = rng.integers(0, 5000, N).astype(float)
X["shelter_capacity"]      = rng.integers(0, 20000, N).astype(float)
X["rescue_vehicles_available"] = rng.integers(0, 30, N).astype(float)
X["personnel_available"]   = rng.integers(0, 500, N).astype(float)
X["depot_operational_score"] = rng.uniform(0, 1, N)
X["event_duration_hours"]  = rng.uniform(1, 168, N)
X["severity_score"]        = rng.uniform(0, 10, N)
X["affected_area_km2"]     = rng.uniform(1, 5000, N)
X["flood_extent_km2"]      = rng.uniform(0, 500, N)
X["flood_depth_m"]         = rng.uniform(0, 5, N)
X["flood_velocity_ms"]     = rng.uniform(0, 5, N)
X["flood_severity"]        = rng.uniform(0, 10, N)
X["fire_detection_count"]  = rng.uniform(0, 10, N)
X["fire_frp_sum"]          = rng.uniform(0, 500, N)
X["fire_frp_max"]          = rng.uniform(0, 200, N)
X["earthquake_count"]      = rng.uniform(0, 5, N)
X["dris_hazard"]           = rng.uniform(0, 1, N)
X["dris_exposure"]         = rng.uniform(0, 1, N)
X["dris_vulnerability"]    = rng.uniform(0, 1, N)
X["dris_infrastructure"]   = rng.uniform(0, 1, N)
X["dris_weather"]          = rng.uniform(0, 1, N)
X["dris_score"]            = rng.uniform(0, 100, N)
X["year"]                  = rng.integers(2015, 2025, N).astype(float)
X["month"]                 = rng.integers(1, 13, N).astype(float)
X["day"]                   = rng.integers(1, 29, N).astype(float)

# one-hot columns — zero by default, then assign one per row
for col in FEATURES:
    if col.startswith("disaster_type_") or col.startswith("disaster_subtype_"):
        X[col] = 0.0

disaster_types = [c for c in FEATURES if c.startswith("disaster_type_")]
disaster_subtypes = [c for c in FEATURES if c.startswith("disaster_subtype_")]
for i in range(N):
    X.loc[i, rng.choice(disaster_types)] = 1.0
    X.loc[i, rng.choice(disaster_subtypes)] = 1.0

X = X.fillna(0.0).astype(float)

# ── Synthetic targets (realistic demand formulas) ────────────────────────────
pop   = X["population"].values
sev   = X["severity_score"].values
vuln  = X["vulnerability_score"].values

food_demand    = np.clip(pop * 0.3 * (sev / 10) * (1 + vuln * 0.3) + rng.normal(0, 50, N), 0, None)
water_demand   = np.clip(pop * 2.0 * (sev / 10) * (1 + vuln * 0.3) + rng.normal(0, 200, N), 0, None)
medical_demand = np.clip(pop * 0.05 * (sev / 10) * (1 + vuln * 0.5) + rng.normal(0, 10, N), 0, None)
shelter_demand = np.clip(pop * 0.1 * (sev / 10) * (1 + vuln * 0.2) + rng.normal(0, 20, N), 0, None)

y = np.column_stack([food_demand, water_demand, medical_demand, shelter_demand])

# ── Train ────────────────────────────────────────────────────────────────────
print("Training model...")
base = GradientBoostingRegressor(n_estimators=100, max_depth=4, random_state=42)
model = MultiOutputRegressor(base)
model.fit(X, y)
print("Training complete.")

# ── Save ─────────────────────────────────────────────────────────────────────
joblib.dump(model, "final_resource_demand_model.pkl")
joblib.dump(FEATURES, "model_features.pkl")
print("Saved: final_resource_demand_model.pkl")
print("Saved: model_features.pkl")
print(f"Features: {len(FEATURES)}")

# ── Quick sanity check ───────────────────────────────────────────────────────
pred = model.predict(X[:1])
print(f"Sample prediction: food={pred[0][0]:.0f}, water={pred[0][1]:.0f}, "
      f"medical={pred[0][2]:.0f}, shelter={pred[0][3]:.0f}")
