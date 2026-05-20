const { insertInstance } = require('../gcp');

async function createInstance(req, res) {
  const { project, zone } = req.params;
  const instanceBody = { ...req.body }; // Clone to avoid modifying original request if needed elsewhere
  const flexibleMachineTypes = instanceBody.flexibleMachineTypes;

  // Remove custom field before sending to GCP
  delete instanceBody.flexibleMachineTypes;

  const machineTypesToTry = Array.isArray(flexibleMachineTypes) ? flexibleMachineTypes : [instanceBody.machineType];

  let lastError;
  for (const type of machineTypesToTry) {
    if (!type) continue;

    try {
      // Create a fresh clone for this attempt to avoid mutation side effects
      const currentInstanceBody = { ...instanceBody };
      
      // Ensure machineType is a full URL or relative path as expected by GCP
      const formattedType = (type.startsWith('projects/') || type.startsWith('zones/')) 
        ? type 
        : `zones/${zone}/machineTypes/${type}`;
      
      currentInstanceBody.machineType = formattedType;

      console.log(`Attempting to create instance with machine type: ${type}`);
      const operation = await insertInstance(project, zone, currentInstanceBody);
      
      // Success: return the GCP Operation object
      return res.status(200).json(operation);
    } catch (error) {
      lastError = error;
      
      // Extract GCP error details
      const gcpError = error.errors && error.errors[0];
      const errorCode = error.code;
      const errorMessage = error.message || '';

      console.error(`Attempt with ${type} failed: ${errorCode} - ${errorMessage}`);

      // Availability errors often come as 403 (quota), 429 (rate limit), or 400 (exhausted)
      // Specific check for ZONE_RESOURCE_POOL_EXHAUSTED or similar availability messages
      const isAvailabilityError = 
        errorCode === 403 || 
        errorCode === 429 || 
        errorMessage.includes('ZONE_RESOURCE_POOL_EXHAUSTED') ||
        errorMessage.includes('exhausted') ||
        errorMessage.includes('not available');

      if (!isAvailabilityError) {
        // If it's a validation error or permission error, don't bother trying other types
        break;
      }
      
      console.log(`Resource unavailable for ${type}, trying next...`);
    }
  }

  // If all failed, return the last error encountered
  if (lastError) {
    const statusCode = lastError.code || 500;
    // Attempt to return the same error structure as GCP
    return res.status(statusCode).json({
      error: {
        code: statusCode,
        message: lastError.message,
        errors: lastError.errors || []
      }
    });
  }

  return res.status(400).json({
    error: {
      code: 400,
      message: "No machine types provided or available."
    }
  });
}

module.exports = {
  createInstance,
};
