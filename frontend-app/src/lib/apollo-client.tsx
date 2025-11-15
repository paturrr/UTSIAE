'use client';

import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:3000/graphql',
});

// === AUTH HEADER SETUP ===
// Inject the JWT from localStorage on every GraphQL request
const authLink = setContext((_, { headers }) => {
  // Read the token from localStorage (same logic as api.ts)
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  
  return {
    headers: {
      ...headers,
      // Add the authorization header when a token is present
      authorization: token ? `Bearer ${token}` : "",
    }
  }
});
// =========================

const client = new ApolloClient({
  link: authLink.concat(httpLink), // Ensure the authLink runs before httpLink
  cache: new InMemoryCache(),
  connectToDevTools: true,
});

export function ApolloWrapper({ children }: { children: React.ReactNode }) {
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
