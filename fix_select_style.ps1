$file = 'src\pages\ServerControlPage.tsx'
$content = Get-Content $file -Raw -Encoding UTF8

# Fix 1: Replace dark cyber-* className on select elements with light-theme equivalents
# Select main element: bg-cyber-bg border-2 border-cyber-accent/40 ... text-cyber-text -> cyber-input
$content = $content -replace "className=""w-full px-4 py-3 bg-cyber-bg border-2 border-cyber-accent/40 rounded-lg text-cyber-text focus:border-cyber-accent focus:ring-2 focus:ring-cyber-accent/30 hover:border-cyber-accent/60 transition-all cursor-pointer""", `
  "className=""cyber-input w-full py-3 cursor-pointer font-medium"""

# Fix 2: Remove dark option inline styles (rgba(15, 23, 42, 0.98))
$pattern2 = '(?s)\s*style=\{\{\s*\r?\n\s*background: ''rgba\(15, 23, 42, 0\.98\)'',\s*\r?\n\s*padding: ''8px 12px''\s*\r?\n\s*\}\}'
$content = [regex]::Replace($content, $pattern2, '')

# Fix 3: option className: bg-cyber-bg text-cyber-muted -> plain (browser handles option styling)
$content = $content -replace ' className=""bg-cyber-bg text-cyber-muted""', ''
$content = $content -replace ' className=""bg-cyber-bg text-cyber-text py-2""', ''

# Fix 4: Fix server control action buttons - too transparent on white
# bg-cyber-grid/50 border border-cyber-accent/30 -> bg-slate-50 border border-slate-300 text-slate-700 
$content = $content -replace 'bg-cyber-grid/50 border border-cyber-accent/30 rounded-lg text-cyber-text hover:bg-cyber-accent/10', `
  'bg-slate-50 border border-slate-300 rounded-lg text-slate-700 hover:bg-sky-50 hover:border-sky-400 hover:text-sky-700'

# Fix 5: Fix colored buttons - /10 backgrounds are too light on white -> use /15 with solid text
$content = $content -replace 'bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 hover:bg-blue-500/20', `
  'bg-blue-50 border border-blue-300 rounded-lg text-blue-700 hover:bg-blue-100 hover:border-blue-400'
$content = $content -replace 'bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/20', `
  'bg-red-50 border border-red-300 rounded-lg text-red-700 hover:bg-red-100 hover:border-red-400'
$content = $content -replace 'bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-400 hover:bg-orange-500/20', `
  'bg-orange-50 border border-orange-300 rounded-lg text-orange-700 hover:bg-orange-100 hover:border-orange-400'
$content = $content -replace 'bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 hover:bg-yellow-500/20', `
  'bg-amber-50 border border-amber-300 rounded-lg text-amber-700 hover:bg-amber-100 hover:border-amber-400'
$content = $content -replace 'bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-400 hover:bg-purple-500/20', `
  'bg-violet-50 border border-violet-300 rounded-lg text-violet-700 hover:bg-violet-100 hover:border-violet-400'
$content = $content -replace 'bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 hover:bg-green-500/20', `
  'bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400'
$content = $content -replace 'bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 hover:bg-cyan-500/20', `
  'bg-cyan-50 border border-cyan-300 rounded-lg text-cyan-700 hover:bg-cyan-100 hover:border-cyan-400'

Set-Content $file $content -Encoding UTF8 -NoNewline
Write-Host "All select and button color fixes applied successfully."
