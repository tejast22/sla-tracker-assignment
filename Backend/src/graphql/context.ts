// backend/src/graphql/context.ts
import { PrismaClient, UserRole } from '@prisma/client';

// We define the shape of the authenticated user
export interface CurrentUser {
  id: string;
  role: UserRole;
}

// This is the exact context type our resolvers will receive[cite: 1]
export interface GraphQLContext {
  prisma: PrismaClient;
  currentUser: CurrentUser | null;
}