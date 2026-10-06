# ==============================================================================
# 作者 startgo (startgo@yia.app)
# 授權預設 GPLv3
# 日期時間: 2026-10-06 18:07:00 (UTC+8)
# 版本: v1.6.0
# 描述: Webcom AI 自動化 GitHub 推送管道 (原生 Zip 解壓與環境掛載)
# ==============================================================================

[CmdletBinding()]
param (
    [string]$TargetBranch = "AI_DEV",
    [string]$RemoteName   = "origin",
    [string]$RepoUrl      = "https://github.com/ystartgo/Webcom_AI.git",
    [string]$GitUser      = "ystartgo",
    [string]$GitEmail     = "startgo@yia.app",
    [string]$PortableZipUrl = "https://github.com/git-for-windows/git/releases/download/v2.44.0.windows.1/MinGit-2.44.0-64-bit.zip"
)

try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $OutputEncoding = [System.Text.Encoding]::UTF8

    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "  Webcom AI - GitHub Push & Identity Sync Pipeline" -ForegroundColor Cyan
    Write-Host "  目標儲存庫: $RepoUrl" -ForegroundColor Cyan
    Write-Host "  目標遠端分支: $TargetBranch" -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host ""

    $ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Definition }
    if ($ScriptDir) { 
        Set-Location -Path $ScriptDir 
    }

    # -------------------------------------------------------------------------
    # 1. 檢查專案目錄內部與系統環境的 Git 執行檔
    # -------------------------------------------------------------------------
    Write-Host "[*] 正在檢測 Git 執行環境..." -ForegroundColor Gray
    $LocalGitCandidates = @(
        (Join-Path $ScriptDir ".git_portable\cmd\git.exe"),
        (Join-Path $ScriptDir ".git_portable\bin\git.exe"),
        (Join-Path $ScriptDir "PortableGit\cmd\git.exe"),
        (Join-Path $ScriptDir "git\cmd\git.exe"),
        (Join-Path $ScriptDir "bin\git.exe")
    )

    $SelectedGit = $null
    foreach ($Path in $LocalGitCandidates) {
        if (Test-Path $Path) {
            $SelectedGit = $Path
            Write-Host "[✔] 偵測到專案目錄內建 Git: $SelectedGit" -ForegroundColor Green
            $GitBinDir = Split-Path -Parent $SelectedGit
            $env:PATH = "$GitBinDir;$env:PATH"
            break
        }
    }

    if (-not $SelectedGit) {
        $GlobalGit = Get-Command git -ErrorAction SilentlyContinue
        if ($GlobalGit) {
            $SelectedGit = $GlobalGit.Source
            Write-Host "[✔] 偵測到系統全域 Git: $SelectedGit" -ForegroundColor Green
        }
    }

    # 若專案內與系統皆無 Git，下載 MinGit (官方純 Zip 封裝，體積極小且原生支援解壓)
    if (-not $SelectedGit) {
        Write-Host "[*] 專案內部與系統皆未偵測到 Git，啟動 MinGit 自動下載..." -ForegroundColor Yellow
        $PortableDir = Join-Path $ScriptDir ".git_portable"
        $ZipPath = Join-Path $ScriptDir "mingit.zip"

        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13

        if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
        if (Test-Path $PortableDir) { Remove-Item $PortableDir -Recurse -Force }

        Write-Host "[*] 下載來源: $PortableZipUrl" -ForegroundColor Gray
        Write-Host "[*] 正在下載套件 (約 30~40 MB，請稍候)..." -ForegroundColor Yellow

        $wc = New-Object System.Net.WebClient
        $wc.Headers.Add("User-Agent", "Mozilla/5.0")
        $wc.DownloadFile($PortableZipUrl, $ZipPath)

        if (-not (Test-Path $ZipPath) -or ((Get-Item $ZipPath).Length -lt 10000000)) {
            Remove-Item $ZipPath -Force -ErrorAction SilentlyContinue
            throw "MinGit 壓縮包下載失敗或檔案損毀。"
        }

        Write-Host "[✔] 下載完成。正在使用 Windows 原生解壓縮引擎解壓..." -ForegroundColor Green
        Expand-Archive -Path $ZipPath -DestinationPath $PortableDir -Force
        Remove-Item -Path $ZipPath -Force -ErrorAction SilentlyContinue

        # MinGit 的 git.exe 位於 cmd\git.exe
        $ResolvedCmd = Join-Path $PortableDir "cmd"
        $ResolvedGitExe = Join-Path $ResolvedCmd "git.exe"

        if (-not (Test-Path $ResolvedGitExe)) {
            throw "解壓縮完成後未找到可執行檔: $ResolvedGitExe"
        }

        $env:PATH = "$ResolvedCmd;$env:PATH"
        Write-Host "[✔] MinGit 已成功配置並掛載至執行環境。" -ForegroundColor Green
    }

    # -------------------------------------------------------------------------
    # 2. 檢查專案是否為 Git 儲存庫 (檢測 .git 資料夾)，若無則自動初始化
    # -------------------------------------------------------------------------
    $GitMetaDir = Join-Path $ScriptDir ".git"
    if (-not (Test-Path $GitMetaDir)) {
        Write-Host "[*] 專案目錄尚未初始化為 Git 儲存庫，正在執行初始化..." -ForegroundColor Yellow
        git init -b $TargetBranch
        if ($LASTEXITCODE -ne 0) {
            git init
            git checkout -b $TargetBranch
        }
        Write-Host "[✔] 專案 Git 儲存庫初始化完成。" -ForegroundColor Green
    } else {
        Write-Host "[✔] 已確認專案為有效的 Git 儲存庫。" -ForegroundColor Green
    }

    # -------------------------------------------------------------------------
    # 3. 身份校驗與配置 (Local Repo 層級)
    # -------------------------------------------------------------------------
    $CurrentName  = (git config --local user.name) 2>$null
    $CurrentEmail = (git config --local user.email) 2>$null

    if ($CurrentName -ne $GitUser -or $CurrentEmail -ne $GitEmail) {
        Write-Host "[*] 更新本地簽章配置..." -ForegroundColor Yellow
        git config --local user.name "$GitUser"
        git config --local user.email "$GitEmail"
        Write-Host "[✔] 簽章配置完成 -> Name: $GitUser | Email: $GitEmail" -ForegroundColor Green
    } else {
        Write-Host "[✔] Git 身份核驗通過: $GitUser <$GitEmail>" -ForegroundColor Green
    }

    # -------------------------------------------------------------------------
    # 4. 取得或校準當前工作分支
    # -------------------------------------------------------------------------
    $CurrentBranch = (git branch --show-current) 2>$null
    if ([string]::IsNullOrWhiteSpace($CurrentBranch)) {
        git checkout -B $TargetBranch > $null 2>&1
        $CurrentBranch = $TargetBranch
    }
    Write-Host "[*] 當前本地工作分支: $CurrentBranch" -ForegroundColor Yellow

    # -------------------------------------------------------------------------
    # 5. Remote 端點校驗與動態重設
    # -------------------------------------------------------------------------
    $ExistingRemote = (git remote get-url $RemoteName 2>$null)
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($ExistingRemote)) {
        Write-Host "[*] 正在新增遠端庫關聯: $RemoteName -> $RepoUrl" -ForegroundColor Gray
        git remote add $RemoteName $RepoUrl
    } elseif ($ExistingRemote.Trim() -ne $RepoUrl) {
        Write-Host "[*] 修正遠端庫 URL: $RemoteName -> $RepoUrl" -ForegroundColor Gray
        git remote set-url $RemoteName $RepoUrl
    } else {
        Write-Host "[✔] 遠端庫已正確關聯: $RemoteName" -ForegroundColor Green
    }

    # -------------------------------------------------------------------------
    # 6. 自動暫存與提交未存檔變更
    # -------------------------------------------------------------------------
    $Status = (git status --porcelain) 2>$null
    if (-not [string]::IsNullOrWhiteSpace($Status)) {
        Write-Host "[*] 偵測到未提交的檔案異動，自動加入索引並 Commit..." -ForegroundColor Yellow
        git add -A
        git commit -m "chore: auto sync via pipeline [$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')]"
    }

    # -------------------------------------------------------------------------
    # 7. 執行推送管線
    # -------------------------------------------------------------------------
    Write-Host "[*] 正在推送 $CurrentBranch 至 $RemoteName/$TargetBranch..." -ForegroundColor Yellow
    git push -u $RemoteName "${CurrentBranch}:${TargetBranch}"

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[✔] 推送成功完成！" -ForegroundColor Green
        Write-Host "👉 專案遠端位址: https://github.com/ystartgo/Webcom_AI/tree/$TargetBranch" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "[!] 推送遭遇錯誤。請確認 GitHub 認證權限或遠端分支狀態。" -ForegroundColor Red
    }

} catch {
    Write-Host ""
    Write-Host "[Critical Exception] $($_.Exception.Message)" -ForegroundColor Red
} finally {
    Write-Host ""
    Write-Host "請按任意鍵退出..." -ForegroundColor DarkGray
    $null = [Console]::ReadKey($true)
}
