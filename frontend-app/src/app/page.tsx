// frontend-app/src/app/page.tsx (Kode Lengkap)

'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { authApi, userApi } from '@/lib/api'; 

// === Query & Mutation GraphQL (Posts/Comments) ===
const GET_POSTS = gql`
  query GetPosts {
    posts {
      id
      title
      content
      author
      createdAt
      comments { id, content, author }
    }
  }
`;

const CREATE_POST = gql`
  mutation CreatePost($title: String!, $content: String!, $author: String!) {
    createPost(title: $title, content: $content, author: $author) {
      id, title, content, author
    }
  }
`;

const CREATE_COMMENT = gql`
  mutation CreateComment($postId: ID!, $content: String!, $author: String!) {
    createComment(postId: $postId, content: $content, author: $author) {
      id, content, author, postId
    }
  }
`;

const DELETE_POST = gql`
  mutation DeletePost($id: ID!) {
    deletePost(id: $id)
  }
`;

const UPDATE_POST = gql`
  mutation UpdatePost($id: ID!, $title: String, $content: String) {
    updatePost(id: $id, title: $title, content: $content) {
      id
      title
      content
      author
      createdAt
    }
  }
`;
// ======================================

/**
 * Komponen Utama
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
 * Komponen Autentikasi (LENGKAP)
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
          {isRegistering ? 'Mulai perjalanan Anda sebagai admin atau user' : 'Silakan login untuk mengelola konten'}
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


// FUNGSI HELPER: Decode Token
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
 * Komponen Dashboard (Posts/Comments) - LENGKAP
 */
