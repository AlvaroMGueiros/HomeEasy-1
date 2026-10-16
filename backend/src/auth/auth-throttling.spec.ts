import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import request = require('supertest');

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('authentication rate limits', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            requestPasswordReset: jest.fn().mockResolvedValue({ message: 'Check your email.' }),
            login: jest.fn().mockResolvedValue({})
          }
        }
      ]
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  it('limits password reset and does not trust a spoofed forwarded IP', async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await request(app.getHttpServer())
        .post('/auth/password-reset/request')
        .send({ email: 'user@example.test' })
        .expect(200);
    }
    await request(app.getHttpServer())
      .post('/auth/password-reset/request')
      .set('X-Forwarded-For', '203.0.113.99')
      .send({ email: 'user@example.test' })
      .expect(429);
  });
  it('limits repeated login attempts separately from password reset', async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await request(app.getHttpServer()).post('/auth/login').send({}).expect(200);
    }
    await request(app.getHttpServer()).post('/auth/login').send({}).expect(429);
  });
});
