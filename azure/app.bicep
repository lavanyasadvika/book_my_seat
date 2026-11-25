// Repeatable deploy target - run via deploy.sh every time you ship. One
// container group, one public IP/DNS label, mirroring docker-compose.yml's
// three services (postgres, backend, frontend). Only backend (8080) and
// frontend (8081) are reachable from outside; postgres talks to backend
// over localhost inside the shared group network namespace, same isolation
// idea as compose's private bridge network.
//
// KNOWN LIMITATION (matches this pattern's documented trade-off): postgres
// here has no persistent volume. Every redeploy replaces the whole
// container group, including postgres, so booking/user data does not
// survive a deploy. Fine for a demo; swap for Azure Database for
// PostgreSQL Flexible Server if you need data to persist across deploys.

param location string
param acrLoginServer string
param acrUsername string
@secure()
param acrPassword string
param backendImageTag string
param frontendImageTag string
param dnsLabel string

@secure()
param jwtSecret string
param razorpayKeyId string
@secure()
param razorpayKeySecret string
@secure()
param razorpayWebhookSecret string
param corsAllowedOrigins string
@secure()
param dbPassword string = 'seatsync'

resource containerGroup 'Microsoft.ContainerInstance/containerGroups@2023-05-01' = {
  name: 'seatsync-app'
  location: location
  properties: {
    osType: 'Linux'
    restartPolicy: 'Always'
    imageRegistryCredentials: [
      {
        server: acrLoginServer
        username: acrUsername
        password: acrPassword
      }
    ]
    ipAddress: {
      type: 'Public'
      dnsNameLabel: dnsLabel
      ports: [
        { port: 8080, protocol: 'TCP' }
        { port: 8081, protocol: 'TCP' }
      ]
    }
    containers: [
      {
        name: 'postgres'
        properties: {
          // Pulled from our own ACR (imported once via `az acr import`), not
          // straight from Docker Hub - ACI's shared outbound IPs routinely
          // hit Docker Hub's anonymous pull rate limit otherwise.
          image: '${acrLoginServer}/postgres:16-alpine'
          ports: [
            { port: 5432, protocol: 'TCP' }
          ]
          environmentVariables: [
            { name: 'POSTGRES_DB', value: 'seatsync' }
            { name: 'POSTGRES_USER', value: 'seatsync' }
            { name: 'POSTGRES_PASSWORD', secureValue: dbPassword }
          ]
          resources: {
            requests: {
              cpu: 1
              memoryInGB: 1
            }
          }
        }
      }
      {
        name: 'backend'
        properties: {
          image: '${acrLoginServer}/seatsync-backend:${backendImageTag}'
          ports: [
            { port: 8080, protocol: 'TCP' }
          ]
          environmentVariables: [
            { name: 'DB_URL', value: 'jdbc:postgresql://localhost:5432/seatsync' }
            { name: 'DB_USERNAME', value: 'seatsync' }
            { name: 'DB_PASSWORD', secureValue: dbPassword }
            { name: 'JWT_SECRET', secureValue: jwtSecret }
            { name: 'CORS_ALLOWED_ORIGINS', value: corsAllowedOrigins }
            { name: 'RAZORPAY_KEY_ID', value: razorpayKeyId }
            { name: 'RAZORPAY_KEY_SECRET', secureValue: razorpayKeySecret }
            { name: 'RAZORPAY_WEBHOOK_SECRET', secureValue: razorpayWebhookSecret }
          ]
          resources: {
            requests: {
              cpu: 1
              memoryInGB: 2
            }
          }
        }
      }
      {
        name: 'frontend'
        properties: {
          image: '${acrLoginServer}/seatsync-frontend:${frontendImageTag}'
          ports: [
            { port: 8081, protocol: 'TCP' }
          ]
          resources: {
            requests: {
              cpu: 1
              memoryInGB: 1
            }
          }
        }
      }
    ]
  }
}

output fqdn string = containerGroup.properties.ipAddress.fqdn
output frontendUrl string = 'http://${containerGroup.properties.ipAddress.fqdn}:8081'
output backendUrl string = 'http://${containerGroup.properties.ipAddress.fqdn}:8080'
