// frontend-app/src/app/page.tsx (Full Source)

'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, gql, useSubscription } from '@apollo/client';
import { authApi, userApi } from '@/lib/api'; 

// === Query & Mutation GraphQL (Tasks/Updates) ===
const GET_TASKS = gql`
  query GetTasks {
    tasks {
      id
      title
      description
      owner
      status
      priority
      createdAt
      updates { id, content, author }
    }
  }
`;

const CREATE_TASK = gql`
  mutation CreateTask($title: String!, $description: String!, $priority: String!, $owner: String!) {
    createTask(title: $title, description: $description, priority: $priority, owner: $owner) {
      id
      title
      description
      owner
      status
      priority
    }
  }
`;

const ADD_TASK_UPDATE = gql`
  mutation AddTaskUpdate($taskId: ID!, $content: String!, $author: String!) {
    addTaskUpdate(taskId: $taskId, content: $content, author: $author) {
      id
      content
      author
      taskId
    }
  }
`;

const DELETE_TASK = gql`
  mutation DeleteTask($id: ID!) {
    deleteTask(id: $id)
  }
`;

const UPDATE_TASK = gql`
  mutation UpdateTask($id: ID!, $title: String, $description: String, $status: String, $priority: String) {
    updateTask(id: $id, title: $title, description: $description, status: $status, priority: $priority) {
      id
      title
      description
      owner
      status
      priority
      createdAt
    }
  }
`;

const TASK_CREATED_SUB = gql`
  subscription OnTaskCreated {
    taskCreated {
      id
    }
  }
`;

const TASK_UPDATED_SUB = gql`
  subscription OnTaskUpdated {
    taskUpdated {
      id
    }
  }
`;

const TASK_DELETED_SUB = gql`
  subscription OnTaskDeleted {
    taskDeleted
  }
`;

const UPDATE_ADDED_SUB = gql`
  subscription OnUpdateAdded {
    updateAdded {
      id
      taskId
    }
  }
`;
// ======================================

/**
 * Root Component
 */
export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLoginSuccess = (token: string) => {
    localStorage.setItem('authToken', token);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setIsLoggedIn(false);
  };

  return (
    <div className="min-h-screen relative py-16 px-4 sm:px-8 lg:px-12">
      <div className="absolute inset-0 pointer-events-none">
        <div className="w-72 h-72 bg-indigo-600/20 blur-3xl rounded-full absolute -top-10 -left-10"></div>
        <div className="w-80 h-80 bg-fuchsia-500/20 blur-3xl rounded-full absolute bottom-0 right-0"></div>
      </div>
      <div className="relative">
        {!isLoggedIn ? (
          <AuthComponent onLoginSuccess={handleLoginSuccess} />
        ) : (
          <DashboardComponent onLogout={handleLogout} />
        )}
      </div>
    </div>
  );
}

/**
 * Authentication Component
 */
function AuthComponent({ onLoginSuccess }: { onLoginSuccess: (token: string) => void }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', age: 18 });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await authApi.login({
        email: formData.email,
        password: formData.password,
      });
      onLoginSuccess(response.data.token);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await authApi.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        age: Number(formData.age),
      });
      setIsRegistering(false);
      setError('Registration successful! Please log in.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-gray-900/70 border border-gray-800 rounded-2xl shadow-2xl backdrop-blur-xl p-10">
      <div className="text-center mb-8">
        <p className="text-sm uppercase tracking-[0.3em] text-indigo-400">Microservices Demo</p>
        <h2 className="text-3xl font-semibold mt-3">
          {isRegistering ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          {isRegistering ? 'Start your journey as an admin or user' : 'Sign in to manage tasks'}
        </p>
      </div>
      {error && <p className="text-red-400 text-center mb-4 text-sm">{error}</p>}
      
      <form onSubmit={isRegistering ? handleRegister : handleLogin}>
        {isRegistering && (
          <>
            <input type="text" name="name" placeholder="Full name" onChange={handleChange} className="bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 w-full mb-4 focus:outline-none focus:border-indigo-400" required />
            <input type="number" name="age" placeholder="Age" onChange={handleChange} className="bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 w-full mb-4 focus:outline-none focus:border-indigo-400" required />
          </>
        )}
        <input type="email" name="email" placeholder="Email address" onChange={handleChange} className="bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 w-full mb-4 focus:outline-none focus:border-indigo-400" required />
        <input type="password" name="password" placeholder="Password" onChange={handleChange} className="bg-gray-900/60 border border-gray-700 rounded-lg px-3 py-2 w-full mb-6 focus:outline-none focus:border-indigo-400" required />
        
        <button type="submit" className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold px-4 py-3 rounded-xl shadow-lg shadow-indigo-900/40 transition hover:opacity-90">
          {isRegistering ? 'Register' : 'Login'}
        </button>
      </form>

      <button onClick={() => setIsRegistering(!isRegistering)} className="text-sm text-center w-full mt-6 text-indigo-300 hover:text-white transition">
        {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
      </button>
    </div>
  );
}


// Helper: Decode token from localStorage
function getDecodedToken(): { name: string, role: string } | null {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        name: payload.name || 'User',
        role: payload.role || 'user'
      };
    } catch (e) {
      return null;
    }
}

