#!/usr/bin/env bash
# Repeatable deploy - run this every time you ship a change. Builds both
# images locally, tags each with a timestamp (never `latest`, so the
# container group always pulls a fresh image instead of reusing a cached
# one), pushes to ACR, then redeploys the container group to the new tags.
set -euo pipefail
cd "$(dirname "$0")"

set -a
source ../.env
set +a

: "${AZURE_RESOURCE_GROUP:?Set AZURE_RESOURCE_GROUP in ../.env}"
: "${AZURE_LOCATION:?Set AZURE_LOCATION in ../.env}"
: "${AZURE_ACR_NAME:?Set AZURE_ACR_NAME in ../.env}"
: "${AZURE_DNS_LABEL:?Set AZURE_DNS_LABEL in ../.env}"
: "${JWT_SECRET:?Set JWT_SECRET in ../.env}"
: "${RAZORPAY_KEY_ID:?Set RAZORPAY_KEY_ID in ../.env}"
: "${RAZORPAY_KEY_SECRET:?Set RAZORPAY_KEY_SECRET in ../.env}"
: "${RAZORPAY_WEBHOOK_SECRET:?Set RAZORPAY_WEBHOOK_SECRET in ../.env}"

TAG=$(date +%Y%m%d%H%M%S)
ACR_LOGIN_SERVER="${AZURE_ACR_NAME}.azurecr.io"

# The DNS label is fixed ahead of time (chosen in .env), so the app's URL is
# known before the frontend image is even built - that's what lets us bake
# the right backend URL into the frontend bundle in the same step that
# builds it.
FQDN="${AZURE_DNS_LABEL}.${AZURE_LOCATION}.azurecontainer.io"
BACKEND_URL="http://${FQDN}:8080"
FRONTEND_URL="http://${FQDN}:8081"

echo "Logging into ACR ($ACR_LOGIN_SERVER)..."
az acr login --name "$AZURE_ACR_NAME"

# Mirror postgres into our own registry rather than pulling it straight from
# Docker Hub at deploy time - ACI's shared outbound IPs routinely hit Docker
# Hub's anonymous pull rate limit ("index.docker.io ... please retry later"),
# which fails the whole container group even though our own images are fine.
# Re-running this is harmless if it's already been imported.
echo "Mirroring postgres:16-alpine into $ACR_LOGIN_SERVER..."
az acr import \
  --name "$AZURE_ACR_NAME" \
  --source docker.io/library/postgres:16-alpine \
  --image postgres:16-alpine \
  --force

echo "Building backend image ($TAG)..."
docker build -t "${ACR_LOGIN_SERVER}/seatsync-backend:${TAG}" ../backend

echo "Building frontend image ($TAG), baking in backend URL $BACKEND_URL..."
docker build \
  --build-arg VITE_API_BASE_URL="$BACKEND_URL" \
  -t "${ACR_LOGIN_SERVER}/seatsync-frontend:${TAG}" \
  ../frontend

echo "Pushing images..."
docker push "${ACR_LOGIN_SERVER}/seatsync-backend:${TAG}"
docker push "${ACR_LOGIN_SERVER}/seatsync-frontend:${TAG}"

ACR_USERNAME=$(az acr credential show --name "$AZURE_ACR_NAME" --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name "$AZURE_ACR_NAME" --query "passwords[0].value" -o tsv)

echo "Deploying container group (image tag $TAG)..."
az deployment group create \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --template-file app.bicep \
  --parameters \
    location="$AZURE_LOCATION" \
    acrLoginServer="$ACR_LOGIN_SERVER" \
    acrUsername="$ACR_USERNAME" \
    acrPassword="$ACR_PASSWORD" \
    backendImageTag="$TAG" \
    frontendImageTag="$TAG" \
    dnsLabel="$AZURE_DNS_LABEL" \
    jwtSecret="$JWT_SECRET" \
    razorpayKeyId="$RAZORPAY_KEY_ID" \
    razorpayKeySecret="$RAZORPAY_KEY_SECRET" \
    razorpayWebhookSecret="$RAZORPAY_WEBHOOK_SECRET" \
    corsAllowedOrigins="$FRONTEND_URL" \
  --output none

echo ""
echo "Deployed."
echo "  Frontend: $FRONTEND_URL"
echo "  Backend:  $BACKEND_URL/actuator/health"
echo ""
echo "Note: postgres has no persistent volume in this setup - this deploy"
echo "reset all app data (see app.bicep header comment)."
