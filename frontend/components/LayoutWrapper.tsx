'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../app/providers';
import Link from 'next/link';
import {
  Home,
  Inbox,
  ShoppingBag,
  Share2,
  BarChart3,
  Users,
  DollarSign,
  Bot,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  ChevronDown
} from 'lucide-react';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, store, loading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const isAuthPage = pathname === '/login' || pathname === '/register';

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-500 animate-pulse">Cargando SocialFlow...</p>
        </div>
      </div>
    );
  }

  // If we are on login/register, don't show the layout
  if (isAuthPage) {
    return <>{children}</>;
  }

  const navItems = [
    { name: 'Inicio', href: '/dashboard', icon: Home },
    { name: 'Inbox', href: '/inbox', icon: Inbox, countKey: 'conversations' },
    { name: 'Productos', href: '/products', icon: ShoppingBag },
/*     { name: 'Publicaciones', href: '/posts', icon: Share2 }, */
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Clientes', href: '/customers', icon: Users },
    { name: 'Ventas', href: '/sales', icon: DollarSign },
    { name: 'Asistente IA', href: '/ai', icon: Bot, highlight: true },
    { name: 'Configuración', href: '/settings', icon: Settings },
  ];

  // Helper to map pathname to page title
  const getPageTitle = () => {
    switch (pathname) {
      case '/dashboard': return 'Inicio';
      case '/inbox': return 'Inbox';
      case '/products': return 'Productos';
      case '/posts': return 'Publicaciones';
      case '/analytics': return 'Analytics';
      case '/customers': return 'Clientes';
      case '/sales': return 'Ventas';
      case '/ai': return 'Asistente IA';
      case '/settings': return 'Configuración';
      default: return 'SocialFlow';
    }
  };

  const getBreadcrumbs = () => {
    const title = getPageTitle();
    return (
      <div className="flex items-center space-x-2 text-xs text-slate-400">
        <span className="hover:text-slate-600 cursor-pointer" onClick={() => router.push('/dashboard')}>SocialFlow</span>
        <span>/</span>
        <span className="text-slate-600 font-medium">{title}</span>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* SIDEBAR FOR DESKTOP */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-white border-r border-slate-100 h-full justify-between">
        <div className="flex flex-col overflow-y-auto pt-6 px-4 space-y-7">
          {/* Logo */}
          <div className="flex items-center space-x-3 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
              <Bot className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Social<span className="text-indigo-600">Flow</span>
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-250 group ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-4.5 w-4.5 transition-colors ${
                      isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`} />
                    <span>{item.name}</span>
                  </div>
                  {item.highlight && (
                    <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-ping"></span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile / Store Info */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-4">
          {/* Store Selector */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors">
            <div className="flex items-center space-x-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs">
                {store?.name?.charAt(0) || 'T'}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-800">{store?.name || 'Tienda Urbana'}</span>
                <span className="text-[10px] text-indigo-600 font-medium">{store?.plan || 'Plan Pro'}</span>
              </div>
            </div>
          </div>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex w-full items-center justify-between p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center space-x-2.5">
                <img
                  src={store?.logo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150'}
                  alt={user?.name}
                  className="h-8.5 w-8.5 rounded-full object-cover border border-slate-200"
                />
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-800 leading-none">{user?.name || 'Camila Rodríguez'}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">Administrador</span>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {userDropdownOpen && (
              <div className="absolute bottom-full left-0 w-full mb-2 bg-white border border-slate-100 rounded-xl shadow-lg p-1 z-50">
                <button
                  onClick={logout}
                  className="flex w-full items-center space-x-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER & NAVIGATION */}
      <div className="flex flex-col flex-1 overflow-hidden h-full">
        {/* Top Header */}
        <header className="flex h-16 w-full items-center justify-between bg-white border-b border-slate-100 px-4 md:px-6 z-20">
          <div className="flex items-center space-x-3">
            {/* Hamburger button for mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-lg"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden md:flex flex-col">
              <h1 className="text-base font-semibold text-slate-900">{getPageTitle()}</h1>
              {getBreadcrumbs()}
            </div>
            <div className="flex md:hidden items-center space-x-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <Bot className="h-4.5 w-4.5" />
              </div>
              <span className="text-sm font-bold text-slate-900">SocialFlow</span>
            </div>
          </div>

          {/* Search, Notifications & Avatar */}
          <div className="flex items-center space-x-4">
            {/* Search Input */}
            <div className="hidden sm:flex items-center relative">
              <Search className="absolute left-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar..."
                className="w-48 xl:w-64 pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
              />
            </div>

            {/* Notifications Button */}
            <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
            </button>

            {/* Profile Avatar */}
            <div className="h-8.5 w-8.5 rounded-full overflow-hidden border border-slate-200 cursor-pointer shadow-sm">
              <img
                src={store?.logo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150'}
                alt={user?.name}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </header>

        {/* MAIN CONTAINER */}
        <main className="flex-1 overflow-y-auto focus:outline-none z-10">
          {children}
        </main>
      </div>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          ></div>

          {/* Drawer Menu */}
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white pt-5 pb-4 px-4 shadow-xl animate-slide-in">
            {/* Close Button */}
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Logo */}
            <div className="flex items-center space-x-3 px-2 mb-8">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
                <Bot className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                Social<span className="text-indigo-600">Flow</span>
              </span>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`h-5 w-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span>{item.name}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* Footer store & profile details */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs">
                  {store?.name?.charAt(0) || 'T'}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-800">{store?.name || 'Tienda Urbana'}</span>
                  <span className="text-[10px] text-indigo-600 font-medium">{store?.plan || 'Plan Pro'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between px-2">
                <div className="flex items-center space-x-2">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150"
                    alt={user?.name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-800">{user?.name}</span>
                    <span className="text-[10px] text-slate-400">Admin</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
