// frontend/src/api/client.ts
import { GraphQLClient } from 'graphql-request';

const endpoint = 'http://localhost:4000/graphql';

export const graphQLClient = new GraphQLClient(endpoint, {
  headers: () => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['authorization'] = `Bearer ${token}`;
    }
    return headers;
  },
});