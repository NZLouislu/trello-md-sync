# NPM Package Publishing Script
Write-Host "🚀 Starting npm package publishing process..." -ForegroundColor Green

# 1. Check Git status
Write-Host "`n1️⃣  Checking Git status..." -ForegroundColor Cyan
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "❌ Uncommitted changes detected. Please commit all changes first." -ForegroundColor Red
    git status
    exit 1
}
Write-Host "✅ Git status is clean" -ForegroundColor Green

# 2. Clean and build
Write-Host "`n2️⃣  Cleaning and building..." -ForegroundColor Cyan
npm run clean
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "✅ Build successful" -ForegroundColor Green

# 3. Run tests
Write-Host "`n3️⃣  Running test suite..." -ForegroundColor Cyan
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Tests failed. Please fix before publishing." -ForegroundColor Red
    exit $LASTEXITCODE
}
Write-Host "✅ Tests passed" -ForegroundColor Green

# 4. Code quality checks
Write-Host "`n4️⃣  Running code quality checks..." -ForegroundColor Cyan
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ TypeScript compilation check failed" -ForegroundColor Red
    exit $LASTEXITCODE
}

npm run lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Code formatting check failed" -ForegroundColor Red
    exit $LASTEXITCODE
}
Write-Host "✅ Code quality checks passed" -ForegroundColor Green

# 5. Preview package contents
Write-Host "`n5️⃣  Previewing package contents..." -ForegroundColor Cyan
npm pack --dry-run
Write-Host "✅ Package preview complete" -ForegroundColor Green

# 6. Confirm publishing
Write-Host "`n⚠️  Ready to publish to npm..." -ForegroundColor Yellow
$confirm = Read-Host "Confirm publishing? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "❌ Publishing cancelled" -ForegroundColor Red
    exit 0
}

# 7. Check npm login status
Write-Host "`n6️⃣  Checking npm login status..." -ForegroundColor Cyan
$npmUser = npm whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to npm. Please run: npm login" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Logged in as: $npmUser" -ForegroundColor Green

# 8. Publish to npm
Write-Host "`n7️⃣  Publishing to npm..." -ForegroundColor Cyan
npm publish
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Publishing failed" -ForegroundColor Red
    exit $LASTEXITCODE
}
Write-Host "✅ Publishing successful!" -ForegroundColor Green

# 9. Create Git tag
Write-Host "`n8️⃣  Creating Git tag..." -ForegroundColor Cyan
$version = (Get-Content package.json | ConvertFrom-Json).version
git tag -a "v$version" -m "Release version $version"
git push origin "v$version"
Write-Host "✅ Git tag created and pushed" -ForegroundColor Green

Write-Host "`n🎉 Publishing process complete!" -ForegroundColor Green
Write-Host "📦 Package URL: https://www.npmjs.com/package/trello-md-sync" -ForegroundColor Cyan
Write-Host "🏷️  Version: v$version" -ForegroundColor Cyan
