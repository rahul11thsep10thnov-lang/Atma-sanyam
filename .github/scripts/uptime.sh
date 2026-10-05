#!/usr/bin/env bash
# Checks each URL in $UPTIME_URLS and alerts on changes. State lives in
# .uptime/<hash> files: "<down-since-epoch> <last-alert-epoch> <last-status>".
set -uo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
REMIND_EVERY=${REMIND_EVERY:-3600}
mkdir -p .uptime

if [ -z "${UPTIME_URLS:-}" ]; then
  echo "::notice::UPTIME_URLS is not set (Settings → Secrets and variables → Actions → Variables). Nothing to check."
  exit 0
fi

now=$(date +%s)
failed=0
IFS=',' read -ra urls <<< "$UPTIME_URLS"
for raw in "${urls[@]}"; do
  url="$(echo "$raw" | xargs)"
  [ -z "$url" ] && continue
  key=".uptime/$(printf '%s' "$url" | sha256sum | cut -c1-16)"

  # Two tries 20 s apart, so one slow response is not an outage.
  status=000
  for attempt in 1 2; do
    status=$(curl -sS -o /dev/null -w '%{http_code}' -L --max-time 25 -A 'PoliceExams-uptime/1.0' "$url" 2>/dev/null || true)
    status=${status:-000}
    if [ "$status" -ge 200 ] 2>/dev/null && [ "$status" -lt 400 ]; then break; fi
    [ "$attempt" -eq 1 ] && sleep 20
  done

  if [ "$status" -ge 200 ] 2>/dev/null && [ "$status" -lt 400 ]; then
    echo "UP    $status  $url"
    if [ -f "$key" ]; then
      read -r since _ _ < "$key"
      mins=$(( (now - since + 59) / 60 ))
      "$here/notify.sh" "✅ PoliceExams: $url is back up (HTTP $status) after about $mins min."
      rm -f "$key"
    fi
  else
    failed=1
    echo "DOWN  $status  $url"
    if [ -f "$key" ]; then
      read -r since last_alert _ < "$key"
      if [ $((now - last_alert)) -ge "$REMIND_EVERY" ]; then
        mins=$(( (now - since) / 60 ))
        "$here/notify.sh" "🚨 PoliceExams: $url is STILL DOWN (HTTP $status) — for about $mins min. $RUN_URL"
        last_alert=$now
      fi
      echo "$since $last_alert $status" > "$key"
    else
      "$here/notify.sh" "🚨 PoliceExams: $url is DOWN (HTTP $status; 000 = no answer). $RUN_URL"
      echo "$now $now $status" > "$key"
    fi
  fi
done

# Alerts were sent above; a red run would only add a GitHub e-mail every
# 10 minutes, so the run stays green and lists the result in its summary.
if [ "$failed" -eq 1 ]; then echo "Some URLs are down — see the log above." >> "${GITHUB_STEP_SUMMARY:-/dev/null}"; fi
exit 0
