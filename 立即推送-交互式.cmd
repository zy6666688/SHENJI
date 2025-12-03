@echo off
chcp 65001 >nul
echo ====================================
echo GitHub推送助手
echo ====================================
echo.

echo 🔍 检测网络状态...
ping github.com -n 1 -w 1000 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ 可以访问GitHub，直接推送...
    echo.
    goto :push_direct
) else (
    echo ❌ 无法访问GitHub
    echo.
)

echo 💡 您需要使用代理吗？
echo.
echo 选项：
echo 1. 使用代理推送（需要VPN或代理）
echo 2. 直接推送（跳过代理）
echo 3. 退出
echo.

set /p CHOICE="请选择 (1/2/3): "

if "%CHOICE%"=="1" goto :use_proxy
if "%CHOICE%"=="2" goto :push_direct
if "%CHOICE%"=="3" goto :end

:use_proxy
echo.
echo 📝 请输入代理地址
echo 常见格式：
echo   - http://127.0.0.1:7890
echo   - http://127.0.0.1:10809
echo   - socks5://127.0.0.1:1080
echo.
set /p PROXY="代理地址: "

if "%PROXY%"=="" (
    echo ❌ 代理地址不能为空！
    pause
    goto :end
)

echo.
echo ⚙️ 配置Git代理: %PROXY%
git config --global http.proxy %PROXY%
git config --global https.proxy %PROXY%
echo ✅ 代理配置完成
echo.

:push_direct
echo 🚀 开始推送到GitHub...
echo.
git push origin master

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ====================================
    echo ✅ 推送成功！
    echo ====================================
    echo.
    echo 🎉 您的代码已成功推送到GitHub！
    echo.
    echo 📝 仓库地址: https://github.com/zy6666688/SHENJI
    echo.
    echo 团队成员现在可以通过以下命令获取代码：
    echo git clone https://github.com/zy6666688/SHENJI.git
    echo.
    
    if not "%PROXY%"=="" (
        echo.
        echo 📌 是否要取消Git代理配置？
        echo （推荐：如果只是临时使用代理，建议取消）
        echo.
        set /p UNSET="取消代理配置？(y/n): "
        if /i "%UNSET%"=="y" (
            git config --global --unset http.proxy
            git config --global --unset https.proxy
            echo ✅ 已取消代理配置
        )
    )
) else (
    echo.
    echo ====================================
    echo ❌ 推送失败
    echo ====================================
    echo.
    echo 🔍 可能的原因：
    if not "%PROXY%"=="" (
        echo   1. 代理地址不正确
        echo   2. 代理未启动
        echo   3. 代理无法访问GitHub
    ) else (
        echo   1. 网络无法访问GitHub
        echo   2. 需要使用VPN或代理
        echo   3. GitHub服务暂时不可用
    )
    echo.
    echo 💡 建议：
    echo   1. 检查代理设置
    echo   2. 尝试切换网络（如手机热点）
    echo   3. 联系网络管理员
    echo   4. 稍后重试
    echo.
    
    if not "%PROXY%"=="" (
        echo 📌 取消代理配置...
        git config --global --unset http.proxy
        git config --global --unset https.proxy
        echo ✅ 已取消代理配置
        echo.
    )
)

:end
echo.
pause
