const request = require('supertest');
const app = require('../app').default;

describe('Sanity Check', () => {
  test('Health check should return 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });
});
