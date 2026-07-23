@echo off
setlocal enabledelayedexpansion

rem ============================================================
rem   XiaoKe DaZiYuan - One-click deploy to api.maxnote.me
rem ============================================================

set SERVER=root@120.26.43.68
set REPO_DIR=%~dp0
set KEY_DIR=%USERPROFILE%\.ssh

echo ============================================================
echo   Deploy XiaoKe DaZiYuan to api.maxnote.me
echo   Server: %SERVER%
echo ============================================================
echo.

rem ---- Step 0: pack tarball if missing ----
if not exist "%REPO_DIR%yisheng.tar.gz" (
  echo [0/5] Packing code via git archive...
  cd /d "%REPO_DIR%"
  git archive --format=tar.gz -o yisheng.tar.gz HEAD
  if errorlevel 1 (
    echo [ERROR] git archive failed
    pause
    exit /b 1
  )
  echo       Pack done
) else (
  echo [0/5] yisheng.tar.gz already exists, skip
)
echo.

rem ---- Step 1: ensure SSH key ----
if not exist "%KEY_DIR%\id_rsa" (
  echo [1/5] Generating SSH key...
  if not exist "%KEY_DIR%" mkdir "%KEY_DIR%"
  ssh-keygen -t rsa -b 4096 -f "%KEY_DIR%\id_rsa" -N "" -q
  if errorlevel 1 (
    echo [ERROR] ssh-keygen failed
    pause
    exit /b 1
  )
) else (
  echo [1/5] SSH key exists
)
echo.

rem ---- Step 2: test passwordless ssh ----
echo [2/5] Checking passwordless SSH...
ssh -o BatchMode=yes -o ConnectTimeout=5 -o StrictHostKeyChecking=no %SERVER% "echo ok" >nul 2>&1
if errorlevel 1 (
  echo       Not configured. Uploading public key now.
  echo       YOU WILL BE ASKED FOR SERVER PASSWORD - this is the only time.
  echo.
  type "%KEY_DIR%\id_rsa.pub" | ssh -o StrictHostKeyChecking=no %SERVER% "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && sort -u ~/.ssh/authorized_keys -o ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
  if errorlevel 1 (
    echo [ERROR] Public key upload failed
    pause
    exit /b 1
  )
  ssh -o BatchMode=yes -o ConnectTimeout=5 %SERVER% "echo ok" >nul 2>&1
  if errorlevel 1 (
    echo [ERROR] Still cannot login passwordless after key upload
    pause
    exit /b 1
  )
  echo       Passwordless SSH configured
) else (
  echo       Passwordless SSH already works
)
echo.

rem ---- Step 3: upload files ----
echo [3/5] Uploading files...
scp -q -o StrictHostKeyChecking=no "%REPO_DIR%yisheng.tar.gz" %SERVER%:/srv/
if errorlevel 1 ( echo [ERROR] tarball upload failed & pause & exit /b 1 )
scp -q -o StrictHostKeyChecking=no "%REPO_DIR%deploy\.env.production" %SERVER%:/srv/.env.production
if errorlevel 1 ( echo [ERROR] env upload failed & pause & exit /b 1 )
scp -q -o StrictHostKeyChecking=no "%REPO_DIR%deploy\api.maxnote.me.conf" %SERVER%:/srv/api.maxnote.me.conf
if errorlevel 1 ( echo [ERROR] nginx conf upload failed & pause & exit /b 1 )
scp -q -o StrictHostKeyChecking=no "%REPO_DIR%deploy\remote-setup.sh" %SERVER%:/srv/remote-setup.sh
if errorlevel 1 ( echo [ERROR] remote script upload failed & pause & exit /b 1 )
echo       4 files uploaded
echo.

rem ---- Step 4: ask email ----
echo [4/5] Need your email for Let's Encrypt cert expiration reminders
set /p EMAIL="Type your email and press Enter: "
if "%EMAIL%"=="" (
  echo [ERROR] Email cannot be empty
  pause
  exit /b 1
)
echo.

rem ---- Step 5: run remote deploy ----
echo [5/5] Running remote deploy (5-10 minutes)...
echo       Pulling mysql image + building api image + signing cert
echo       DO NOT close this window
echo.
echo ============================================================
echo.
ssh -o StrictHostKeyChecking=no %SERVER% "bash /srv/remote-setup.sh %EMAIL%"
set EXITCODE=%errorlevel%
echo.

if %EXITCODE% neq 0 (
  echo ============================================================
  echo   [ERROR] Deploy failed. Screenshot the error above.
  echo ============================================================
  pause
  exit /b %EXITCODE%
)

echo ============================================================
echo   Deploy SUCCESS
echo ============================================================
echo.
echo Verify:
echo   curl https://api.maxnote.me/api/health
echo   Open https://api.maxnote.me/admin
echo   Login admin / ChangeMe123!
echo.
pause
