@echo off
title Star Music - Servidor
echo ==========================================
echo      INICIANDO O S.T.A.R...
echo ==========================================
echo.
echo 1. Abrindo o navegador...
start http://127.0.0.1:5000

echo 2. Ligando o servidor Python...
echo    (Nao feche esta janela preta!)
echo.
python app.py
pause