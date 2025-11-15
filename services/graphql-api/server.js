// services/graphql-api/server.js (Kode Lengkap & Stabil)

const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { PubSub } = require('graphql-subscriptions');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const axios = require('axios');
const jwt = require('jsonwebtoken');

// --- Impor untuk FIX Subscription ---
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const { makeExecutableSchema } = require('@graphql-tools/schema');
// ------------------------------------

const AUTH_PUBLIC_KEY_URL = process.env.AUTH_PUBLIC_KEY_URL;
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;
const PUBLIC_KEY_ENDPOINTS = [
  AUTH_PUBLIC_KEY_URL,
  AUTH_SERVICE_URL ? `${AUTH_SERVICE_URL.replace(/\/$/, '')}/api/auth/public-key` : null,
  'http://rest-api:3001/api/auth/public-key',
  'http://localhost:3001/api/auth/public-key'
].filter(Boolean);

let cachedAuthPublicKey = '';

async function getAuthPublicKey() {
  if (cachedAuthPublicKey) {
    return cachedAuthPublicKey;
  }

  for (const endpoint of PUBLIC_KEY_ENDPOINTS) {
    try {
      const response = await axios.get(endpoint);
      if (response.data) {
        cachedAuthPublicKey = response.data;
        console.log(`GraphQL API cached auth public key from ${endpoint}`);
        return cachedAuthPublicKey;
      }
    } catch (error) {
      console.warn(`GraphQL API failed to fetch public key from ${endpoint}: ${error.message}`);
    }
  }

  return '';
}

async function decodeToken(token) {
  const publicKey = await getAuthPublicKey();
  if (!publicKey) {
    throw new Error('Public key unavailable for token verification');
  }

  return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
}

getAuthPublicKey().catch(error => {
  console.warn('GraphQL API initial public key fetch failed:', error.message);
});

const app = express();
const pubsub = new PubSub();

const TASK_CREATED = 'TASK_CREATED';
const TASK_UPDATED = 'TASK_UPDATED';
const TASK_DELETED = 'TASK_DELETED';
const UPDATE_ADDED = 'UPDATE_ADDED';

app.use(cors({
  origin: [
    'http://localhost:3000', 'http://localhost:3002',
    'http://api-gateway:3000', 'http://frontend-app:3002'
  ],
  credentials: true
}));

// === Database In-Memory (Tasks/Updates) ===
let tasks = [
  { id: '1', title: 'Prepare Sprint Planning', description: 'Draft the agenda and collect requirements for sprint planning.', owner: 'John Doe', status: 'OPEN', priority: 'HIGH', createdAt: new Date().toISOString() },
  { id: '2', title: 'Implement Authentication', description: 'Connect frontend auth flow to REST user service.', owner: 'Jane Smith', status: 'IN_PROGRESS', priority: 'MEDIUM', createdAt: new Date().toISOString() }
];
let taskUpdates = [
  { id: '1', taskId: '2', content: 'JWT gateway verification completed.', author: 'Jane Smith', createdAt: new Date().toISOString() }
];
// ===========================================

// === Skema GraphQL (Type Definitions) ===
const typeDefs = `
  type Task {
    id: ID!
    title: String!
    description: String!
    owner: String!
    status: String!
    priority: String!
    createdAt: String!
    updates: [TaskUpdate!]!
  }
  type TaskUpdate {
    id: ID!
    taskId: ID!
    content: String!
    author: String!
    createdAt: String!
  }
  type Query {
    tasks: [Task!]!
    task(id: ID!): Task
    taskUpdates(taskId: ID!): [TaskUpdate!]!
  }
  type Mutation {
    createTask(title: String!, description: String!, priority: String!, owner: String!): Task!
    updateTask(id: ID!, title: String, description: String, status: String, priority: String): Task!
    deleteTask(id: ID!): Boolean!
    addTaskUpdate(taskId: ID!, content: String!, author: String!): TaskUpdate!
    deleteTaskUpdate(id: ID!): Boolean!
  }
  type Subscription {
    taskCreated: Task!
    taskUpdated: Task!
    taskDeleted: ID!
    updateAdded: TaskUpdate!
  }
`;