function DashboardComponent({ onLogout }: { onLogout: () => void }) {
  const { data: postsData, loading: postsLoading, error: postsError, refetch: refetchPosts } = useQuery(GET_POSTS);
  
  const [createPost] = useMutation(CREATE_POST, { refetchQueries: [GET_POSTS] });
  const [createComment] = useMutation(CREATE_COMMENT, { refetchQueries: [GET_POSTS] });
  const [deletePost] = useMutation(DELETE_POST, { refetchQueries: [GET_POSTS] }); 
  const [updatePostMutation] = useMutation(UPDATE_POST, { refetchQueries: [GET_POSTS] });

  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<{ title: string; content: string }>({ title: '', content: '' });

  const [userData, setUserData] = useState<{ name: string, role: string } | null>(null);
  useEffect(() => {
    setUserData(getDecodedToken());
  }, []);
  const userName = userData?.name || 'User';
  const userRole = userData?.role || 'user';

  const handlePostChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setNewPost({ ...newPost, [e.target.name]: e.target.value });
  };

  const handleCommentInputChange = (postId: string, value: string) => {
    setCommentInputs(prev => ({ ...prev, [postId]: value }));
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPost({
        variables: {
          title: newPost.title,
          content: newPost.content,
          author: userName, 
        },
      });
      setNewPost({ title: '', content: '' }); 
    } catch (err) {
      console.error('Failed to create post:', err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (window.confirm('Anda yakin ingin menghapus post ini?')) {
      try {
        await deletePost({ variables: { id: postId } });
      } catch (err: any) {
        alert('Gagal menghapus post: ' + err.message);
      }
    }
  };

  const handleCreateComment = async (postId: string) => {
    const content = (commentInputs[postId] || '').trim();
    if (!content) return;

    try {
      await createComment({
        variables: {
          postId,
          content,
          author: userName,
        },
      });
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    } catch (err: any) {
      alert('Gagal menambahkan komentar: ' + (err.message || 'Unknown error'));
    }
  };

  const startEditingPost = (post: any) => {
    setEditingPostId(post.id);
    setEditingData({ title: post.title, content: post.content });
  };

  const cancelEditing = () => {
    setEditingPostId(null);
    setEditingData({ title: '', content: '' });
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditingData({ ...editingData, [e.target.name]: e.target.value });
  };

  const handleUpdatePost = async (postId: string) => {
    if (!editingData.title.trim() || !editingData.content.trim()) {
      alert('Judul dan konten tidak boleh kosong.');
      return;
    }
    try {
      await updatePostMutation({
        variables: {
          id: postId,
          title: editingData.title,
          content: editingData.content,
        },
      });
      cancelEditing();
    } catch (err: any) {
      alert('Gagal memperbarui post: ' + (err.message || 'Unknown error'));
    }
  };

  if (postsLoading) return <p>Loading dashboard...</p>;
  if (postsError) {
    console.error('GraphQL Error:', postsError.message);
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
            <p className="text-white/80 mt-2 text-sm">Peran Anda: <span className="font-semibold capitalize">{userRole}</span></p>
          </div>
          <button onClick={onLogout} className="self-start md:self-auto bg-white/20 text-white px-6 py-3 rounded-2xl backdrop-blur transition hover:bg-white/30">
            Logout
          </button>
        </div>
      </div>

      <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-2xl font-semibold mb-4">Create New Post</h2>
        <form onSubmit={handleCreatePost}>
          <div className="grid grid-cols-1 gap-4">
            <input type="text" name="title" placeholder="Judul Post" value={newPost.title} onChange={handlePostChange} className="bg-gray-900/60 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-400" required />
            <textarea name="content" placeholder="Apa yang ingin Anda bagikan?" value={newPost.content} onChange={handlePostChange} className="bg-gray-900/60 border border-gray-700 rounded-lg px-4 py-3 h-28 focus:outline-none focus:border-indigo-400" required />
            <button type="submit" className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-5 py-3 rounded-xl font-medium shadow-lg shadow-indigo-900/40 hover:opacity-90 transition">
              Submit Post
            </button>
          </div>
        </form>
      </div>

      {/* === PANEL ADMIN === */}
      {userRole === 'admin' && (
        <AdminPanel />
      )}
      {/* ========================= */}

      {/* Daftar Posts (List yang hilang) */}
      <div className="space-y-8">
        {postsData?.posts.map((post: any) => (
          <div key={post.id} className="bg-gray-900/70 border border-gray-800 rounded-3xl p-6 shadow-xl hover:border-indigo-500/40 transition">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-indigo-400">Postingan</p>
                <h2 className="text-2xl font-bold text-white mt-1">{post.title}</h2>
                <p className="text-sm text-gray-400 mt-1">by {post.author} — {new Date(post.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                {post.author === userName && (
                  <button
                    onClick={() => editingPostId === post.id ? cancelEditing() : startEditingPost(post)}
                    className="text-sm bg-indigo-500/20 text-indigo-200 px-3 py-1 rounded-full hover:bg-indigo-500/30"
                  >
                    {editingPostId === post.id ? 'Batal' : 'Edit'}
                  </button>
                )}
                {(userRole === 'admin' || post.author === userName) && (
                  <button 
                    onClick={() => handleDeletePost(post.id)}
                    className="text-sm bg-red-500/20 text-red-300 px-3 py-1 rounded-full hover:bg-red-500/30"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>

            {editingPostId === post.id ? (
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  name="title"
                  value={editingData.title}
                  onChange={handleEditInputChange}
                  className="w-full bg-gray-900/60 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-400"
                />
                <textarea
                  name="content"
                  value={editingData.content}
                  onChange={handleEditInputChange}
                  className="w-full bg-gray-900/60 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-400"
                  rows={4}
                />
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleUpdatePost(post.id)}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90"
                  >
                    Simpan Perubahan
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="text-sm text-gray-400 hover:text-gray-200"
                  >
                    Batalkan
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-300 mt-4 leading-relaxed">{post.content}</p>
            )}
            
            {/* Bagian Komentar */}
            <div className="mt-6 border-t border-gray-800 pt-4">
              <h4 className="text-lg font-semibold mb-3 text-white">Comments ({post.comments.length})</h4>
              <div className="space-y-3">
                {post.comments.map((comment: any) => (
                  <div key={comment.id} className="text-sm bg-gray-800/80 border border-gray-700 rounded-2xl p-3">
                    <strong className="text-indigo-300">{comment.author}</strong>
                    <p className="text-gray-300 mt-1">{comment.content}</p>
                  </div>
                ))}
                {post.comments.length === 0 && <p className="text-sm text-gray-500">No comments yet.</p>}
              </div>
              <div className="mt-4 space-y-2">
                <textarea
                  className="w-full bg-gray-900/60 border border-gray-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400"
                  placeholder="Tulis komentar..."
                  value={commentInputs[post.id] || ''}
                  onChange={(e) => handleCommentInputChange(post.id, e.target.value)}
                />
                <button
                  onClick={() => handleCreateComment(post.id)}
                  disabled={!(commentInputs[post.id] || '').trim()}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Tambah Komentar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// === KOMPONEN PANEL ADMIN ===
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
      console.error("Gagal mengambil daftar user:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('PERINGATAN: Anda yakin ingin menghapus user ini?')) {
      try {
        await userApi.deleteUser(userId); 
        fetchUsers(); 
      } catch (err: any) {
        alert('Gagal menghapus user: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      await userApi.changeUserRole(userId, newRole); 
      fetchUsers(); 
    } catch (err: any) {
      alert('Gagal mengubah role: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) return <p className="text-gray-400">Memuat panel admin...</p>;

  return (
    <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 mb-8 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-indigo-400">Admin</p>
          <h2 className="text-2xl font-semibold mt-2">Panel Manajemen User</h2>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-800 text-sm">
          <thead>
            <tr className="text-left text-gray-400 uppercase text-xs tracking-wider">
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Aksi</th>
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
                        Jadikan Admin
                      </button>
                    ) : (
                      <button onClick={() => handleChangeRole(user.id, 'user')} className="text-yellow-300 hover:text-yellow-200">
                        Jadikan User
                      </button>
                    )}
                    <button onClick={() => handleDeleteUser(user.id)} className="text-red-400 hover:text-red-300 ml-auto">
                      Hapus User
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
