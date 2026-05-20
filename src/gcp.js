const { google } = require('googleapis');

async function getComputeClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const authClient = await auth.getClient();
  return google.compute({
    version: 'v1',
    auth: authClient,
  });
}

/**
 * Attempts to create a VM instance.
 * @param {string} project 
 * @param {string} zone 
 * @param {object} instanceBody 
 * @returns {Promise<object>} GCP Operation object
 */
async function insertInstance(project, zone, instanceBody) {
  const compute = await getComputeClient();
  const res = await compute.instances.insert({
    project,
    zone,
    resource: instanceBody,
  });
  return res.data;
}

module.exports = {
  insertInstance,
};
