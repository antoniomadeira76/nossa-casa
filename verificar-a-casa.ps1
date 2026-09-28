# Verifica a casa depois de um reinicio. Corre sem privilegios nenhuns.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\verificar-a-casa.ps1
#
# Confirma que os tres servicos subiram sozinhos, que o tunel responde de fora,
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
foreach ($s in "Cloudflared", "NossaCasaPocketBase", "NossaCasaAlexa") {
  $x = Get-Service $s -ErrorAction SilentlyContinue
  Ver $s $(if ($x) { $x.Status } else { "NAO EXISTE" }) "Running"
}

"`n=== na maquina ==="
Ver "127.0.0.1:8095/api/health" (Codigo "http://127.0.0.1:8095/api/health") 200
Ver "127.0.0.1:8095/_/ (painel local, tem de funcionar)" (Codigo "http://127.0.0.1:8095/_/") 200
Ver "127.0.0.1:8094/saude (o endpoint da skill)" (Codigo "http://127.0.0.1:8094/saude") 200

# !! O TUNEL CONFERE-SE AQUI, e nao la fora.
#
# Em 28/09/2026 a rede da empresa comecou a interceptar o TLS e a devolver uma
# pagina de bloqueio do FortiGuard ("Newly Registered Domain"). Tudo o que esta
# maquina pedisse ao endereco publico passava a falhar - e este verificador
# dizia "sem resposta" a cinco linhas seguidas, o que se le como "o tunel caiu".
# Nao tinha caido: o cloudflared tinha quatro ligacoes ao bordo da Cloudflare.
#
# A metrica local do cloudflared responde na maquina e nao atravessa filtro
# nenhum. E a unica medicao honesta do tunel a partir daqui.
"`n=== o tunel, medido na maquina (sem atravessar a rede) ==="
$ligacoes = 0
try {
  $m = Invoke-RestMethod -Uri "http://127.0.0.1:20241/ready" -TimeoutSec 10
  $ligacoes = [int]$m.readyConnections
} catch { }
Ver "cloudflared com ligacoes ao bordo ($ligacoes)" ($ligacoes -gt 0) "True"

# Ha filtro de rede pelo meio? Distingue-se pelo erro de CONFIANCA no
# certificado - uma casa em baixo da erro de ligacao, nao de certificado.
$filtro = $false
try {
  Invoke-WebRequest -Uri "https://casa.anossacasa.app/api/health" -TimeoutSec 20 -UseBasicParsing -ErrorAction Stop | Out-Null
} catch {
  $m = "$($_.Exception.Message) $($_.Exception.InnerException.Message)"
  if ($m -match "SSL|TLS|trust|certificate|certificado|secure channel") { $filtro = $true }
}

if ($filtro) {
  "`n=== de fora, pela internet: NAO MEDIDO ==="
  "     A rede desta maquina esta a interceptar o TLS de casa.anossacasa.app."
  "     Nao e o tunel nem a casa: o cloudflared tem $ligacoes ligacao(oes) ao bordo."
  "     Para ver a pagina do filtro:  curl -k https://casa.anossacasa.app/api/health"
  "     Para medir a serio, correr isto de fora da rede da empresa."
  if ($ligacoes -le 0) { "     (mas o tunel TAMBEM esta em baixo - ver a linha acima)" }
} else {

"`n=== de fora, pela internet ==="
Ver "casa.anossacasa.app/api/health" (Codigo "https://casa.anossacasa.app/api/health") 200
Ver "casa.anossacasa.app/_/ (tem de ser 404)" (Codigo "https://casa.anossacasa.app/_/") 404
Ver "superusers auth (tem de ser 404)" (Codigo "https://casa.anossacasa.app/api/collections/_superusers/auth-with-password" "POST") 404
Ver "POST /api/alexa/artigo (tem de ser 401)" (Codigo "https://casa.anossacasa.app/api/alexa/artigo" "POST") 401

# O endpoint da skill nao e o PocketBase - e o servico Node na 8094. Estas duas
# linhas provam as DUAS coisas de uma vez: que a regra do tunel manda para la
# (um 404 aqui seria a regra em falta, e um 401 seria o PocketBase a atender),
# e que ele recusa um pedido sem assinatura. Os codigos sao dele e de mais
# ninguem: 400 "faltam os cabecalhos da assinatura", 405 "so POST".
Ver "POST /alexa/skill sem assinatura (tem de ser 400)" (Codigo "https://casa.anossacasa.app/alexa/skill" "POST") 400
Ver "GET /alexa/skill (tem de ser 405)" (Codigo "https://casa.anossacasa.app/alexa/skill") 405

"`n=== a saude NAO sai ==="
foreach ($c in "episodios_saude", "notas_saude", "receitas_saude", "anexos", "alergias_saude", "tomas_saude") {
  try {
    $r = Invoke-RestMethod -Uri "https://casa.anossacasa.app/api/collections/$c/records" -TimeoutSec 20
    Ver $c $r.totalItems 0
  } catch { Ver $c "recusado" 0 }
}

}   # fim do bloco que so corre quando NAO ha filtro de rede pelo meio

"`n=== a casa e a verdadeira, e nao uma base vazia ==="
try {
  $h = Invoke-RestMethod -Uri "http://127.0.0.1:8095/api/health" -TimeoutSec 15
  Ver "o servidor local responde" $h.message "API is healthy."
} catch { Ver "o servidor local responde" "sem resposta" "API is healthy." }

# A linha acima NAO prova que a base e a certa - so que ha um servidor. Um
# PocketBase acabado de nascer noutra pasta responde exactamente o mesmo, e foi
# esse o risco real: o NSSM comeu as aspas dos argumentos e os caminhos desta
# casa tem um espaco ("Nossa Casa"). Estas duas confirmam a PASTA e o FICHEIRO.
$raiz = "C:\Users\amadeira\Claude\Projects\Nossa Casa"
try {
  $ap = (Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Services\NossaCasaPocketBase\Parameters").AppParameters
  Ver "o servico aponta ao pb_data desta casa" $($ap -match [regex]::Escape("--dir `"$raiz\pb_data`"")) "True"
} catch { Ver "o servico aponta ao pb_data desta casa" "nao li o registo" "True" }

# O mesmo risco, no servico da skill: sem as aspas, o NSSM parte o caminho no
# espaco de "Nossa Casa" e o node arranca com um ficheiro que nao existe.
try {
  $aa = (Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Services\NossaCasaAlexa\Parameters").AppParameters
  Ver "o servico da skill aponta ao guiao desta casa" $($aa -eq "`"$raiz\alexa\servidor-da-skill.mjs`"") "True"
} catch { Ver "o servico da skill aponta ao guiao desta casa" "nao li o registo" "True" }

$db = "$raiz\pb_data\data.db"
if (Test-Path $db) {
  $kb = [int]((Get-Item $db).Length / 1024)
  # Uma base vazia do PocketBase anda pelos 300 KB; esta casa tem dados.
  Ver "pb_data\data.db existe e tem a casa dentro ($kb KB)" $($kb -gt 500) "True"
} else { Ver "pb_data\data.db existe" "NAO EXISTE" "True" }

"`n" + $(if ($falhas) { "FALHAS: $falhas" } else { "TUDO BEM - a casa sobreviveu ao reinicio" })
exit $(if ($falhas) { 1 } else { 0 })