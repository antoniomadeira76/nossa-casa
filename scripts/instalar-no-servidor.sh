#!/usr/bin/env bash
#
# Prepara uma VPS Linux para receber a casa. NÃO copia dados e NÃO arranca nada:
# deixa a máquina pronta e pára. A cópia e o arranque são passos do
# `docs/mudar-de-maquina.md`, feitos com a casa antiga já parada.
#
#   ssh root@<a-maquina>
#   bash instalar-no-servidor.sh
#
# ⚠ Porque é que não arranca no fim: o túnel só corre num sítio de cada vez com
# as mesmas credenciais. Um script que arrancasse tudo derrubava a casa antiga
# no meio de uma instalação, antes de haver dados do lado novo.
set -euo pipefail

VERSAO_PB="0.40.1"
UTILIZADOR="casa"
RAIZ="/opt/nossa-casa"
PORTA="8095"

diz() { printf '\n\033[1m%s\033[0m\n' "$*"; }
erro() { printf '\n\033[31mFALHOU: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || erro "corre isto como root"

# ── Quem corre a casa ────────────────────────────────────────────────────────
#
# ⚠ Um utilizador de sistema, sem shell e sem palavra-passe. O PocketBase não
# precisa de privilégios nenhuns: escuta em 127.0.0.1 numa porta alta e escreve
# numa pasta sua. Correr isto como root seria dar à casa toda a máquina por um
# defeito que ainda não conhecemos.
diz "1. O utilizador"
if id "$UTILIZADOR" >/dev/null 2>&1; then
  echo "   já existe"
else
  adduser --system --group --home "$RAIZ" --shell /usr/sbin/nologin "$UTILIZADOR"
  echo "   criado"
fi

diz "2. As pastas"
install -d -o "$UTILIZADOR" -g "$UTILIZADOR" -m 750 "$RAIZ"
install -d -o "$UTILIZADOR" -g "$UTILIZADOR" -m 750 "$RAIZ/pb_data"
install -d -o "$UTILIZADOR" -g "$UTILIZADOR" -m 750 "$RAIZ/db/pocketbase"
install -d -o "$UTILIZADOR" -g "$UTILIZADOR" -m 700 "$RAIZ/.cloudflared"
echo "   $RAIZ, com 750 — ninguém de fora do grupo lê a casa"

# ── O binário ────────────────────────────────────────────────────────────────
#
# ⚠ A versão é FIXA, e não «a última». A casa tem 38 ficheiros de provas
# escritos contra o comportamento do 0.40.1, e os hooks usam APIs do JSVM dessa
# versão — o `getProviderConfig`, o `initProvider`, o `$os.getenv`. Subir de
# versão é uma decisão com provas a correr, não um efeito secundário de instalar.
diz "3. O PocketBase $VERSAO_PB"
if [ -x "$RAIZ/pocketbase" ] && "$RAIZ/pocketbase" --version 2>/dev/null | grep -q "$VERSAO_PB"; then
  echo "   já lá está, na versão certa"
else
  arq="$(uname -m)"
  case "$arq" in
    x86_64)  alvo="linux_amd64" ;;
    aarch64) alvo="linux_arm64" ;;
    *) erro "arquitectura não prevista: $arq" ;;
  esac
  url="https://github.com/pocketbase/pocketbase/releases/download/v${VERSAO_PB}/pocketbase_${VERSAO_PB}_${alvo}.zip"
  echo "   $url"
  tmp="$(mktemp -d)"
  curl -fsSL "$url" -o "$tmp/pb.zip" || erro "não consegui descarregar"
  command -v unzip >/dev/null || { apt-get update -qq && apt-get install -y -qq unzip; }
  unzip -q -o "$tmp/pb.zip" -d "$tmp"
  install -o "$UTILIZADOR" -g "$UTILIZADOR" -m 755 "$tmp/pocketbase" "$RAIZ/pocketbase"
  rm -rf "$tmp"
  "$RAIZ/pocketbase" --version
fi

# ── O serviço ────────────────────────────────────────────────────────────────
#
# ⚠ Escuta em 127.0.0.1, e não em 0.0.0.0. A porta para a internet é o túnel da
# Cloudflare, que já traz as regras que tapam o painel `/_/` e os
# superutilizadores — e assim a VPS não tem porta nenhuma aberta. Uma VPS leva
# varrimentos de portas desde o primeiro minuto de vida.
diz "4. O serviço do systemd"
cat > /etc/systemd/system/nossa-casa.service <<UNIDADE
[Unit]
Description=Nossa Casa - PocketBase
Documentation=file://$RAIZ/docs/mudar-de-maquina.md
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$UTILIZADOR
Group=$UTILIZADOR
WorkingDirectory=$RAIZ
Environment=CASA_URL_PUBLICA=https://casa.anossacasa.app
ExecStart=$RAIZ/pocketbase serve \\
  --http=127.0.0.1:$PORTA \\
  --dir=$RAIZ/pb_data \\
  --migrationsDir=$RAIZ/db/pocketbase/pb_migrations \\
  --hooksDir=$RAIZ/db/pocketbase/pb_hooks
Restart=always
RestartSec=5

# A casa só precisa de escrever na pasta dela.
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$RAIZ/pb_data
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictSUIDSGID=true

[Install]
WantedBy=multi-user.target
UNIDADE
systemctl daemon-reload
echo "   /etc/systemd/system/nossa-casa.service"

diz "5. O cloudflared"
if command -v cloudflared >/dev/null 2>&1; then
  echo "   já está instalado: $(cloudflared --version 2>&1 | head -1)"
else
  arq="$(uname -m)"; [ "$arq" = "x86_64" ] && a=amd64 || a=arm64
  curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${a}.deb" -o /tmp/cf.deb \
    && dpkg -i /tmp/cf.deb >/dev/null && rm -f /tmp/cf.deb
  echo "   instalado: $(cloudflared --version 2>&1 | head -1)"
fi

cat <<'FIM'

────────────────────────────────────────────────────────────────────────────
A máquina está pronta, e NADA está a correr. É de propósito.

Falta, e é do documento `docs/mudar-de-maquina.md`, por esta ordem:

  3. parar a casa antiga   — primeiro o Cloudflared, depois o PocketBase
  4. copiar o pb_data      — a pasta inteira; ela É a base de dados
     e os hooks:  db/pocketbase/pb_hooks  e  db/pocketbase/pb_migrations
  5. copiar as credenciais do túnel para /opt/nossa-casa/.cloudflared
     ⚠ e REVER o config.yml antes de o copiar: uma regra que aponte para uma
       porta sem nada atrás dá 502 a quem lá bater
  6. systemctl enable --now nossa-casa
     systemctl enable --now cloudflared

⚠ O túnel só corre num sítio de cada vez. Quando arrancar aqui, a casa da
  máquina antiga deixa de responder — não há período com as duas.
────────────────────────────────────────────────────────────────────────────
FIM
