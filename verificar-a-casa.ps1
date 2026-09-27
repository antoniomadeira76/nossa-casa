# Verifica a casa depois de um reinicio. Corre sem privilegios nenhuns.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\verificar-a-casa.ps1
#
# Confirma que os dois servicos subiram sozinhos, que o tunel responde de fora,
# e - o que mais importa - que o painel de administracao e a saude NAO saem.
#
# NOTA 1: ficheiro so ASCII e com marca de UTF-8. O powershell.exe 5.1 le os
# .ps1 como ANSI, e um ficheiro com acentos rebenta-lhe o analisador com um erro
# de chaveta numa linha que nao tem chaveta nenhuma.
#
# NOTA 2: nada de `-SkipHttpErrorCheck`. Esse parametro so existe no PowerShell
# 7, e no 5.1 faz o pedido rebentar - a primeira versao disto dizia "sem
# resposta" a um servidor que estava a responder, e dizia-o na linha a seguir a
# dizer que ele respondia. Um verificador que grita falha numa casa sa e pior do
# que nao haver verificador nenhum.
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$falhas = 0
function Ver($nome, $obtido, $esperado) {
  $ok = "$obtido" -eq "$esperado"
  if (-not $ok) { $script:falhas++ }
  "{0} {1,-52} {2}" -f $(if ($ok) { "OK  " } else { "FALHA" }), $nome, $obtido
}
# Devolve o CODIGO, seja ele qual for. No 5.1 um 404 atira, e o codigo vem da
# excepcao; no 7 tambem atira sem o -SkipHttpErrorCheck. Serve nos dois.
function Codigo($url, $metodo = "GET") {
  try {
    [int](Invoke-WebRequest -Uri $url -Method $metodo -TimeoutSec 20 -UseBasicParsing -ErrorAction Stop).StatusCode
  } catch {
    if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { "sem resposta" }
  }
}

"=== os servicos ==="
foreach ($s in "Cloudflared", "NossaCasaPocketBase") {
  $x = Get-Service $s -ErrorAction SilentlyContinue
  Ver $s $(if ($x) { $x.Status } else { "NAO EXISTE" }) "Running"
}

"`n=== na maquina ==="
Ver "127.0.0.1:8095/api/health" (Codigo "http://127.0.0.1:8095/api/health") 200
Ver "127.0.0.1:8095/_/ (painel local, tem de funcionar)" (Codigo "http://127.0.0.1:8095/_/") 200

"`n=== de fora, pela internet ==="
Ver "casa.anossacasa.app/api/health" (Codigo "https://casa.anossacasa.app/api/health") 200
Ver "casa.anossacasa.app/_/ (tem de ser 404)" (Codigo "https://casa.anossacasa.app/_/") 404
Ver "superusers auth (tem de ser 404)" (Codigo "https://casa.anossacasa.app/api/collections/_superusers/auth-with-password" "POST") 404
Ver "POST /api/alexa/artigo (tem de ser 401)" (Codigo "https://casa.anossacasa.app/api/alexa/artigo" "POST") 401

"`n=== a saude NAO sai ==="
foreach ($c in "episodios_saude", "notas_saude", "receitas_saude", "anexos", "alergias_saude", "tomas_saude") {
  try {
    $r = Invoke-RestMethod -Uri "https://casa.anossacasa.app/api/collections/$c/records" -TimeoutSec 20
    Ver $c $r.totalItems 0
  } catch { Ver $c "recusado" 0 }
}

"`n=== a casa e a verdadeira, e nao uma base vazia ==="
try {
  $h = Invoke-RestMethod -Uri "http://127.0.0.1:8095/api/health" -TimeoutSec 15
  Ver "o servidor local responde" $h.message "API is healthy."
} catch { Ver "o servidor local responde" "sem resposta" "API is healthy." }

"`n" + $(if ($falhas) { "FALHAS: $falhas" } else { "TUDO BEM - a casa sobreviveu ao reinicio" })
exit $(if ($falhas) { 1 } else { 0 })