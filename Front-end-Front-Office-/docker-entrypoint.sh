#!/bin/sh

# Create or update the runtime-config.js with environment variables
cat > /usr/share/nginx/html/runtime-config.js << EOF
window.RUNTIME_CONFIG = {
  MAPBOX_TOKEN: "${MAPBOX_TOKEN}",
  VITE_MAPBOX_TOKEN: "${VITE_MAPBOX_TOKEN}",
  REACT_APP_MAPBOX_TOKEN: "${REACT_APP_MAPBOX_TOKEN}"
};
EOF

# Start nginx
exec nginx -g 'daemon off;'
