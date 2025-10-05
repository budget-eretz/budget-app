@echo off
REM Script to initialize development environment for Windows
REM This script runs migrations and seeds the database

echo.
echo Starting Budget App Development Environment...
echo.

REM Wait for database to be ready
echo Waiting for database...
timeout /t 5 /nobreak >nul

REM Run migrations
echo Running database migrations...
docker-compose exec backend npm run migrate

REM Seed database
echo Seeding database with sample data...
docker-compose exec backend npm run seed

echo.
echo Development environment initialized!
echo.
echo Sample login credentials:
echo    Circle Treasurer: treasurer@circle.com / password123
echo    Group Treasurer:  treasurer@north.com / password123
echo    Member:           member1@circle.com / password123
echo.
echo Access the application at:
echo    Frontend: http://localhost:3456
echo    Backend:  http://localhost:4567
echo.
pause
