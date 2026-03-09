#!/bin/bash
# Deploy backend to Render using deploy hook
# Usage: ./scripts/deploy-render.sh

# Load from .env.local if exists
if [ -f .env.local ]; then
  export $(grep RENDER_DEPLOY_HOOK .env.local | xargs)
fi

if [ -z "$RENDER_DEPLOY_HOOK" ]; then
  echo "Error: RENDER_DEPLOY_HOOK not set"
  echo "Add to .env.local: RENDER_DEPLOY_HOOK=https://api.render.com/deploy/srv-xxx?key=yyy"
  exit 1
fi

echo "Triggering Render deploy..."
response=$(curl -s -X POST "$RENDER_DEPLOY_HOOK")
echo "Response: $response"
echo "Deploy triggered! Check Render dashboard for status."
