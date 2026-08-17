'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../../lib/api';
import {
  MessageSquare,
  MessageCircle,
  ShoppingBag,
  ExternalLink,
  Calendar,
  Grid,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { InstagramIcon, FacebookIcon } from '../../components/SocialIcons';

type ToastType = 'success' | 'error' | null;

interface Product {
  _id: string;
  name: string;
}

interface Post {
  _id: string;
  image: string;
  caption: string;
  date: string;
  channel: 'instagram' | 'facebook';
  commentsCount: number;
  queriesCount: number;
  productId?: Product;
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [channelFilter, setChannelFilter] = useState('');
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      let url = '/posts?';
      if (channelFilter) url += `channel=${channelFilter}&`;
      const res = await api.get(url);
      setPosts(res.data);
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.post('/meta/sync/posts');
      const { synced, mode } = res.data;
      const modeLabel = mode === 'real' ? 'desde Meta' : 'simulado';
      showToast('success', `✓ ${synced} publicaciones sincronizadas ${modeLabel}`);
      await fetchPosts();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Error al sincronizar publicaciones';
      showToast('error', msg);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPosts();
    }, 0);
    return () => clearTimeout(timer);
  }, [channelFilter]);

  return (
    <div className="p-6 space-y-6">
      {/* Toast — rendered at document.body via portal to escape layout stacking context */}
      {toast && typeof window !== 'undefined' && createPortal(
        <div
          className={`fixed top-5 right-5 z-[9999] flex items-center space-x-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {toast.type === 'success'
            ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
          <span>{toast.message}</span>
        </div>,
        document.body
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Publicaciones</h2>
          <p className="text-xs text-slate-400">Monitoreá las publicaciones de tus redes vinculadas</p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Sync button */}
          <button
            id="btn-sync-posts"
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl px-3 py-1.5 shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Sincronizando...' : 'Sincronizar desde Meta'}</span>
          </button>

          {/* Filter */}
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600 bg-white border border-slate-100 rounded-xl px-2.5 py-1.5 shadow-sm">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="">Todos los canales</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of posts */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm animate-pulse h-80 space-y-4">
              <div className="h-44 bg-slate-100 w-full"></div>
              <div className="p-4 space-y-3">
                <div className="h-3 bg-slate-100 rounded w-full"></div>
                <div className="h-3 bg-slate-100 rounded w-5/6"></div>
                <div className="flex justify-between pt-2">
                  <div className="h-3 w-10 bg-slate-100 rounded"></div>
                  <div className="h-3 w-10 bg-slate-100 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white border border-slate-100 p-8 rounded-2xl text-center text-slate-400 space-y-3">
          <Grid className="h-10 w-10 text-slate-300 mx-auto" />
          <h4 className="font-semibold text-xs">No hay publicaciones vinculadas</h4>
          <p className="text-[10px]">Vinculá tus canales en Configuración o importa productos desde Meta para sincronizar feeds.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {posts.map((post) => {
            const ChannelIcon = post.channel === 'instagram' ? InstagramIcon : FacebookIcon;
            return (
              <div
                key={post._id}
                className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                {/* Post image & Channel badge */}
                <div className="relative h-44 bg-slate-900 overflow-hidden group">
                  <img
                    src={post.image}
                    alt="Post"
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className={`absolute top-3 left-3 p-1.5 rounded-xl text-white shadow-md ${
                    post.channel === 'instagram' ? 'bg-pink-600' : 'bg-blue-600'
                  }`}>
                    <ChannelIcon className="h-4.5 w-4.5" />
                  </div>
                </div>

                {/* Content details */}
                <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    {/* Timestamp */}
                    <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(post.date).toLocaleDateString('es-UY', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}</span>
                    </div>

                    {/* Caption */}
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {post.caption}
                    </p>
                  </div>

                  <div className="space-y-3.5 pt-3 border-t border-slate-50">
                    {/* Stats metrics */}
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                      <div className="flex items-center space-x-1" title="Comentarios">
                        <MessageCircle className="h-3.5 w-3.5 text-slate-400" />
                        <span>{post.commentsCount} comentarios</span>
                      </div>
                      <div className="flex items-center space-x-1" title="Consultas generadas">
                        <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
                        <span className="text-indigo-600">{post.queriesCount} consultas</span>
                      </div>
                    </div>

                    {/* Linked product */}
                    {post.productId && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-[10px] text-slate-600 font-semibold">
                        <div className="flex items-center space-x-1.5">
                          <ShoppingBag className="h-3.5 w-3.5 text-slate-400" />
                          <span className="truncate max-w-[120px]">{post.productId.name}</span>
                        </div>
                        <a href={`/products`} className="text-indigo-600 hover:text-indigo-700 flex items-center space-x-0.5">
                          <span>Ver</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
