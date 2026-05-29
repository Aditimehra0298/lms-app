$ErrorActionPreference = "Continue"
$root = "d:\Download\lms-app-main\lms-app-main"
$log = Join-Path $root "git-commit-log.txt"
Set-Location $root
@"
=== STATUS ===
"@ | Set-Content $log
git status 2>&1 | Add-Content $log
@"`n=== DIFF STAT ===`n"@ | Add-Content $log
git diff --stat 2>&1 | Add-Content $log
git add components/admin/AdminTutorLedWorkspace.tsx components/MyLearningLiveHub.tsx components/TutorLedLearnerDashboard.tsx components/TutorLedZoomJoinCard.tsx lib/tutor-led-routes.ts 2>&1 | Add-Content $log
git commit -m "Route tutor-led Zoom joins through LMS and improve admin workspace" -m "Learners join live via the program hub Zoom card instead of direct zoom.us links. Admin tutor-led panel adds search, filters, launch checklist, section navigation, and sticky save bar." 2>&1 | Add-Content $log
git push origin main 2>&1 | Add-Content $log
@"`n=== FINAL STATUS ===`n"@ | Add-Content $log
git status 2>&1 | Add-Content $log
