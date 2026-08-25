// backend/prisma/seed.ts
import { PrismaClient, UserRole, Priority, TicketStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data cleanly
  await prisma.comment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.user.deleteMany();

  // Hash password for default users
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create Default Users (Reporter & Agent) as required by the assignment[cite: 1]
  const reporter = await prisma.user.create({
    data: {
      name: 'John Reporter',
      email: 'reporter@example.com',
      password: hashedPassword,
      role: UserRole.REPORTER,
    },
  });

  const agent = await prisma.user.create({
    data: {
      name: 'Alice Agent',
      email: 'agent@example.com',
      password: hashedPassword,
      role: UserRole.AGENT,
    },
  });

  console.log('👥 Created users: reporter@example.com, agent@example.com');

  // 2. Create Sample Holiday as required[cite: 1]
  await prisma.holiday.create({
    data: {
      date: new Date('2026-08-15T00:00:00.000Z'),
      name: 'Independence Day',
    },
  });

  console.log('📅 Created sample holiday: Independence Day (2026-08-15)');

  // 3. Create Sample Tickets across different priorities[cite: 1]
  await prisma.ticket.create({
    data: {
      title: 'Payment Gateway Failing on Checkout',
      description: 'Customers are unable to complete payments using Stripe integration.',
      priority: Priority.URGENT,
      status: TicketStatus.IN_PROGRESS,
      reporterId: reporter.id,
      assigneeId: agent.id,
      comments: {
        create: [
          { content: 'We are looking into the gateway logs right now.', authorId: agent.id }
        ]
      }
    },
  });

  await prisma.ticket.create({
    data: {
      title: 'Login Issue with SSO',
      description: 'Enterprise SSO login throws a 500 error intermittently.',
      priority: Priority.HIGH,
      status: TicketStatus.OPEN,
      reporterId: reporter.id,
    },
  });

  await prisma.ticket.create({
    data: {
      title: 'Update Profile Picture UI Bug',
      description: 'The cropping modal overflows on mobile viewports.',
      priority: Priority.MEDIUM,
      status: TicketStatus.OPEN,
      reporterId: reporter.id,
    },
  });

  await prisma.ticket.create({
    data: {
      title: 'Typo in Landing Page Footer',
      description: 'Copyright year still displays 2024 instead of 2026.',
      priority: Priority.LOW,
      status: TicketStatus.RESOLVED,
      reporterId: reporter.id,
      assigneeId: agent.id,
      resolvedAt: new Date(),
    },
  });

  console.log('🎫 Created sample tickets across all priority tiers.');
  console.log('✨ Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });