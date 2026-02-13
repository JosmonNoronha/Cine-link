#!/usr/bin/env pwsh
# Script to remove backend submodule and commit changes

Write-Host "=== Removing Backend Submodule ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will:" -ForegroundColor Yellow
Write-Host "  1. Remove backend submodule configuration" -ForegroundColor Yellow
Write-Host "  2. Backend/ folder will be ignored by git" -ForegroundColor Yellow
Write-Host "  3. Commit all changes to main repo" -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Continue? (y/n)"
if ($confirm -ne "y") {
    Write-Host "Cancelled" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "Step 1: Removing submodule..." -ForegroundColor Green

# Remove backend from git index
git rm -f backend 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Removed backend from git tracking" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Backend already removed or not tracked" -ForegroundColor Yellow
}

# Remove submodule config
if (Test-Path ".git/modules/backend") {
    Remove-Item -Recurse -Force ".git/modules/backend"
    Write-Host "  ✅ Removed .git/modules/backend" -ForegroundColor Green
}

# Remove .gitmodules file
if (Test-Path ".gitmodules") {
    git rm -f .gitmodules 2>&1 | Out-Null
    Write-Host "  ✅ Removed .gitmodules" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 2: Committing changes..." -ForegroundColor Green

# Stage all changes
git add .
git status --short

Write-Host ""
$commitMessage = Read-Host "Enter commit message (or press Enter for default)"
if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = "Remove backend submodule - backend deployed separately to Render"
}

git commit -m $commitMessage

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Changes committed" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Nothing to commit or commit failed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 3: Ready to push..." -ForegroundColor Green
Write-Host ""

$push = Read-Host "Push to origin/main? (y/n)"
if ($push -eq "y") {
    git push origin main
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Successfully pushed!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Push failed. Check your connection and try: git push origin main" -ForegroundColor Red
    }
} else {
    Write-Host ""
    Write-Host "⚠️  Changes committed locally but not pushed" -ForegroundColor Yellow
    Write-Host "   When ready, run: git push origin main" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Done! ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend is now gitignored and managed separately:" -ForegroundColor Green
Write-Host "  • Backend repo: https://github.com/JosmonNoronha/CineLink-backend-N" -ForegroundColor Gray
Write-Host "  • Backend deploys: Render" -ForegroundColor Gray
Write-Host "  • EAS builds will no longer include backend code" -ForegroundColor Gray
