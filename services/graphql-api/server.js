const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { PubSub } = require('graphql-subscriptions');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const pubsub = new PubSub();

// Nama-nama channel untuk subscription
const TASK_UPDATED = 'TASK_UPDATED';
const NOTIFICATION_ADDED = 'NOTIFICATION_ADDED';

// Enable CORS (konfigurasi lama Anda sudah benar)
app.use(cors({
  origin: [
    'http://localhost:3000', // API Gateway
    'http://localhost:3002', // Frontend
    'http://api-gateway:3000', // Docker container name
    'http://frontend-app:3002' // Docker container name
  ],
  credentials: true
}));

// === Database In-Memory BARU (Task Management) ===
// (Ganti dengan database sungguhan di produksi)

// User stub (data 'dummy' user, diasumsikan didapat dari Service A)
let users = [
  { id: '1', name: 'John Doe' },
  { id: '2', name: 'Jane Smith' },
];

// Project (task dikelompokkan dalam project)
let projects = [
  { id: 'p1', name: 'Proyek Website Klien', description: 'Membangun website E-commerce' },
  { id: 'p2', name: 'Aplikasi Mobile', description: 'Membuat aplikasi Task Management' },
];

// Tasks
let tasks = [
  { id: 't1', projectId: 'p1', title: 'Desain Homepage', description: 'Buat mockup Figma', status: 'IN_PROGRESS', assigneeId: '1', createdAt: new Date().toISOString() },
  { id: 't2', projectId: 'p1', title: 'Setup Backend', description: 'Install Express', status: 'DONE', assigneeId: '2', createdAt: new Date().toISOString() },
  { id: 't3', projectId: 'p2', title: 'Implementasi Login', description: 'Gunakan GraphQL', status: 'TODO', assigneeId: '1', createdAt: new Date().toISOString() },
];
// ===============================================

// === Skema GraphQL BARU (Type Definitions) ===
const typeDefs = `
  enum TaskStatus {
    TODO
    IN_PROGRESS
    DONE
    ARCHIVED
  }

  type User {
    id: ID!
    name: String!
    # (data user lain bisa ditambahkan di sini jika perlu)
  }

  type Task {
    id: ID!
    title: String!
    description: String
    status: TaskStatus!
    assignee: User
    project: Project!
    createdAt: String!
  }

  type Project {
    id: ID!
    name: String!
    description: String
    tasks: [Task!]!
  }

  type Notification {
    id: ID!
    message: String!
    timestamp: String!
    userId: ID! # Notifikasi ini untuk siapa
  }

  type Query {
    projects: [Project!]!
    project(id: ID!): Project
    tasksByProject(projectId: ID!): [Task!]!
  }

  type Mutation {
    createTask(projectId: ID!, title: String!, description: String, assigneeId: ID): Task!
    updateTaskStatus(taskId: ID!, status: TaskStatus!): Task!
  }

  type Subscription {
    taskUpdated(projectId: ID!): Task!
    notificationAdded(userId: ID!): Notification!
  }
`;

