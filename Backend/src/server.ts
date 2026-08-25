// backend/src/server.ts
import { createServer } from 'node:http';
import { createYoga, YogaInitialContext } from 'graphql-yoga';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { GraphQLContext } from './graphql/context.js';
import { AuthService } from './services/auth/auth.service.js';
import { resolvers } from './graphql/resolvers/index.js';

const prisma = new PrismaClient();

// Read our schema file strictly as required[cite: 1]
const typeDefs = readFileSync(resolve(process.cwd(), 'src/graphql/schema/schema.graphql'), 'utf-8');

// Build an executable schema explicitly to prevent Yoga initialization errors
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const yoga = createYoga<GraphQLContext>({
  schema,
  context: async (initialContext: YogaInitialContext) => {
    let currentUser = null;
    const authHeader = initialContext.request.headers.get('authorization');
    
    // Server-side authorization check[cite: 1]
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const payload = AuthService.verifyToken(token);
        currentUser = { id: payload.userId, role: payload.role };
      } catch (err) {
        // Allow unauthenticated requests for public queries
      }
    }
    
    return {
      prisma,
      currentUser,
    };
  },
});

const server = createServer(yoga);

server.listen(4000, () => {
  console.info('Server is running on http://localhost:4000/graphql');
});