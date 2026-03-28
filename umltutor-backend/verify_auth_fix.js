const request = require('supertest');
const app = require('./src/app').default;
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyAuthErrors() {
  console.log('--- Verifying Auth Errors ---');

  // 1. Try to login with unregistered email
  console.log('Testing unregistered email...');
  const res1 = await request(app)
    .post('/api/auth/login')
    .send({ email: 'nonexistent@test.com', password: 'any' });
  
  console.log('Status:', res1.status);
  console.log('Message:', res1.body.error.message);
  if (res1.body.error.message === 'Unregistered email. Please try to register this email first then login.') {
    console.log('✅ Unregistered email message is correct');
  } else {
    console.log('❌ Unregistered email message is WRONG');
  }

  // 2. Register a user, then try to login with wrong password
  console.log('\nTesting incorrect password...');
  const email = `test_${Date.now()}@test.com`;
  await request(app)
    .post('/api/auth/register')
    .send({
      email,
      password: 'correct_password',
      firstName: 'Test',
      lastName: 'User',
      role: 'STUDENT'
    });

  const res2 = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'wrong_password' });

  console.log('Status:', res2.status);
  console.log('Message:', res2.body.error.message);
  if (res2.body.error.message === 'Incorrect email or password. Please try again.') {
    console.log('✅ Incorrect password message is correct');
  } else {
    console.log('❌ Incorrect password message is WRONG');
  }

  // 3. Try to register with already existing email
  console.log('\nTesting existing email registration...');
  const res3 = await request(app)
    .post('/api/auth/register')
    .send({
      email,
      password: 'new_valid_password',
      firstName: 'Another',
      lastName: 'User',
      role: 'STUDENT'
    });
  
  console.log('Status:', res3.status);
  console.log('Message:', res3.body.error.message);
  if (res3.body.error.message === 'Email is already existing in database. Please use a different email or login.') {
    console.log('✅ Existing email message is correct');
  } else {
    console.log('❌ Existing email message is WRONG');
  }

  // 4. Test public logout
  console.log('\nTesting public logout...');
  const res4 = await request(app).post('/api/auth/logout');
  console.log('Status:', res4.status);
  if (res4.status === 200) {
    console.log('✅ Public logout is working');
  } else {
    console.log('❌ Public logout failed');
  }

  await prisma.$disconnect();
}

verifyAuthErrors().catch(console.error);
