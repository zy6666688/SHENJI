@echo off
chcp 65001 >nul
echo ====================================
echo Git推送到GitHub（使用代理）
echo ====================================
echo.

echo 💡 提示：如果您使用VPN或代理，请按以下步骤操作
echo.

echo 📝 请输入您的代理地址（例如：http://127.0.0.1:7890）
echo    如果没有代理，请直接按回车跳过
set /p PROXY_URL="代理地址: "

if "%PROXY_URL%"=="" (
    echo.
    echo ⚠️ 未配置代理，直接推送...
    echo.
) else (
    echo.
    echo ✅ 配置Git代理: %PROXY_URL%
    git config --global http.proxy %PROXY_URL%
    git config --global https.proxy %PROXY_URL%
    echo.
)

echo 🚀 开始推送到GitHub...
echo.

git push origin master

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ====================================
    echo ✅ 推送成功！
    echo ====================================
    echo.
    echo 🎉 您的代码已成功推送到GitHub
    echo 📝 仓库地址: https://github.com/zy6666688/SHENJI
    echo.
    echo 现在团队成员可以通过以下命令克隆项目：
    echo git clone https://github.com/zy6666688/SHENJI.git
    echo.
    
    if not "%PROXY_URL%"=="" (
        echo.
        echo 📌 是否要取消Git代理配置？（y/n）
        set /p UNSET_PROXY="请选择: "
        if /i "%UNSET_PROXY%"=="y" (
            git config --global --unset http.proxy
            git config --global --unset https.proxy
            echo ✅ 已取消代理配置
        )
    )
) else (
    echo.
    echo ====================================
    echo ❌ 推送失败！
    echo ====================================
    echo.
    echo 🔍 可能的原因：
    echo 1. 网络连接问题（无法访问GitHub）
    echo 2. 代理配置不正确
    echo 3. GitHub权限问题
    echo.
    echo 💡 解决建议：
    echo 1. 检查网络连接
    echo 2. 尝试使用VPN或更换网络
    echo 3. 检查GitHub账号权限
    echo 4. 查看详细错误信息
    echo.
    echo 📖 详细说明请查看：Git推送结果报告.md
    echo.
)

echo.
pause
