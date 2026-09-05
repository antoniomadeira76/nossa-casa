# Devolve a casa ao que era antes da simulação.
#
#   powershell -File db\pocketbase\repor-antes-da-simulacao.ps1
#
# ⚠ Repõe a cópia INTEIRA do `pb_data`, e é de propósito: apagar «o que eu
# criei» depende de eu me lembrar de tudo o que criei, e a lista cresce a cada
# coleção nova. Uma cópia do ficheiro não se esquece de nada.
#
# O que volta ao que estava: os membros, as tarefas, as despesas, os cofres, as
# compras, os equipamentos, as fichas de saúde, a agenda e o registo. E também
# a sessão da Google e as credenciais da agenda, que vivem na mesma base.
$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $raiz

$copia = Join-Path $raiz 'pb_data.antes-da-simulacao'
if (-not (Test-Path $copia)) {
  Write-Output "Não há cópia em $copia. Nada a repor."
  exit 1
}

Write-Output 'A parar o servidor...'
Get-Process pocketbase -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3

$alvo = Join-Path $raiz 'db\pocketbase\pb_data'
if (-not (Test-Path $alvo)) { $alvo = Join-Path $raiz 'pb_data' }
Write-Output "A repor em $alvo..."
Remove-Item $alvo -Recurse -Force
Copy-Item $copia $alvo -Recurse

Write-Output 'A arrancar o servidor...'
Start-Process -FilePath 'pocketbase' `
  -ArgumentList 'serve','--http=127.0.0.1:8095','--migrationsDir','db/pocketbase/pb_migrations','--hooksDir','db/pocketbase/pb_hooks' `
  -WorkingDirectory $raiz -WindowStyle Hidden

# ⚠ Esperar que RESPONDA, e não dormir um número de segundos à sorte. A app
# aberta ao lado perde a sessão se perguntar enquanto ele ainda não responde.
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 2
  try {
    Invoke-WebRequest -Uri 'http://127.0.0.1:8095/api/health' -UseBasicParsing -TimeoutSec 3 | Out-Null
    Write-Output 'Reposto. O servidor responde.'
    Write-Output 'Recarregue a app no navegador.'
    exit 0
  } catch { }
}
Write-Output 'ATENÇÃO: o servidor não respondeu a tempo. Arranque-o à mão:'
Write-Output '  npm run db:servir'
exit 1
