@echo off
REM This batch file installs several Fontsource font packages using npm.
REM Make sure you have Node.js and npm installed on your system.
REM Run this file in the root directory of your React project.

echo Installing Fontsource npm packages...

REM List of Fontsource packages to install
set "FONTS_TO_INSTALL=@fontsource/inter @fontsource/roboto @fontsource/open-sans @fontsource/lato @fontsource/montserrat @fontsource/source-sans-3 @fontsource/poppins"

REM Execute the npm install command
npm install %FONTS_TO_INSTALL%

REM Check if the installation was successful
if %errorlevel% equ 0 (
    echo Fontsource packages installed successfully!
) else (
    echo An error occurred during installation. Please check the output above.
)

echo Installation process finished.
pause
