# ==============================================================================
# 作者 startgo (startgo@yia.app)
# 授權預設 GPLv3
# 日期時間: 2026-10-06 18:09:00 (UTC+8)
# 版本: v1.7.0
# 描述: Webcom AI 自動化 GitHub 推送管道 (支援非快轉衝突解決與強制覆寫)
# ==============================================================================

[CmdletBinding()]
param (
    [string]$TargetBranch = "AI_DEV",
    [string]$RemoteName   = "origin",
    [string]$RepoUrl      = "https://github.com/ystartgo/Webcom_AI.git",
    [string]$GitUser      = "ystartgo",
    [string]$GitEmail     = "startgo@yia.app",
    [switch]$ForcePush    = $false
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

    # 1. 檢測與掛載 Git
    $LocalGitCandidates = @(
        (Join-Path $ScriptDir "PortableGit\cmd\git.exe"),
        (Join-Path $ScriptDir ".git_portable\cmd\git.exe"),
        (Join-Path $ScriptDir "git\cmd\git.exe")
    )

    $SelectedGit = $null
    foreach ($Path in $LocalGitCandidates) {
        if (Test-Path $Path) {
            $SelectedGit = $Path
            $GitBinDir = Split-Path -Parent $SelectedGit
            $env:PATH = "$GitBinDir;$env:PATH"
            break
        }
    }

    if (-not $SelectedGit) {
        $GlobalGit = Get-Command git -ErrorAction SilentlyContinue
        if ($GlobalGit) { $SelectedGit = $GlobalGit.Source }
    }

    if (-not $SelectedGit) {
        throw "未找到可用的 Git 執行環境。"
    }
    Write-Host "[✔] 使用 Git 實體: $SelectedGit" -ForegroundColor Green

    # 2. 身份校驗
    git config --local user.name "$GitUser"
    git config --local user.email "$GitEmail"
    Write-Host "[✔] 簽章鎖定: $GitUser <$GitEmail>" -ForegroundColor Green

    # 3. 檢查當前分支
    $CurrentBranch = (git branch --show-current) 2>$null
    if ([string]::IsNullOrWhiteSpace($CurrentBranch)) {
        $CurrentBranch = $TargetBranch
        git checkout -B $TargetBranch > $null 2>&1
    }

    # 4. 偵測異動並 Commit
    $Status = (git status --porcelain) 2>$null
    if (-not [string]::IsNullOrWhiteSpace($Status)) {
        Write-Host "[*] 提交本地變更..." -ForegroundColor Yellow
        git add -A
        git commit -m "chore: auto sync via pipeline [$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')]"
    }

    # 5. 執行初次推送
    Write-Host "[*] 正在推送 $CurrentBranch 至 $RemoteName/$TargetBranch..." -ForegroundColor Yellow
    $PushOutput = git push -u $RemoteName "${CurrentBranch}:${TargetBranch}" 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[✔] 推送成功完成！" -ForegroundColor Green
        Write-Host "👉 專案遠端位址: https://github.com/ystartgo/Webcom_AI/tree/$TargetBranch" -ForegroundColor Green
    } else {
        # 判斷是否為遠端分支非快轉衝突 (non-fast-forward / rejected)
        $OutputStr = $PushOutput | Out-String
        Write-Host $OutputStr -ForegroundColor DarkGray

        if ($OutputStr -match "fetch first" -or $OutputStr -match "rejected") {
            Write-Host ""
            Write-Host "[!] 偵測到遠端 $TargetBranch 分支已有先前的歷史記錄。" -ForegroundColor Yellow
            
            $Choice = ""
            if (-not $ForcePush) {
                Write-Host "請選擇衝突處理解決策略：" -ForegroundColor Cyan
                Write-Host "  [F] 強制覆寫 (Force Push) - 以當前本地版本為準，覆蓋遠端（推薦全新部署）"
                Write-Host "  [M] 嘗試拉取合併 (Pull --allow-unrelated-histories) - 保留遠端並嘗試合併"
                Write-Host "  [C] 放棄取消"
                $Choice = Read-Host "請輸入選項 (F/M/C) [預設 F]"
                if ([string]::IsNullOrWhiteSpace($Choice)) { $Choice = "F" }
            } else {
                $Choice = "F"
            }

            if ($Choice -eq "F" -or $Choice -eq "f") {
                Write-Host "[*] 正在執行強制推送 (git push -f)..." -ForegroundColor Yellow
                git push -u $RemoteName "${CurrentBranch}:${TargetBranch}" --force
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "[✔] 強制覆寫推送成功！" -ForegroundColor Green
                    Write-Host "👉 專案遠端位址: https://github.com/ystartgo/Webcom_AI/tree/$TargetBranch" -ForegroundColor Green
                } else {
                    throw "強制推送失敗，請檢查 GitHub 寫入權限或 Protected Branch 設定。"
                }
            } elseif ($Choice -eq "M" -or $Choice -eq "m") {
                Write-Host "[*] 正在從遠端拉取並嘗試合併歷史..." -ForegroundColor Yellow
                git pull $RemoteName $TargetBranch --allow-unrelated-histories --no-rebase
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "[*] 合併完成，重新推送至遠端..." -ForegroundColor Yellow
                    git push -u $RemoteName "${CurrentBranch}:${TargetBranch}"
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "[✔] 合併後推送成功！" -ForegroundColor Green
                    } else {
                        throw "合併後推送失敗。"
                    }
                } else {
                    throw "自動合併遭遇衝突，請手動解決衝突後再推送。"
                }
            } else {
                Write-Host "[*] 操作已由使用者取消。" -ForegroundColor Gray
            }
        } else {
            throw "推送失敗，請檢查網路連線或 GitHub 憑證。"
        }
    }

} catch {
    Write-Host ""
    Write-Host "[Critical Exception] $($_.Exception.Message)" -ForegroundColor Red
} finally {
    Write-Host ""
    Write-Host "請按任意鍵退出..." -ForegroundColor DarkGray
    $null = [Console]::ReadKey($true)
}
