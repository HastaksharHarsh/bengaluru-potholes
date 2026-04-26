@echo off
echo ===================================================
echo Setting up Bengaluru Road Watch...
echo ===================================================
echo.
echo [1/3] Installing root dependencies...
call npm install
echo.
echo [2/3] Installing backend Node.js dependencies...
cd backend
call npm install
cd ..
echo.
echo [3/3] Installing Python AI model dependencies...
cd backend\model
call pip install -r requirements.txt
cd ..\..
echo.
echo ===================================================
echo Setup complete! You can now run the app.
echo ===================================================
pause
