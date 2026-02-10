import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.refreshToken.findMany({
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true
        }
      }
    }
  });
  console.log('Total sessions in DB:', sessions.length);
  sessions.forEach(s => {
    console.log(`Session ID: ${s.id}, User: ${s.user.email}, Device: ${s.deviceInfo}, Revoked: ${s.isRevoked}, Expires: ${s.expiresAt}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
