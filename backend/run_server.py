"""
Run the Agri-Assist backend on 127.0.0.1:8000 (more reliable on Windows).
Usage: python run_server.py
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="127.0.0.1",
        port=8000,
        reload=False,  # Disable reload for stability on Windows
    )
