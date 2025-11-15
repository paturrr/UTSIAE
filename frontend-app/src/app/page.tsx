'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, gql, ApolloClient } from '@apollo/client';
import { authApi } from '@/lib/api'; //
import { client } from '@/lib/apollo-client'; // Kita mungkin perlu client untuk reset store

// === Query & Mutation GraphQL BARU ===
// (Berdasarkan skema di Bagian 2)

const GET_PROJECTS_AND_TASKS = gql`
  query GetProjects {
    projects {
      id
      name
      tasks {
        id
        title
        status
        assignee {
          id
          name
        }
      }
    }
  }
`;

const CREATE_TASK = gql`
  mutation CreateTask($projectId: ID!, $title: String!, $description: String) {
    createTask(projectId: $projectId, title: $title, description: $description) {
      id
      title
      status
      project {
        id
      }
    }
  }
`;
// ======================================

/**
 * Komponen Utama
 */
export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Cek token di localStorage saat aplikasi pertama kali dimuat
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setAuthToken(token);
      setIsLoggedIn(true);
    }
  }, []);

  const handleLoginSuccess = (token: string) => {
    localStorage.setItem('authToken', token);
    setAuthToken(token);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setAuthToken(null);
    setIsLoggedIn(false);
    // client.resetStore(); // Reset cache Apollo setelah logout
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      {!isLoggedIn ? (
        <AuthComponent onLoginSuccess={handleLoginSuccess} />
      ) : (
        <DashboardComponent onLogout={handleLogout} />
      )}
    </div>
  );
}

/**
 * Komponen untuk Autentikasi (Login & Register)
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
      // Sukses register, minta user login
      setIsRegistering(false);
      setError('Registration successful! Please log in.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded shadow">
      <h2 className="text-2xl font-bold text-center mb-6">
        {isRegistering ? 'Register' : 'Login'}
      </h2>
      {error && <p className="text-red-500 text-center mb-4">{error}</p>}
      
      <form onSubmit={isRegistering ? handleRegister : handleLogin}>
        {isRegistering && (
          <>
            <input type="text" name="name" placeholder="Name" onChange={handleChange} className="border rounded-md px-3 py-2 w-full mb-4" required />
            <input type="number" name="age" placeholder="Age" onChange={handleChange} className="border rounded-md px-3 py-2 w-full mb-4" required />
          </>
        )}
        <input type="email" name="email" placeholder="Email" onChange={handleChange} className="border rounded-md px-3 py-2 w-full mb-4" required />
        <input type="password" name="password" placeholder="Password" onChange={handleChange} className="border rounded-md px-3 py-2 w-full mb-4" required />
        
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-md w-full hover:bg-blue-600">
          {isRegistering ? 'Register' : 'Login'}
        </button>
      </form>

      <button onClick={() => setIsRegistering(!isRegistering)} className="text-sm text-center w-full mt-4 text-blue-500">
        {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
      </button>
    </div>
  );
}

/**
 * Komponen untuk Dashboard Task Management
 */
function DashboardComponent({ onLogout }: { onLogout: () => void }) {
  const { data, loading, error, refetch } = useQuery(GET_PROJECTS_AND_TASKS);
  const [createTask] = useMutation(CREATE_TASK, {
    // Otomatis refresh query GET_PROJECTS_AND_TASKS setelah mutasi berhasil
    refetchQueries: [GET_PROJECTS_AND_TASKS],
  });

  const [newTask, setNewTask] = useState({ title: '', description: '', projectId: '' });

  const handleTaskChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setNewTask({ ...newTask, [e.target.name]: e.target.value });
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.projectId || !newTask.title) {
      alert('Please select a project and enter a title.');
      return;
    }
    try {
      await createTask({
        variables: {
          projectId: newTask.projectId,
          title: newTask.title,
          description: newTask.description,
        },
      });
      setNewTask({ title: '', description: '', projectId: newTask.projectId }); // Reset form
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  if (loading) return <p>Loading dashboard...</p>;
  if (error) {
    // Jika error (misal token expired), auto-logout
    console.error('GraphQL Error:', error.message);
    onLogout();
    return <p>Error loading data. Logging out...</p>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold text-gray-900">Task Dashboard</h1>
        <button onClick={onLogout} className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600">
          Logout
        </button>
      </div>

      {/* Form Create Task */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Create New Task</h2>
        <form onSubmit={handleCreateTask}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select name="projectId" value={newTask.projectId} onChange={handleTaskChange} className="border rounded-md px-3 py-2" required>
              <option value="">Select Project</option>
              {data?.projects.map((project: any) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <input type="text" name="title" placeholder="Task Title" value={newTask.title} onChange={handleTaskChange} className="border rounded-md px-3 py-2" required />
            <textarea name="description" placeholder="Description" value={newTask.description} onChange={handleTaskChange} className="border rounded-md px-3 py-2 md:col-span-2" />
            <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 md:col-span-1">
              Add Task
            </button>
          </div>
        </form>
      </div>

      {/* Daftar Project dan Task */}
      <div className="space-y-8">
        {data?.projects.map((project: any) => (
          <div key={project.id} className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{project.name}</h2>
            <div className="space-y-4">
              {project.tasks.length === 0 ? (
                <p className="text-gray-500">No tasks in this project yet.</p>
              ) : (
                project.tasks.map((task: any) => (
                  <div key={task.id} className="p-4 border rounded flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-lg">{task.title}</h3>
                      <p className="text-gray-600 text-sm">Assignee: {task.assignee?.name || 'Unassigned'}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      task.status === 'DONE' ? 'bg-green-100 text-green-800' :
                      task.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-200 text-gray-800'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}