/**
 * Dashboard Component (Tasks/Updates)
 */
function DashboardComponent({ onLogout }: { onLogout: () => void }) {
  const { data: tasksData, loading: tasksLoading, error: tasksError, refetch: refetchTasks } = useQuery(GET_TASKS);
  useSubscription(TASK_CREATED_SUB, { onData: () => refetchTasks() });
  useSubscription(TASK_UPDATED_SUB, { onData: () => refetchTasks() });
  useSubscription(TASK_DELETED_SUB, { onData: () => refetchTasks() });
  useSubscription(UPDATE_ADDED_SUB, { onData: () => refetchTasks() });
  
  const [createTask] = useMutation(CREATE_TASK, { refetchQueries: [GET_TASKS] });
  const [addTaskUpdate] = useMutation(ADD_TASK_UPDATE, { refetchQueries: [GET_TASKS] });
  const [deleteTask] = useMutation(DELETE_TASK, { refetchQueries: [GET_TASKS] }); 
  const [updateTaskMutation] = useMutation(UPDATE_TASK, { refetchQueries: [GET_TASKS] });

  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'MEDIUM' });
  const [updateInputs, setUpdateInputs] = useState<Record<string, string>>({});
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<{ title: string; description: string; status: string; priority: string }>({ title: '', description: '', status: 'OPEN', priority: 'MEDIUM' });

  const [userData, setUserData] = useState<{ name: string, role: string } | null>(null);
  useEffect(() => {
    setUserData(getDecodedToken());
  }, []);
  const userName = userData?.name || 'User';
  const userRole = userData?.role || 'user';

  const handleTaskChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setNewTask({ ...newTask, [e.target.name]: e.target.value });
  };

  const handleUpdateInputChange = (taskId: string, value: string) => {
    setUpdateInputs(prev => ({ ...prev, [taskId]: value }));
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTask({
        variables: {
          title: newTask.title,
          description: newTask.description,
          priority: newTask.priority,
          owner: userName, 
        },
      });
      setNewTask({ title: '', description: '', priority: 'MEDIUM' }); 
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask({ variables: { id: taskId } });
      } catch (err: any) {
        alert('Failed to delete task: ' + err.message);
      }
    }
  };

  const handleAddUpdate = async (taskId: string) => {
    const content = (updateInputs[taskId] || '').trim();
    if (!content) return;

    try {
      await addTaskUpdate({
        variables: {
          taskId,
          content,
          author: userName,
        },
      });
      setUpdateInputs(prev => ({ ...prev, [taskId]: '' }));
    } catch (err: any) {
      alert('Failed to add task update: ' + (err.message || 'Unknown error'));
    }
  };

  const startEditingTask = (task: any) => {
    setEditingTaskId(task.id);
    setEditingData({ title: task.title, description: task.description, status: task.status, priority: task.priority });
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditingData({ title: '', description: '', status: 'OPEN', priority: 'MEDIUM' });
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setEditingData({ ...editingData, [e.target.name]: e.target.value });
  };

  const handleUpdateTask = async (taskId: string) => {
    if (!editingData.title.trim() || !editingData.description.trim()) {
      alert('Title and description cannot be empty.');
      return;
    }
    try {
      await updateTaskMutation({
        variables: {
          id: taskId,
          title: editingData.title,
          description: editingData.description,
          status: editingData.status,
          priority: editingData.priority,
        },
      });
      cancelEditing();
    } catch (err: any) {
      alert('Failed to update task: ' + (err.message || 'Unknown error'));
    }
  };

  if (tasksLoading) return <p>Loading dashboard...</p>;
  if (tasksError) {
    console.error('GraphQL Error:', tasksError.message);
    onLogout();
    return <p>Error loading data. Logging out...</p>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <div className="bg-gradient-to-r from-indigo-600/70 via-purple-600/70 to-pink-500/70 border border-white/10 rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-white/70">Dashboard</p>
            <h1 className="text-4xl font-semibold mt-2">Hi, {userName}</h1>
            <p className="text-white/80 mt-2 text-sm">Your role: <span className="font-semibold capitalize">{userRole}</span></p>
          </div>
          <button onClick={onLogout} className="self-start md:self-auto bg-white/20 text-white px-6 py-3 rounded-2xl backdrop-blur transition hover:bg-white/30">
            Logout
          </button>
        </div>
      </div>

      <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-2xl font-semibold mb-4">Create New Task</h2>
        <form onSubmit={handleCreateTask}>
          <div className="grid grid-cols-1 gap-4">
            <input type="text" name="title" placeholder="Task title" value={newTask.title} onChange={handleTaskChange} className="bg-gray-900/60 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-400" required />
            <textarea name="description" placeholder="Task description" value={newTask.description} onChange={handleTaskChange} className="bg-gray-900/60 border border-gray-700 rounded-lg px-4 py-3 h-28 focus:outline-none focus:border-indigo-400" required />
            <select name="priority" value={newTask.priority} onChange={handleTaskChange} className="bg-gray-900/60 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-400">
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
            <button type="submit" className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-5 py-3 rounded-xl font-medium shadow-lg shadow-indigo-900/40 hover:opacity-90 transition">
              Submit Task
            </button>
          </div>
        </form>
      </div>

      {/* === PANEL ADMIN === */}
      {userRole === 'admin' && (
        <AdminPanel />
      )}
      {/* ========================= */}

      {/* Daftar Tasks */}
      <div className="space-y-8">
        {tasksData?.tasks.map((task: any) => (
          <div key={task.id} className="bg-gray-900/70 border border-gray-800 rounded-3xl p-6 shadow-xl hover:border-indigo-500/40 transition">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-400">Task</p>
                <h2 className="text-2xl font-bold text-white mt-1">{task.title}</h2>
                <p className="text-sm text-gray-400 mt-1">Owner: {task.owner} — {new Date(task.createdAt).toLocaleDateString()}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200">{task.status}</span>
                  <span className="text-xs px-3 py-1 rounded-full bg-pink-500/20 text-pink-200">{task.priority}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {task.owner === userName && (
                  <button
                    onClick={() => editingTaskId === task.id ? cancelEditing() : startEditingTask(task)}
                    className="text-sm bg-indigo-500/20 text-indigo-200 px-3 py-1 rounded-full hover:bg-indigo-500/30"
                  >
                    {editingTaskId === task.id ? 'Cancel' : 'Edit'}
                  </button>
                )}
                {(userRole === 'admin' || task.owner === userName) && (
                  <button 
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-sm bg-red-500/20 text-red-300 px-3 py-1 rounded-full hover:bg-red-500/30"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {editingTaskId === task.id ? (
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  name="title"
                  value={editingData.title}
                  onChange={handleEditInputChange}
                  className="w-full bg-gray-900/60 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-400"
                />
                <textarea
                  name="description"
                  value={editingData.description}
                  onChange={handleEditInputChange}
                  className="w-full bg-gray-900/60 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-400"
                  rows={4}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select name="status" value={editingData.status} onChange={handleEditInputChange} className="bg-gray-900/60 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-400">
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                  <select name="priority" value={editingData.priority} onChange={handleEditInputChange} className="bg-gray-900/60 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-400">
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleUpdateTask(task.id)}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="text-sm text-gray-400 hover:text-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-300 mt-4 leading-relaxed">{task.description}</p>
            )}
            
            {/* Bagian Update */}
            <div className="mt-6 border-t border-gray-800 pt-4">
              <h4 className="text-lg font-semibold mb-3 text-white">Updates ({task.updates.length})</h4>
              <div className="space-y-3">
                {task.updates.map((update: any) => (
                  <div key={update.id} className="text-sm bg-gray-800/80 border border-gray-700 rounded-2xl p-3">
                    <strong className="text-indigo-300">{update.author}</strong>
                    <p className="text-gray-300 mt-1">{update.content}</p>
                  </div>
                ))}
                {task.updates.length === 0 && <p className="text-sm text-gray-500">No updates yet.</p>}
              </div>
              <div className="mt-4 space-y-2">
                <textarea
                  className="w-full bg-gray-900/60 border border-gray-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400"
                  placeholder="Write a task update..."
                  value={updateInputs[task.id] || ''}
                  onChange={(e) => handleUpdateInputChange(task.id, e.target.value)}
                />
                <button
                  onClick={() => handleAddUpdate(task.id)}
                  disabled={!(updateInputs[task.id] || '').trim()}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Add Update
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// === Admin Panel Component ===
function AdminPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await userApi.getUsers(); 
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('WARNING: Are you sure you want to delete this user?')) {
      try {
        await userApi.deleteUser(userId); 
        fetchUsers(); 
      } catch (err: any) {
        alert('Failed to delete user: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      await userApi.changeUserRole(userId, newRole); 
      fetchUsers(); 
    } catch (err: any) {
      alert('Failed to change role: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) return <p className="text-gray-400">Loading admin panel...</p>;

  return (
    <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 mb-8 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-indigo-400">Admin</p>
          <h2 className="text-2xl font-semibold mt-2">User Management Panel</h2>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-800 text-sm">
          <thead>
            <tr className="text-left text-gray-400 uppercase text-xs tracking-wider">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 text-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-4">{user.name}</td>
                <td className="px-4 py-4">{user.email}</td>
                <td className="px-4 py-4 capitalize">{user.role}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-4">
                    {user.role === 'user' ? (
                      <button onClick={() => handleChangeRole(user.id, 'admin')} className="text-emerald-400 hover:text-emerald-300">
                        Promote to Admin
                      </button>
                    ) : (
                      <button onClick={() => handleChangeRole(user.id, 'user')} className="text-yellow-300 hover:text-yellow-200">
                        Set as User
                      </button>
                    )}
                    <button onClick={() => handleDeleteUser(user.id)} className="text-red-400 hover:text-red-300 ml-auto">
                      Remove User
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
