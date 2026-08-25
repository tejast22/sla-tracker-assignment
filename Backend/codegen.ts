// backend/codegen.ts
import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: './src/graphql/schema/schema.graphql',
  generates: {
    './src/graphql/generated/graphql.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        // We will define this context file in our next step to hold the Prisma client and Auth user
        contextType: '../context#GraphQLContext',
        useIndexSignature: true,
      },
    },
  },
};

export default config;