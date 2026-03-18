@echo off
echo ========================================
echo  TypeMotion AI - Full Stack Deploy
echo ========================================

REM Check if Docker is installed
where docker >nul 2>&1
IF ERRORLEVEL 1 (
    echo ERROR: Docker is not installed or not in PATH.
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

REM Build and start all services
echo.
echo [1/2] Building and starting all services with docker-compose...
docker compose up --build -d

IF ERRORLEVEL 1 (
    echo ERROR: docker compose failed. See above for details.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Deployment successful!
echo ----------------------------------------
echo  Frontend : http://localhost:3000
echo  Backend  : http://localhost:5000
echo ========================================
echo.
echo To view logs:   docker compose logs -f
echo To stop:        docker compose down
echo.
pause
