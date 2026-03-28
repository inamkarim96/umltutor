const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('🧹 Starting database cleanup...');
  
  try {
    // Delete in order of dependencies to avoid foreign key constraints
    console.log('🗑️  Cleaning notifications...');
    await prisma.notification.deleteMany();
    
    console.log('🗑️  Cleaning UML data...');
    await prisma.uMLData.deleteMany();
    
    console.log('🗑️  Cleaning evaluations...');
    await prisma.evaluation.deleteMany();
    
    console.log('🗑️  Cleaning submissions...');
    await prisma.submission.deleteMany();
    
    console.log('🗑️  Cleaning assignments...');
    await prisma.assignment.deleteMany();
    
    console.log('🗑️  Cleaning class students...');
    await prisma.classStudent.deleteMany();
    
    console.log('🗑️  Cleaning classes...');
    await prisma.class.deleteMany();
    
    console.log('🗑️  Cleaning users...');
    await prisma.user.deleteMany();
    
    console.log('✅ Database cleanup completed successfully!');
    console.log('📊 Database is now empty but schema is preserved.');
    
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Add confirmation
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('⚠️  WARNING: This will delete ALL data in the database!');
console.log('📋 This will remove:');
console.log('   - All users (teachers and students)');
console.log('   - All classes and enrollments');
console.log('   - All assignments and submissions');
console.log('   - All diagrams and feedback');
console.log('   - All notifications');
console.log('');

rl.question('Type "DELETE" to confirm: ', (answer) => {
  if (answer === 'DELETE') {
    rl.close();
    cleanDatabase().catch(console.error);
  } else {
    console.log('❌ Operation cancelled.');
    rl.close();
  }
});
