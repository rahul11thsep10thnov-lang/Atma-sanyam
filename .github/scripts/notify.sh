#!/usr/bin/env bash
# Sends one message to the alert channels configured as repository secrets:
# ALERT_WEBHOOK_URL (Slack or Discord incoming webhook) and/or
# TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID. Never fails the calling job.
# Usage: notify.sh "message text"
set -uo pipefail
text="$1"
sent=0

if [ -n "${ALERT_WEBHOOK_URL:-}" ]; then
  case "$ALERT_WEBHOOK_URL" in
    https://discord.com/*|https://discordapp.com/*) body=$(jq -n --arg t "${text:0:1900}" '{content: $t}') ;;
    https://hooks.slack.com/*) body=$(jq -n --arg t "$text" '{text: $t}') ;;
    *) body=$(jq -n --arg t "$text" '{text: $t, content: $t}') ;;
  esac
  if curl -fsS -m 15 -X POST -H 'Content-Type: application/json' -d "$body" "$ALERT_WEBHOOK_URL" >/dev/null; then
    sent=$((sent + 1))
  else
    echo "::warning::Could not deliver the alert to ALERT_WEBHOOK_URL"
  fi
fi

if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
  body=$(jq -n --arg c "$TELEGRAM_CHAT_ID" --arg t "${text:0:4000}" '{chat_id: $c, text: $t, disable_web_page_preview: true}')
  if curl -fsS -m 15 -X POST -H 'Content-Type: application/json' -d "$body" "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" >/dev/null; then
    sent=$((sent + 1))
  else
    echo "::warning::Could not deliver the alert to Telegram"
  fi
fi

if [ "$sent" -eq 0 ]; then
  echo "::warning::No alert channel delivered. Set ALERT_WEBHOOK_URL or TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID as repository secrets."
fi
echo "$text"
exit 0
