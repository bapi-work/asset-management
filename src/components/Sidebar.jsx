import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

// Icons as SVG components
const Icons = {
  Dashboard: () => (
    <svg width="20" height="20" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  Assets: () => (
    <svg width="20" height="20" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  Employees: () => (
    <svg width="20" height="20" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Assignments: () => (
    <svg width="20" height="20" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  Audit: () => (
    <svg width="20" height="20" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  Settings: () => (
    <svg width="20" height="20" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Logout: () => (
    <svg width="20" height="20" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  Users: () => (
    <svg width="20" height="20" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Locations: () => (
    <svg width="20" height="20" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Logo: () => (
    <svg width="24" height="24" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  ServiceRequest: () => (
    <svg width="20" height="20" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )
};

const Sidebar = ({ user, onLogout, darkMode, settings }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Icons.Dashboard, href: '/dashboard', roles: ['admin', 'manager', 'employee'] },
    { id: 'assets', label: 'Assets', icon: Icons.Assets, href: '/assets', roles: ['admin', 'manager', 'employee'] },
    { id: 'service-requests', label: 'Service Requests', icon: Icons.ServiceRequest, href: '/assets?status=in_maintenance', roles: ['admin', 'manager', 'employee'] },
    { id: 'employees', label: 'Employees', icon: Icons.Employees, href: '/employees', roles: ['admin', 'manager'] },
    { id: 'locations', label: 'Locations', icon: Icons.Locations, href: '/locations', roles: ['admin', 'manager'] },
    { id: 'assignments', label: 'Assignments', icon: Icons.Assignments, href: '/assignments', roles: ['admin', 'manager', 'employee'] },
    { id: 'users', label: 'Users', icon: Icons.Users, href: '/users', roles: ['admin'] },
    { id: 'audit', label: 'Audit Trail', icon: Icons.Audit, href: '/audit', roles: ['admin', 'manager'] },
    { id: 'settings', label: 'Settings', icon: Icons.Settings, href: '/settings', roles: ['admin'] },
    { id: 'asset-types', label: 'Asset Types', icon: Icons.Assets, href: '/asset-types', roles: ['admin', 'manager'] },
  ];

  const visibleItems = menuItems.filter(item => item.roles.includes(user?.role));
  const isActive = (href) => {
    // Exact match for routes with query parameters (like Service Requests)
    if (href.includes('?')) {
      return location.pathname + location.search === href;
    }
    // If it's the base Assets route, ensure we aren't actually viewing Service Requests
    if (href === '/assets') {
      return location.pathname === '/assets' && !location.search.includes('status=in_maintenance');
    }
    // Default exact or prefix match logic for other routes
    return location.pathname === href || (href !== '/' && location.pathname.startsWith(href + '/'));
  };
  const primaryColor = settings?.primaryColor || '#2563eb';

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} transition-all duration-300 flex flex-col h-screen border-r ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
      {/* Header */}
      <div className={`p-4 h-16 flex items-center justify-between border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'
        }`}>
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            {settings?.companyLogo ? (
              <img src={settings.companyLogo} alt="Logo" className="w-8 h-8 rounded-lg object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm" style={{ backgroundColor: primaryColor }}>
                <Icons.Logo />
              </div>
            )}
            <span className={`font-bold text-sm tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {settings?.companyName || 'Nexus Asset'}
            </span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`p-1.5 rounded-lg transition-colors ${darkMode
            ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
            }`}
        >
          {isCollapsed ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto mt-2">
        {visibleItems.map(item => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${active
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : darkMode
                  ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              title={isCollapsed ? item.label : ''}
            >
              <span className={`${active ? 'text-white' : ''}`}>
                <Icon />
              </span>

              {!isCollapsed && (
                <span className="font-medium text-sm">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`p-4 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
        {!isCollapsed && (
          <div className="flex items-center gap-3 mb-4 px-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
              }`}>
              {user?.firstName?.charAt(0) || user?.username?.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {user?.firstName || user?.username}
              </p>
              <p className="text-xs text-slate-500 truncate capitalize">{user?.role}</p>
            </div>
          </div>
        )}

        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${darkMode
            ? 'text-red-400 hover:bg-red-500/10'
            : 'text-red-600 hover:bg-red-50'
            } ${isCollapsed ? 'justify-center' : ''}`}
          title="Sign out"
        >
          <Icons.Logout />
          {!isCollapsed && <span className="text-sm font-medium">Sign out</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
