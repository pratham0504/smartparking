#!/usr/bin/env bash
# Helper script: prints the exact environment variables to set in Render
# Do NOT commit secrets to the repo. Run locally and paste values into Render dashboard.

echo "Render environment variables to enable python services and backend config"
echo
cat <<'EOF'
# Add these in Render > Your Service > Environment
START_PY_SERVICES=true
START_PLATE_DETECTOR=true
START_RFID_BRIDGE=true
PYTHON_BIN=python3
DETECTOR_HOST=0.0.0.0
DETECTOR_PORT=5002
BACKEND_URL=https://smartparking-f86d.onrender.com
# Optional: If you want Python logs sent to Render logs, ensure the scripts exist at the expected paths.
EOF

echo
echo "How to use"
echo "1. Open your Render service -> Environment"
echo "2. Add the variables above (key + value)"
echo "3. Save and trigger a redeploy (Render auto-deploys on env change)"
echo
exit 0
