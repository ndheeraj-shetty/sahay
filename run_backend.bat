@echo off
echo Starting SAHAY FastAPI Backend...
cd /d "%~dp0"
call .venv\Scripts\activate.bat
set PYTHONPATH=%~dp0backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
