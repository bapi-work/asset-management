import React, { useState } from 'react';

const Header = ({ user, onLogout, darkMode, onToggleDarkMode, settings }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getRoleColor = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-700',
      manager: 'bg-blue-100 text-blue-700',
      employee: 'bg-green-100 text-green-700',
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  return (
    <header className={`${darkMode
        ? 'bg-secondary-900 border-secondary-800'
        : 'bg-white border-secondary-200'
      } border-b px-6 py-4 flex items-center justify-between shadow-sm transition-colors duration-300`}>
      {/* Left section - Logo and company info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          {settings?.companyLogo ? (
            <img src={settings.companyLogo} alt="Company Logo" className="h-10 w-auto rounded" />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              📦
            </div>
          )}
          <div className="hidden sm:block">
            <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'
              }`}>
              {settings?.companyName || 'Asset Management'}
            </h2>
            {settings?.headerText && (
              <p className={`text-xs ${darkMode ? 'text-secondary-400' : 'text-secondary-600'
                }`}>{settings.headerText}</p>
            )}
          </div>
        </div>
      </div>

      {/* Right section - Dark mode toggle and user menu */}
      <div className="flex items-center gap-4">
        {/* Dark mode toggle */}
        <button
          onClick={onToggleDarkMode}
          className={`p-2.5 rounded-lg transition-colors duration-200 ${darkMode
              ? 'bg-secondary-800 text-yellow-400 hover:bg-secondary-700'
              : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
            }`}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle dark mode"
        >
          {darkMode ? (
            <svg width="20" height="20" className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zm5.657-9.193a1 1 0 00-1.414 0l-.707.707A1 1 0 005.05 13.536l.707.707a1 1 0 001.414-1.414l-.707-.707zM3 11a1 1 0 100-2H2a1 1 0 100 2h1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg width="20" height="20" className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </button>

        {/* Divider */}
        <div className={`h-6 w-px ${darkMode ? 'bg-secondary-700' : 'bg-secondary-200'
          }`}></div>

        {/* User info and menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 ${darkMode
                ? 'hover:bg-secondary-800'
                : 'hover:bg-secondary-100'
              }`}
          >
            {/* User avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-semibold overflow-hidden">
              <img
                src={`https://ui-avatars.com/api/?name=${user?.firstName || user?.username}&background=0d8abc&color=fff&bold=true`}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>

            {/* User details */}
            <div className="hidden sm:block text-left">
              <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                {user?.firstName || user?.username}
              </p>
              <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getRoleColor(user?.role)}`}>
                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
              </span>
            </div>

            {/* Dropdown arrow */}
            <svg width="16" height="16"
              className={`w-4 h-4 transition-transform duration-200 hidden sm:block ${showUserMenu ? 'transform rotate-180' : ''
                } ${darkMode ? 'text-secondary-400' : 'text-secondary-600'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {showUserMenu && (
            <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-50 overflow-hidden ${darkMode
                ? 'bg-secondary-800 border border-secondary-700'
                : 'bg-white border border-secondary-200'
              } animate-slideDown`}>
              {/* User info section */}
              <div className={`px-4 py-3 border-b ${darkMode ? 'border-secondary-700' : 'border-secondary-200'
                }`}>
                <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                  {user?.firstName || user?.username}
                </p>
                <p className={`text-xs ${darkMode ? 'text-secondary-400' : 'text-secondary-600'
                  }`}>
                  {user?.email || 'No email'}
                </p>
              </div>

              {/* Menu items */}
              <div className="py-2">
                <button
                  onClick={onToggleDarkMode}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors duration-200 ${darkMode
                      ? 'text-secondary-200 hover:bg-secondary-700'
                      : 'text-secondary-800 hover:bg-secondary-100'
                    }`}
                >
                  {darkMode ? '☀️' : '🌙'} {darkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
              </div>

              {/* Logout section */}
              <div className={`border-t ${darkMode ? 'border-secondary-700' : 'border-secondary-200'
                } py-2`}>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                  className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors duration-200 ${darkMode
                      ? 'text-red-400 hover:bg-secondary-700'
                      : 'text-red-600 hover:bg-red-50'
                    }`}
                >
                  🚪 Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
