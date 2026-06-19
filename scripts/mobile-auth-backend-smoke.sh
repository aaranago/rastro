#!/usr/bin/env bash
set -euo pipefail

base_url="${1:-${MOBILE_AUTH_API_BASE_URL:-${EXPO_PUBLIC_API_BASE_URL:-${BETTER_AUTH_URL:-http://127.0.0.1:3000}}}}"
session_path="${MOBILE_AUTH_SESSION_PATH:-/api/auth/get-session}"
timeout_seconds="${MOBILE_AUTH_SMOKE_TIMEOUT_SECONDS:-5}"

if [[ -z "${base_url// }" ]]; then
  echo "Mobile auth smoke failed: no API base URL was configured." >&2
  echo "Pass a URL argument or set MOBILE_AUTH_API_BASE_URL, EXPO_PUBLIC_API_BASE_URL, or BETTER_AUTH_URL." >&2
  exit 2
fi

case "$base_url" in
  http://* | https://*) ;;
  *)
    echo "Mobile auth smoke failed: API base URL must be an absolute http(s) URL: $base_url" >&2
    exit 2
    ;;
esac

if [[ "$session_path" != /* ]]; then
  echo "Mobile auth smoke failed: MOBILE_AUTH_SESSION_PATH must start with /: $session_path" >&2
  exit 2
fi

session_url="${base_url%/}${session_path}"
body_file="$(mktemp)"
error_file="$(mktemp)"
trap 'rm -f "$body_file" "$error_file"' EXIT

status="$(
  curl \
    --silent \
    --show-error \
    --max-time "$timeout_seconds" \
    --output "$body_file" \
    --write-out "%{http_code}" \
    "$session_url" 2>"$error_file"
)" || {
  echo "Mobile auth backend is not reachable at $session_url." >&2
  echo "Start the Next.js/API backend, then set EXPO_PUBLIC_API_BASE_URL to the origin reachable from the device." >&2
  cat "$error_file" >&2
  exit 1
}

case "$status" in
  200 | 204 | 401 | 403)
    echo "Mobile auth backend reached $session_url (HTTP $status)."
    ;;
  404)
    echo "Mobile auth smoke failed: $session_url returned HTTP 404." >&2
    echo "The backend is reachable, but the Better Auth session route was not found. Check the API origin and route mount." >&2
    exit 1
    ;;
  5??)
    echo "Mobile auth smoke failed: $session_url returned HTTP $status." >&2
    echo "The backend is reachable but unhealthy. Check Next.js logs, POSTGRES_URL, and Better Auth env vars." >&2
    head -c 1000 "$body_file" >&2 || true
    printf '\n' >&2
    exit 1
    ;;
  *)
    echo "Mobile auth smoke failed: $session_url returned unexpected HTTP $status." >&2
    head -c 1000 "$body_file" >&2 || true
    printf '\n' >&2
    exit 1
    ;;
esac