// === Resolvers ASLI (dengan logika Role Admin) ===
const resolvers = {
  Query: {
    tasks: () => tasks,
    task: (_, { id }) => tasks.find(task => task.id === id),
    taskUpdates: (_, { taskId }) => taskUpdates.filter(update => update.taskId === taskId)
  },
  Task: {
    updates: (parent) => taskUpdates.filter(update => update.taskId === parent.id)
  },

  Mutation: {
    createTask: (_, { title, description, priority, owner }, context) => {
      if (!context.userId) { throw new Error('Authentication required to create a task.'); }
      const newTask = {
        id: uuidv4(),
        title,
        description,
        owner,
        status: 'OPEN',
        priority,
        createdAt: new Date().toISOString()
      };
      tasks.push(newTask);
      pubsub.publish(TASK_CREATED, { taskCreated: newTask });
      return newTask;
    },

    updateTask: (_, { id, title, description, status, priority }, context) => {
      if (!context.userId) {
        throw new Error('Authentication required to update a task.');
      }
      const taskIndex = tasks.findIndex(task => task.id === id);
      if (taskIndex === -1) { throw new Error('Task not found'); }
      const task = tasks[taskIndex];
      if (task.owner !== context.userName) {
        throw new Error('Only the creator can edit this task.');
      }
      const updatedTask = {
        ...task,
        ...(title && { title }),
        ...(description && { description }),
        ...(status && { status }),
        ...(priority && { priority })
      };
      tasks[taskIndex] = updatedTask;
      pubsub.publish(TASK_UPDATED, { taskUpdated: updatedTask });
      return updatedTask;
    },

    deleteTask: (_, { id }, context) => {
      const taskIndex = tasks.findIndex(task => task.id === id);
      if (taskIndex === -1) { return false; }
      const task = tasks[taskIndex];
      
      if (context.userRole === 'admin' || task.owner === context.userName) {
        taskUpdates = taskUpdates.filter(update => update.taskId !== id);
        tasks.splice(taskIndex, 1);
        pubsub.publish(TASK_DELETED, { taskDeleted: id });
        return true;
      } else {
        throw new Error('You are not authorized to delete this task.');
      }
    },

    addTaskUpdate: (_, { taskId, content, author }, context) => {
      if (!context.userId) { throw new Error('Authentication required to add updates.'); }

      const task = tasks.find(t => t.id === taskId);
      if (!task) { throw new Error('Task not found'); }
      const newUpdate = { id: uuidv4(), taskId, content, author, createdAt: new Date().toISOString() };
      taskUpdates.push(newUpdate);
      pubsub.publish(UPDATE_ADDED, { updateAdded: newUpdate });
      return newUpdate;
    },

    deleteTaskUpdate: (_, { id }) => {
      const updateIndex = taskUpdates.findIndex(update => update.id === id);
      if (updateIndex === -1) { return false; }
      taskUpdates.splice(updateIndex, 1);
      return true;
    },
  },

  Subscription: {
    taskCreated: { subscribe: () => pubsub.asyncIterator([TASK_CREATED]) },
    taskUpdated: { subscribe: () => pubsub.asyncIterator([TASK_UPDATED]) },
    taskDeleted: { subscribe: () => pubsub.asyncIterator([TASK_DELETED]) },
    updateAdded: { subscribe: () => pubsub.asyncIterator([UPDATE_ADDED]) },
  },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

async function startServer() {
  const server = new ApolloServer({
    schema,
    context: async ({ req }) => {
      // Membaca header yang disuntikkan Gateway, termasuk fallback decode token langsung
      let userId = req.headers['x-user-id'] || '';
      let userName = req.headers['x-user-name'] || 'Guest';
      let userEmail = req.headers['x-user-email'] || '';
      const headerTeams = req.headers['x-user-teams'];
      let userTeams = headerTeams ? headerTeams.split(',').filter(Boolean) : [];
      let userRole = req.headers['x-user-role'] || 'user';

      if (!userId) {
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
        if (token) {
          try {
            const decoded = await decodeToken(token);
            if (decoded) {
              userId = decoded.userId || userId;
              userName = decoded.name || userName;
              userEmail = decoded.email || userEmail;
              userTeams = Array.isArray(decoded.teams) ? decoded.teams : userTeams;
              userRole = decoded.role || userRole;
            }
          } catch (error) {
            console.warn('GraphQL API token verification fallback failed:', error.message);
          }
        }
      }

      return { userId, userName, userEmail, userTeams, userRole, req };
    },
    // ... (plugins) ...
  });

  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });

  const PORT = process.env.PORT || 4000;
  
  // FIX: Setup Subscription yang Benar
  const httpServer = createServer(app);
  const wsServer = new WebSocketServer({ server: httpServer, path: server.graphqlPath });
  useServer({ schema }, wsServer);
  httpServer.listen(PORT, () => {
    console.log(`🚀 Post/Comment Service (GraphQL) running on port ${PORT}`);
    console.log(`GraphQL endpoint: http://localhost:${PORT}${server.graphqlPath}`);
    console.log(`Subscriptions ready at ws://localhost:${PORT}${server.graphqlPath}`);
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'post-comment-graphql-api',
    timestamp: new Date().toISOString(),
    data: {
      posts: posts.length,
      comments: comments.length
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('GraphQL API Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

startServer().catch(error => {
  console.error('Failed to start GraphQL server:', error);
  process.exit(1);
});
