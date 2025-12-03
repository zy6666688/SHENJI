@echo off
chcp 65001 >nul
echo ====================================
echo 快速推送到GitHub（使用代理）
echo ====================================
echo.

REM ============================================
REM 请修改这里的代理地址为您实际的代理
REM ============================================
SET PROXY_URL=http://127.0.0.1:7890

echo 📝 使用代理: %PROXY_URL%
echo.

echo ⚙️ 配置Git代理...
git config --global http.proxy %PROXY_URL%
git config --global https.proxy %PROXY_URL%
echo ✅ 代理配置完成
echo.

echo 🚀 开始推送到GitHub...
echo.
git push origin master

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ====================================
    echo ✅ 推送成功！
    echo ====================================
    echo.
    echo 🎉 代码已成功推送到GitHub！
    echo 📝 https://github.com/zy6666688/SHENJI
    echo.
    echo 团队现在可以克隆：
    echo git clone https://github.com/zy6666688/SHENJI.git
    echo.
) else (
    echo.
    echo ====================================
    echo ❌ 推送失败
    echo ====================================
    echo.
    echo 请检查：
    echo 1. 代理地址是否正确（当前: %PROXY_URL%）
    echo 2. 代理软件是否已启动
    echo 3. 代理是否能访问GitHub
    echo.
)

echo.
echo 🔧 清理代理配置...
git config --global --unset http.proxy
git config --global --unset https.proxy
echo ✅ 已清理代理配置
echo.

pause
