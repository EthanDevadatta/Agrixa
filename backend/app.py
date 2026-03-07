from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import io
import time
from pathlib import Path
from typing import Any, Dict, Tuple, List, Optional

import httpx
from PIL import Image
import torch
from torch import nn
from torchvision import models, transforms

app = FastAPI()

# Allow calls from your React dev server (5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for dev, you can restrict later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Preprocessing
# ---------------------------------------------------------------------------

IMG_SIZE = 224
preprocess = transforms.Compose(
    [
        transforms.Resize((IMG_SIZE, IMG_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ]
)


def preprocess_image(img: Image.Image) -> torch.Tensor:
    """Resize and normalize image for ResNet models."""
    x = preprocess(img)
    return x.unsqueeze(0)  # shape: [1, 3, H, W]


# ---------------------------------------------------------------------------
# Disease metadata (labels + tips)
# ---------------------------------------------------------------------------

DISEASE_INFO: Dict[str, Dict[str, str]] = {
    # Keys MUST match entries in the *_CLASSES lists below
    "Rice/bacterial_leaf_blight": {
        "label_en": "Rice — Bacterial Leaf Blight",
        "label_hi": "धान — बैक्टीरियल लीफ ब्लाइट",
        "tip_en": "Use tolerant varieties if possible, avoid excessive nitrogen, and ensure good field drainage. Remove heavily infected leaves.",
        "tip_hi": "संभव हो तो सहनशील किस्में लगाएँ, अधिक नाइट्रोजन से बचें और खेत में पानी का निकास सही रखें। बहुत संक्रमित पत्तियाँ हटाएँ।",
    },
    "Rice/brown_spot": {
        "label_en": "Rice — Brown Spot",
        "label_hi": "धान — ब्राउन स्पॉट",
        "tip_en": "Maintain balanced fertilization (especially potassium), avoid plant stress, and remove infected debris. Consider fungicide only if severe.",
        "tip_hi": "संतुलित उर्वरक दें (खासकर पोटैशियम), पौधे को तनाव से बचाएँ और संक्रमित अवशेष हटाएँ। अधिक प्रकोप में ही फफूंदनाशक पर विचार करें।",
    },
    "Rice/healthy": {
        "label_en": "Rice — Healthy",
        "label_hi": "धान — स्वस्थ",
        "tip_en": "Looks healthy. Keep monitoring and maintain proper spacing, water management, and balanced nutrients.",
        "tip_hi": "पौधा स्वस्थ दिख रहा है। निगरानी जारी रखें और उचित दूरी, पानी प्रबंधन व संतुलित पोषण बनाए रखें।",
    },
    "Rice/leaf_blast": {
        "label_en": "Rice — Leaf Blast",
        "label_hi": "धान — लीफ ब्लास्ट",
        "tip_en": "Avoid excess nitrogen, maintain proper spacing, and use blast-tolerant varieties. If needed, apply recommended fungicide at early symptoms.",
        "tip_hi": "अधिक नाइट्रोजन से बचें, पौधों में उचित दूरी रखें और सहनशील किस्में अपनाएँ। जरूरत पर शुरुआती लक्षण में अनुशंसित फफूंदनाशक दें।",
    },
    "Rice/leaf_scald": {
        "label_en": "Rice — Leaf Scald",
        "label_hi": "धान — लीफ स्काल्ड",
        "tip_en": "Improve airflow (avoid overcrowding), remove infected leaves, and avoid overhead irrigation late in the day.",
        "tip_hi": "हवा का प्रवाह बढ़ाएँ (बहुत घनी बुवाई न करें), संक्रमित पत्तियाँ हटाएँ और देर शाम ऊपर से सिंचाई से बचें।",
    },
    "Rice/narrow_brown_spot": {
        "label_en": "Rice — Narrow Brown Spot",
        "label_hi": "धान — नैरो ब्राउन स्पॉट",
        "tip_en": "Use clean seed, balanced fertilization, and remove infected residues. Keep leaf wetness low (good drainage, avoid late watering).",
        "tip_hi": "स्वच्छ बीज का उपयोग करें, संतुलित पोषण दें और संक्रमित अवशेष हटाएँ। पत्तियों की नमी कम रखें (अच्छा निकास, देर से पानी न दें)।",
    },
    "SugarCane/Healthy": {
        "label_en": "Sugarcane — Healthy",
        "label_hi": "गन्ना — स्वस्थ",
        "tip_en": "Looks healthy. Keep monitoring and maintain weed control and proper irrigation.",
        "tip_hi": "पौधा स्वस्थ दिख रहा है। निगरानी जारी रखें और खरपतवार नियंत्रण व सही सिंचाई बनाए रखें।",
    },
    "SugarCane/Mosaic": {
        "label_en": "Sugarcane — Mosaic (viral)",
        "label_hi": "गन्ना — मोज़ेक (वायरल)",
        "tip_en": "Use disease-free seed cane and resistant varieties. Remove heavily infected clumps to reduce spread; manage aphids if present.",
        "tip_hi": "रोग-मुक्त बीज गन्ना और सहनशील किस्में अपनाएँ। फैलाव घटाने के लिए बहुत संक्रमित पौधे/गुच्छे हटाएँ; एफिड्स हों तो नियंत्रण करें।",
    },
    "SugarCane/RedRot": {
        "label_en": "Sugarcane — Red Rot",
        "label_hi": "गन्ना — रेड रॉट",
        "tip_en": "Use resistant varieties and healthy setts. Remove and destroy infected canes; avoid waterlogging and improve drainage.",
        "tip_hi": "सहनशील किस्में और स्वस्थ सेट्स लगाएँ। संक्रमित गन्ने हटाकर नष्ट करें; जलभराव से बचें और निकास सुधारें।",
    },
    "SugarCane/Rust": {
        "label_en": "Sugarcane — Rust",
        "label_hi": "गन्ना — रस्ट",
        "tip_en": "Improve airflow, avoid excess nitrogen, and remove heavily infected leaves. Use recommended fungicide if outbreak is severe.",
        "tip_hi": "हवा का प्रवाह बढ़ाएँ, अधिक नाइट्रोजन से बचें और बहुत संक्रमित पत्तियाँ हटाएँ। अधिक प्रकोप में अनुशंसित फफूंदनाशक दें।",
    },
    "SugarCane/Yellow": {
        "label_en": "Sugarcane — Yellowing (possible nutrient/stress issue)",
        "label_hi": "गन्ना — पीलापन (पोषक/तनाव की संभावना)",
        "tip_en": "Check irrigation and soil nutrients (especially nitrogen, iron). Ensure good drainage and consider soil testing for accurate correction.",
        "tip_hi": "सिंचाई और मिट्टी के पोषक तत्व (खासकर नाइट्रोजन, आयरन) जाँचें। निकास ठीक रखें और सही सुधार के लिए मिट्टी परीक्षण कराएँ।",
    },
    "Wheat/Healthy": {
        "label_en": "Wheat — Healthy",
        "label_hi": "गेहूं — स्वस्थ",
        "tip_en": "Looks healthy. Keep monitoring and maintain balanced fertilizer and timely irrigation.",
        "tip_hi": "पौधा स्वस्थ दिख रहा है। निगरानी जारी रखें और संतुलित खाद व समय पर सिंचाई करें।",
    },
    "Wheat/septoria": {
        "label_en": "Wheat — Septoria Leaf Blotch",
        "label_hi": "गेहूं — सेप्टोरिया लीफ ब्लॉच",
        "tip_en": "Avoid overhead irrigation, improve airflow, and rotate crops. If needed, apply recommended fungicide at early disease stage.",
        "tip_hi": "ऊपर से सिंचाई से बचें, हवा का प्रवाह बढ़ाएँ और फसल चक्र अपनाएँ। जरूरत पर शुरुआती अवस्था में अनुशंसित फफूंदनाशक दें।",
    },
    "Wheat/stripe_rust": {
        "label_en": "Wheat — Stripe Rust (Yellow Rust)",
        "label_hi": "गेहूं — स्ट्राइप रस्ट (पीला रस्ट)",
        "tip_en": "Use rust-resistant varieties and avoid excess nitrogen. If symptoms spread fast, use recommended fungicide promptly.",
        "tip_hi": "रस्ट-रोधी किस्में अपनाएँ और अधिक नाइट्रोजन से बचें। लक्षण तेजी से फैलें तो तुरंत अनुशंसित फफूंदनाशक दें।",
    },
}


def format_label(raw_label: str) -> Tuple[str, str, str, str]:
    info = DISEASE_INFO.get(raw_label)
    if info:
        return info["label_en"], info["label_hi"], info["tip_en"], info["tip_hi"]

    # default formatting if you haven’t filled DISEASE_INFO yet
    label_en = raw_label.replace("_", " ")
    label_hi = raw_label.replace("_", " ")
    tip_en = "Consider consulting an agronomist or extension officer for exact treatment."
    tip_hi = "सटीक उपचार के लिए कृषि विशेषज्ञ/कृषि विस्तार अधिकारी से सलाह लें।"
    return label_en, label_hi, tip_en, tip_hi


# ---------------------------------------------------------------------------
# Per‑crop PyTorch models
# ---------------------------------------------------------------------------

BACKEND_DIR = Path(__file__).parent

RICE_MODEL_PATH = BACKEND_DIR / "rice_model.pth"
WHEAT_MODEL_PATH = BACKEND_DIR / "wheat_model.pth"
SUGARCANE_MODEL_PATH = BACKEND_DIR / "sugarcane_model.pth"

RICE_CLASSES: List[str] = [
    "Rice/bacterial_leaf_blight",
    "Rice/brown_spot",
    "Rice/healthy",
    "Rice/leaf_blast",
    "Rice/leaf_scald",
    "Rice/narrow_brown_spot",
]

WHEAT_CLASSES: List[str] = [
    "Wheat/Healthy",
    "Wheat/septoria",
    "Wheat/stripe_rust",
]

SUGARCANE_CLASSES: List[str] = [
    "SugarCane/Healthy",
    "SugarCane/Mosaic",
    "SugarCane/RedRot",
    "SugarCane/Rust",
    "SugarCane/Yellow",
]


def _build_resnet(num_classes: int) -> torch.nn.Module:
    model = models.resnet18(weights=None)
    in_features = model.fc.in_features  # type: ignore[attr-defined]
    model.fc = nn.Linear(in_features, num_classes)  # type: ignore[attr-defined]
    model.eval()
    return model


def _load_torch_model(path: Path, classes: List[str]) -> Optional[torch.nn.Module]:
    """
    Load a PyTorch model from the given path.

    Supports:
    - checkpoint dicts with key "model_state_dict" or "state_dict"
    - full models saved with torch.save(model)
    """
    if not path.exists() or not path.is_file():
        return None

    checkpoint = torch.load(path, map_location="cpu")

    if isinstance(checkpoint, dict):
        if "model_state_dict" in checkpoint:
            model = _build_resnet(len(classes))
            model.load_state_dict(checkpoint["model_state_dict"])
            model.eval()
            return model
        if "state_dict" in checkpoint:
            model = _build_resnet(len(classes))
            model.load_state_dict(checkpoint["state_dict"])
            model.eval()
            return model

    # Fallback: assume the checkpoint itself is a ready-to-use model
    if isinstance(checkpoint, torch.nn.Module):
        checkpoint.eval()
        return checkpoint

    # Unknown format
    return None


rice_model: Optional[torch.nn.Module] = _load_torch_model(RICE_MODEL_PATH, RICE_CLASSES)
wheat_model: Optional[torch.nn.Module] = _load_torch_model(WHEAT_MODEL_PATH, WHEAT_CLASSES)
sugarcane_model: Optional[torch.nn.Module] = _load_torch_model(
    SUGARCANE_MODEL_PATH, SUGARCANE_CLASSES
)


# ---------------------------------------------------------------------------
# Weather helpers (Open-Meteo, with simple caching)
# ---------------------------------------------------------------------------

WEATHER_CACHE: Dict[str, Tuple[float, Dict[str, Any]]] = {}
WEATHER_TTL_SECONDS = 10 * 60  # 10 minutes


async def get_coordinates(location_name: str) -> Optional[Tuple[float, float, str]]:
    """Geocode a location name to (lat, lon, resolved_name) using Open-Meteo."""
    query = location_name.strip()
    if not query:
        return None

    url = "https://geocoding-api.open-meteo.com/v1/search"
    params = {"name": query, "count": 1, "language": "en", "format": "json"}

    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(url, params=params)

    if resp.status_code != 200:
        return None

    data = resp.json()
    results = data.get("results") or []
    if not results:
        return None

    first = results[0]
    lat = float(first.get("latitude"))
    lon = float(first.get("longitude"))
    name = str(first.get("name") or query)
    return lat, lon, name


async def get_weather(lat: float, lon: float) -> Optional[Dict[str, Any]]:
    """Fetch weather details from Open-Meteo for given coordinates."""
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "weather_code,wind_speed_10m",
        "hourly": "precipitation",
        "timezone": "auto",
    }

    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(url, params=params)

    if resp.status_code != 200:
        return None

    data = resp.json()
    current = data.get("current") or {}
    hourly = data.get("hourly") or {}

    weather_code = current.get("weather_code")
    wind_speed = current.get("wind_speed_10m")

    precipitation = None
    times = hourly.get("time") or []
    precips = hourly.get("precipitation") or []
    if isinstance(times, list) and isinstance(precips, list) and times and precips:
        target_time = current.get("time") or times[0]
        try:
            idx = times.index(target_time)
        except ValueError:
            idx = 0
        try:
            precipitation = float(precips[idx])
        except (TypeError, ValueError, IndexError):
            precipitation = None

    return {
        "weather_code": weather_code,
        "wind_speed": wind_speed,
        "precipitation": precipitation,
    }


def _predict_with_model(
    model: Optional[torch.nn.Module],
    classes: List[str],
    x: torch.Tensor,
) -> Optional[Tuple[str, float]]:
    if model is None or not classes:
        return None

    with torch.no_grad():
        logits = model(x)  # [1, num_classes]
        probs = torch.softmax(logits, dim=1)[0]
        conf, idx = torch.max(probs, dim=0)

    idx_int = int(idx.item())
    if idx_int >= len(classes):
        return None
    return classes[idx_int], float(conf.item())


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/")
def root():
    return {"message": "Agri-Assist API", "status": "ok", "docs": "/docs", "predict": "POST /predict"}


@app.get("/health")
def health():
    """Minimal health check - no dependencies."""
    return {"status": "ok"}


def cast_json(d: Dict[str, Any]) -> Dict[str, Any]:
    # FastAPI/JSON encoding helper (keeps types simple)
    return d


@app.get("/api/weather")
async def api_weather(location: str):
    """Return cleaned weather info for a given city/village name."""
    key = location.strip().lower()
    now = time.time()

    # Cache lookup
    if key in WEATHER_CACHE:
        ts, payload = WEATHER_CACHE[key]
        if now - ts < WEATHER_TTL_SECONDS:
            return cast_json(payload)

    coords = await get_coordinates(location)
    if coords is None:
        return cast_json({"error": "Location not found. Try a nearby town or city name."})

    lat, lon, resolved_name = coords
    data = await get_weather(lat, lon)
    if data is None:
        return cast_json({"error": "Could not fetch weather data right now. Please try again later."})

    payload = {
        "location": resolved_name,
        "latitude": lat,
        "longitude": lon,
        "weather_code": data.get("weather_code"),
        "wind_speed": data.get("wind_speed"),
        "precipitation": data.get("precipitation"),
    }

    WEATHER_CACHE[key] = (now, payload)
    return cast_json(payload)


@app.post("/predict")
async def predict(image: UploadFile = File(...), crop: Optional[str] = None):
    # Read image bytes
    bytes_data = await image.read()
    img = Image.open(io.BytesIO(bytes_data)).convert("RGB")
    x = preprocess_image(img)

    crop_clean = (crop or "").strip().lower()

    # Decide which models to run
    candidates: List[Tuple[str, Optional[torch.nn.Module], List[str]]] = []
    if crop_clean == "rice":
        candidates.append(("Rice", rice_model, RICE_CLASSES))
    elif crop_clean == "wheat":
        candidates.append(("Wheat", wheat_model, WHEAT_CLASSES))
    elif crop_clean in ("sugarcane", "sugar_cane", "sugar cane"):
        candidates.append(("SugarCane", sugarcane_model, SUGARCANE_CLASSES))
    else:
        # 'auto' mode – try all available models
        candidates.extend(
            [
                ("Rice", rice_model, RICE_CLASSES),
                ("Wheat", wheat_model, WHEAT_CLASSES),
                ("SugarCane", sugarcane_model, SUGARCANE_CLASSES),
            ]
        )

    best_label: Optional[str] = None
    best_conf: float = -1.0

    for _, m, classes in candidates:
        pred = _predict_with_model(m, classes, x)
        if pred is None:
            continue
        label, conf = pred
        if conf > best_conf:
            best_conf = conf
            best_label = label

    if best_label is None:
        missing: List[str] = []
        if rice_model is None:
            missing.append(RICE_MODEL_PATH.name)
        if wheat_model is None:
            missing.append(WHEAT_MODEL_PATH.name)
        if sugarcane_model is None:
            missing.append(SUGARCANE_MODEL_PATH.name)

        return cast_json(
            {
                "error": "No disease models are available on the server.",
                "missing_models": missing,
            }
        )

    raw_label = best_label
    conf = best_conf
    label_en, label_hi, tip_en, tip_hi = format_label(raw_label)

    return cast_json(
        {
            "raw_label": raw_label,
            "confidence": float(conf),
            "label_en": label_en,
            "label_hi": label_hi,
            "tip_en": tip_en,
            "tip_hi": tip_hi,
        }
    )

