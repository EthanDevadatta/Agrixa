# Agro Assist backend (Plant disease API)

Serves disease prediction (Rice/Wheat/SugarCane) and weather API.

## Install

```powershell
cd E:\mdp\agri-assist\backend
python -m pip install -r requirements.txt
```

## Run the API

**Option A – Recommended (Windows-friendly):**
```powershell
cd E:\mdp\agri-assist\backend
python run_server.py
```

**Option B – Uvicorn directly:**
```powershell
cd E:\mdp\agri-assist\backend
python -m uvicorn app:app --host 127.0.0.1 --port 8000
```

Then open in browser: **http://127.0.0.1:8000** or **http://localhost:8000**

- `GET /` – API info  
- `GET /health` – Health check  
- `GET /docs` – Swagger UI  
- `GET /api/weather?location=Kanchipuram` – Weather  
- `POST /predict` – Disease prediction (form-data: `image`, optional `crop`)

