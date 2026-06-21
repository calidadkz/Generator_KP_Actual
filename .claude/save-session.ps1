$memDir = 'C:\Users\torew\.claude\projects\d--MyProjectCalidad-Generator-KP-Generator-KP-Actual\memory'
$repoDir = 'D:\MyProjectCalidad\Generator_KP\Generator_KP_Actual'

$date = Get-Date -Format 'yyyy-MM-dd HH:mm'
$commits = (git -C $repoDir log --oneline -5 2>$null) -join "`n"
$changed = (git -C $repoDir status --short 2>$null) -join "`n"

if (-not $commits) { $commits = '(нет коммитов)' }
if (-not $changed) { $changed = '(нет изменений)' }

$md = @"
# Последняя сессия (auto)

**Завершена:** $date

## Последние коммиты
``````
$commits
``````

## Изменённые файлы
``````
$changed
``````
"@

Set-Content -Path "$memDir\last_session_auto.md" -Value $md -Encoding UTF8
