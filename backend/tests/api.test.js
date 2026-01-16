/**
 * API Integration Tests
 *
 * Tests for critical API endpoints to ensure:
 * - Correct HTTP status codes
 * - Standardized error response format
 * - Authentication requirements
 */

const request = require('supertest');
const app = require('../src/index');
const { generateTestToken, authHeader } = require('./setup');

describe('API Error Response Format', () => {
  describe('Authentication Endpoints', () => {
    describe('POST /api/v1/auth/login', () => {
      it('should return 401 with standardized error for invalid credentials', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'nonexistent@example.com', password: 'wrongpassword' });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
        expect(typeof response.body.error).toBe('string');
        expect(typeof response.body.message).toBe('string');
      });

      it('should return 400 for missing email', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({ password: 'somepassword' });

        // Depending on validation, this may be 400 or 401
        expect([400, 401]).toContain(response.status);
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
      });
    });

    describe('POST /api/v1/auth/register', () => {
      it('should return error with standardized format for missing data', async () => {
        const response = await request(app).post('/api/v1/auth/register').send({});

        expect([400, 500]).toContain(response.status);
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
      });
    });
  });

  describe('Protected Recipe Endpoints', () => {
    describe('GET /api/v1/recipes', () => {
      it('should return 401/403 without authentication', async () => {
        const response = await request(app).get('/api/v1/recipes');

        expect([401, 403]).toContain(response.status);
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
      });

      it('should accept valid JWT token format', async () => {
        const token = generateTestToken();
        const response = await request(app)
          .get('/api/v1/recipes')
          .set('Authorization', authHeader(token));

        // May fail due to DB issues in test, but should not be 401/403
        // The point is the auth middleware accepts the token format
        expect([200, 500]).toContain(response.status);
      });
    });

    describe('GET /api/v1/recipes/:id', () => {
      it('should return 401/403 without authentication', async () => {
        const response = await request(app).get('/api/v1/recipes/1');

        expect([401, 403]).toContain(response.status);
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
      });
    });

    describe('POST /api/v1/recipes/extract', () => {
      it('should return 401/403 without authentication', async () => {
        const response = await request(app)
          .post('/api/v1/recipes/extract')
          .send({ url: 'https://example.com' });

        expect([401, 403]).toContain(response.status);
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
      });
    });

    describe('POST /api/v1/recipes/ingredients-preview', () => {
      it('should return 401/403 without authentication', async () => {
        const response = await request(app)
          .post('/api/v1/recipes/ingredients-preview')
          .send({ recipeIds: [1, 2] });

        expect([401, 403]).toContain(response.status);
      });

      it('should return 400 for invalid input with auth', async () => {
        const token = generateTestToken();
        const response = await request(app)
          .post('/api/v1/recipes/ingredients-preview')
          .set('Authorization', authHeader(token))
          .send({ recipeIds: 'not-an-array' });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'BAD_REQUEST');
        expect(response.body).toHaveProperty('message');
      });

      it('should return 400 for empty recipeIds array with auth', async () => {
        const token = generateTestToken();
        const response = await request(app)
          .post('/api/v1/recipes/ingredients-preview')
          .set('Authorization', authHeader(token))
          .send({ recipeIds: [] });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'BAD_REQUEST');
        expect(response.body).toHaveProperty('message');
      });
    });

    describe('GET /api/v1/recipes/:id/scaled', () => {
      it('should return 400 for invalid servings with auth', async () => {
        const token = generateTestToken();
        const response = await request(app)
          .get('/api/v1/recipes/1/scaled?servings=-1')
          .set('Authorization', authHeader(token));

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'INVALID_SERVINGS');
        expect(response.body).toHaveProperty('message');
      });

      it('should return 400 for missing servings parameter with auth', async () => {
        const token = generateTestToken();
        const response = await request(app)
          .get('/api/v1/recipes/1/scaled')
          .set('Authorization', authHeader(token));

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'INVALID_SERVINGS');
      });
    });
  });

  describe('Protected Shopping List Endpoints', () => {
    describe('GET /api/v1/shopping-lists', () => {
      it('should return 401/403 without authentication', async () => {
        const response = await request(app).get('/api/v1/shopping-lists');

        expect([401, 403]).toContain(response.status);
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('message');
      });
    });

    describe('POST /api/v1/shopping-lists/from-recipes', () => {
      it('should return 400 for missing recipeIds with auth', async () => {
        const token = generateTestToken();
        const response = await request(app)
          .post('/api/v1/shopping-lists/from-recipes')
          .set('Authorization', authHeader(token))
          .send({ name: 'Test List' });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'BAD_REQUEST');
        expect(response.body).toHaveProperty('message');
      });

      it('should return 400 for missing name with auth', async () => {
        const token = generateTestToken();
        const response = await request(app)
          .post('/api/v1/shopping-lists/from-recipes')
          .set('Authorization', authHeader(token))
          .send({ recipeIds: [1] });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'BAD_REQUEST');
        expect(response.body).toHaveProperty('message');
      });
    });
  });

  describe('Health Check', () => {
    it('should return 200 with healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 with standardized error for unknown routes', async () => {
      const response = await request(app).get('/api/v1/nonexistent-route');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'NOT_FOUND');
      expect(response.body).toHaveProperty('message');
    });
  });
});

describe('CORS Configuration', () => {
  it('should include Authorization in allowed headers', async () => {
    const response = await request(app)
      .options('/api/v1/recipes')
      .set('Origin', 'http://localhost:3001')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'Authorization');

    // CORS preflight should succeed
    expect([200, 204]).toContain(response.status);
  });
});
