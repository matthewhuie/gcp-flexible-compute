# GCP Flexible Compute API

A Node.js proxy API that mimics the GCP Compute Engine `instances.insert` endpoint. It adds support for specifying multiple machine types, automatically falling back to the next available type if the primary one is exhausted or unavailable in the target zone.

## Features
- **Flexible Machine Types**: Pass an array of machine types via the `flexibleMachineTypes` field.
- **Drop-in Compatibility**: Maintains the exact request/response schema of the official GCP API.
- **Intelligent Fallback**: Only retries on availability errors (e.g., `ZONE_RESOURCE_POOL_EXHAUSTED`, `QUOTA_EXCEEDED`). Validation errors fail fast.
- **Cloud Run Ready**: Includes a `Dockerfile` for easy deployment to Google Cloud's serverless platform.

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Authentication**:
   Ensure you have Application Default Credentials (ADC) set up locally:
   ```bash
   gcloud auth application-default login
   ```

3. **Start the Server**:
   ```bash
   npm start
   ```
   The server listens on `http://localhost:3000` (or the port defined by `$PORT`).

## Usage

Point your GCP client (SDK, Terraform, or direct HTTP calls) to this proxy instead of the standard Google endpoint.

### Example Request

```json
POST http://localhost:3000/compute/v1/projects/[PROJECT_ID]/zones/[ZONE]/instances
Content-Type: application/json

{
  "name": "my-flexible-instance",
  "flexibleMachineTypes": ["n2-standard-2", "e2-standard-2", "n1-standard-2"],
  "disks": [
    {
      "boot": true,
      "autoDelete": true,
      "initializeParams": {
        "sourceImage": "projects/debian-cloud/global/images/family/debian-11"
      }
    }
  ],
  "networkInterfaces": [
    {
      "network": "global/networks/default"
    }
  ]
}
```

If the first machine type is unavailable, the API logs the failure and immediately attempts the next one in the list.

## Deployment to Cloud Run

You can host this proxy on Cloud Run to make it available to your entire organization.

```bash
gcloud run deploy gcp-flexible-compute \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

*Note: Ensure the Cloud Run service account has the `Compute Instance Admin` role.*

## Development & Testing

Run the test suite to verify the fallback logic:
```bash
npm test
```