// === Resolvers BARU ===
const resolvers = {
  Query: {
    projects: () => projects,
    project: (_, { id }) => projects.find(p => p.id === id),
    tasksByProject: (_, { projectId }) => tasks.filter(t => t.projectId === projectId),
  },

  Project: {
    // Resolver untuk 'tasks' di dalam 'Project'
    tasks: (project) => tasks.filter(t => t.projectId === project.id),
  },

  Task: {
    // Resolver untuk 'assignee' di dalam 'Task'
    assignee: (task) => users.find(u => u.id === task.assigneeId),
    // Resolver untuk 'project' di dalam 'Task'
    project: (task) => projects.find(p => p.id === task.projectId),
  },

  Mutation: {
    createTask: (_, { projectId, title, description, assigneeId }, context) => {
      // 'context.userId' didapat dari header yang di-inject Gateway
      console.log(`User ${context.userName} (ID: ${context.userId}) sedang membuat task.`);

      if (!projects.find(p => p.id === projectId)) {
        throw new Error('Project not found');
      }

      const newTask = {
        id: uuidv4(),
        projectId,
        title,
        description,
        status: 'TODO',
        assigneeId,
        createdAt: new Date().toISOString()
      };
      
      tasks.push(newTask);

      // Buat notifikasi untuk user yang di-assign (jika ada)
      if (assigneeId) {
        const notif = {
          id: uuidv4(),
          message: `Anda ditugaskan ke task baru: "${title}" oleh ${context.userName}.`,
          timestamp: new Date().toISOString(),
          userId: assigneeId
        };
        // Publish notifikasi ke channel user tersebut
        pubsub.publish(NOTIFICATION_ADDED, { notificationAdded: notif });
      }

      return newTask;
    },

    updateTaskStatus: (_, { taskId, status }, context) => {
      // 'context.userId' didapat dari header yang di-inject Gateway
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) {
        throw new Error('Task not found');
      }

      tasks[taskIndex].status = status;
      const updatedTask = tasks[taskIndex];

      // Publish update ke subscription 'taskUpdated'
      pubsub.publish(TASK_UPDATED, { taskUpdated: updatedTask });
      
      // Buat notifikasi untuk pembuat task atau assignee
      const notif = {
        id: uuidv4(),
        message: `Task "${updatedTask.title}" diupdate menjadi ${status} oleh ${context.userName}.`,
        timestamp: new Date().toISOString(),
        userId: updatedTask.assigneeId // Kirim notif ke assignee
      };
      pubsub.publish(NOTIFICATION_ADDED, { notificationAdded: notif });
      
      return updatedTask;
    },
  },

  Subscription: {
    taskUpdated: {
      // Filter agar user hanya subscribe ke update di project yang mereka lihat
      subscribe: () => pubsub.asyncIterator([TASK_UPDATED]),
    },
    notificationAdded: {
      // Filter agar user HANYA menerima notifikasi untuk ID mereka
      subscribe: (parent, { userId }, context, info) => {
        // (Di aplikasi nyata, Anda akan cek 'context.userId' vs 'userId' di sini)
        return pubsub.asyncIterator([NOTIFICATION_ADDED]);
      }
    },
  },
};

async function startServer() {
  // Create Apollo Server
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => {
      // === INTEGRASI PENTING (PERSIAPAN BAGIAN 3) ===
      // Membaca header 'kustom' yang akan di-inject oleh API Gateway
      // Service ini TIDAK tahu-menahu soal JWT, ia hanya percaya pada Gateway.
      const userId = req.headers['x-user-id'] || '';
      const userName = req.headers['x-user-name'] || 'Guest';
      const userEmail = req.headers['x-user-email'] || '';
      const userTeams = (req.headers['x-user-teams'] || '').split(',');

      // 'context' ini akan diteruskan ke semua resolver
      return { userId, userName, userEmail, userTeams, req };
    },
    plugins: [
      {
        requestDidStart() {
          return {
            willSendResponse(requestContext) {
              console.log(`GraphQL ${requestContext.request.operationName || 'Anonymous'} operation completed`);
            },
          };
        },
      },
    ],
  });

  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });

  const PORT = process.env.PORT || 4000;
  
  const httpServer = app.listen(PORT, () => {
    console.log(`🚀 Task Service (GraphQL) running on port ${PORT}`);
    console.log(`GraphQL endpoint: http://localhost:${PORT}${server.graphqlPath}`);
    console.log(`Subscriptions ready`);
  });

  // Setup subscriptions
  server.installSubscriptionHandlers(httpServer);

  // ... (Graceful shutdown tetap sama) ...
}

// Health check endpoint (Update nama service)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'task-service-graphql-api',
    timestamp: new Date().toISOString(),
    data: {
      projects: projects.length,
      tasks: tasks.length
    }
  });
});

// ... (Error handling tetap sama) ...
app.use((err, req, res, next) => {
  console.error('GraphQL API Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

startServer().catch(error => {
  console.error('Failed to start GraphQL server:', error);
  process.exit(1);
});