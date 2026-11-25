#!/usr/bin/env bash
# One-time bootstrap: creates the resource group + container registry.
# Run this once per environment; run deploy.sh every time you ship a change.
set -euo pipefail
cd "$(dirname "$0")"

set -a
source ../.env
set +a

: "${AZURE_RESOURCE_GROUP:?Set AZURE_RESOURCE_GROUP in ../.env}"
: "${AZURE_LOCATION:?Set AZURE_LOCATION in ../.env}"
: "${AZURE_ACR_NAME:?Set AZURE_ACR_NAME in ../.env}"

echo "Logging into Azure (browser window will open if not already logged in)..."
az account show >/dev/null 2>&1 || az login

echo "Creating resource group '$AZURE_RESOURCE_GROUP' in $AZURE_LOCATION..."
az group create --name "$AZURE_RESOURCE_GROUP" --location "$AZURE_LOCATION" >/dev/null

echo "Provisioning container registry '$AZURE_ACR_NAME'..."
az deployment group create \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --template-file infra.bicep \
  --parameters acrName="$AZURE_ACR_NAME" location="$AZURE_LOCATION" \
  --output none

LOGIN_SERVER=$(az acr show --name "$AZURE_ACR_NAME" --query loginServer -o tsv)
echo ""
echo "Infra ready."
echo "  Resource group: $AZURE_RESOURCE_GROUP"
echo "  Registry:       $LOGIN_SERVER"
echo ""
echo "Next: run ./deploy.sh to build, push, and deploy the app."
