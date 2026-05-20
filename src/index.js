require('dotenv').config();
const express = require('express');
const { createInstance } = require('./controllers/instanceController');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Proxy route for VM instance creation
app.post('/compute/v1/projects/:project/zones/:zone/instances', createInstance);

// Health check
app.get('/health', (req, res) => res.status(200).send('OK'));

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Flexible GCP Compute API listening at http://localhost:${port}`);
  });
}

module.exports = app;
