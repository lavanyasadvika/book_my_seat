// One-time bootstrap - run via setup-infra.sh, not on every deploy.
// Provisions the container registry that deploy.sh pushes images to.
// The resource group itself is created by the CLI script (az group create),
// not here, since a Bicep template deploys *into* an existing group.
param location string = resourceGroup().location
param acrName string

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

output loginServer string = acr.properties.loginServer
