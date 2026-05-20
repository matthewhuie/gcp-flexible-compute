const request = require('supertest');
const app = require('../src/index');
const gcp = require('../src/gcp');

jest.mock('../src/gcp');

describe('POST /compute/v1/projects/:project/zones/:zone/instances', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create an instance with the first machine type if it is available', async () => {
    gcp.insertInstance.mockResolvedValue({ id: 'op-123', status: 'RUNNING' });

    const response = await request(app)
      .post('/compute/v1/projects/my-project/zones/us-central1-a/instances')
      .send({
        name: 'test-instance',
        flexibleMachineTypes: ['e2-medium', 'n1-standard-1'],
        machineType: 'e2-medium'
      });

    expect(response.status).toBe(200);
    expect(response.body.id).toBe('op-123');
    expect(gcp.insertInstance).toHaveBeenCalledTimes(1);
    expect(gcp.insertInstance).toHaveBeenCalledWith(
      'my-project',
      'us-central1-a',
      expect.objectContaining({ machineType: 'zones/us-central1-a/machineTypes/e2-medium' })
    );
  });

  it('should try the next machine type if the first one is exhausted', async () => {
    // First call fails with exhausted error
    gcp.insertInstance
      .mockRejectedValueOnce({
        code: 403,
        message: 'ZONE_RESOURCE_POOL_EXHAUSTED'
      })
      // Second call succeeds
      .mockResolvedValueOnce({ id: 'op-456', status: 'RUNNING' });

    const response = await request(app)
      .post('/compute/v1/projects/my-project/zones/us-central1-a/instances')
      .send({
        name: 'test-instance',
        flexibleMachineTypes: ['e2-medium', 'n1-standard-1']
      });

    expect(response.status).toBe(200);
    expect(response.body.id).toBe('op-456');
    expect(gcp.insertInstance).toHaveBeenCalledTimes(2);
    expect(gcp.insertInstance).toHaveBeenNthCalledWith(
      1,
      'my-project',
      'us-central1-a',
      expect.objectContaining({ machineType: 'zones/us-central1-a/machineTypes/e2-medium' })
    );
    expect(gcp.insertInstance).toHaveBeenNthCalledWith(
      2,
      'my-project',
      'us-central1-a',
      expect.objectContaining({ machineType: 'zones/us-central1-a/machineTypes/n1-standard-1' })
    );
  });

  it('should stop and return error if it is not an availability error', async () => {
    gcp.insertInstance.mockRejectedValue({
      code: 400,
      message: 'Invalid field value'
    });

    const response = await request(app)
      .post('/compute/v1/projects/my-project/zones/us-central1-a/instances')
      .send({
        name: 'test-instance',
        flexibleMachineTypes: ['e2-medium', 'n1-standard-1']
      });

    expect(response.status).toBe(400);
    expect(gcp.insertInstance).toHaveBeenCalledTimes(1);
    expect(response.body.error.message).toBe('Invalid field value');
  });

  it('should return error if all machine types fail due to availability', async () => {
    gcp.insertInstance.mockRejectedValue({
      code: 403,
      message: 'ZONE_RESOURCE_POOL_EXHAUSTED'
    });

    const response = await request(app)
      .post('/compute/v1/projects/my-project/zones/us-central1-a/instances')
      .send({
        name: 'test-instance',
        flexibleMachineTypes: ['e2-medium', 'n1-standard-1']
      });

    expect(response.status).toBe(403);
    expect(gcp.insertInstance).toHaveBeenCalledTimes(2);
    expect(response.body.error.message).toBe('ZONE_RESOURCE_POOL_EXHAUSTED');
  });
});
