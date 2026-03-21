/**
 * Header Component
 * Redesigned for CAN Simulator - Master the Bus
 */

import { useState, useRef, useEffect, memo } from 'react';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';

// Navigation links
const NAV_LINKS = [
    { to: '/', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { to: '/simulator', label: 'Simulator', icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0' },
    { to: '/generations', label: 'Generations', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { to: '/inspector', label: 'Bit-Level', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
    { to: '/signals', label: 'Signals', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { to: '/arbitration', label: 'Arbitration', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
    { to: '/errors', label: 'Errors', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    { to: '/physical', label: 'Physical', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { to: '/pricing', label: 'Pricing', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
] as const;

export function Header() {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    const { isAuthenticated, user, logout } = useAuth();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    // Close user menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        setShowUserMenu(false);
        navigate('/');
    };

    const navContainerClass = cn(
        "hidden lg:flex items-center gap-1 p-1 rounded-xl border backdrop-blur-sm transition-colors",
        isDark
            ? "bg-dark-800/50 border-dark-700/50"
            : "bg-white/80 border-light-200/70 shadow-[0_4px_20px_rgba(15,23,42,0.06)]",
    );

    const navLinkClass = (isActive: boolean) => cn(
        "px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2",
        isActive
            ? isDark
                ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                : "bg-cyan-500/10 text-cyan-700 border border-cyan-400/40"
            : isDark
                ? "text-gray-400 hover:text-white hover:bg-white/5"
                : "text-slate-600 hover:text-cyan-700 hover:bg-cyan-500/10",
    );

    const iconButtonBase = "p-2 rounded-lg transition-all";
    const iconButtonInactive = isDark
        ? "text-gray-400 hover:text-white hover:bg-white/5"
        : "text-slate-600 hover:text-cyan-700 hover:bg-cyan-500/10";

    return (
        <header className={cn(
            "header-container border-b sticky top-0 z-50 transition-colors backdrop-blur-xl",
            isDark ? "bg-dark-950/80 border-white/5" : "bg-white/80 border-black/5"
        )}>
            <div className="px-4 sm:px-6 py-3">
                <div className="flex items-center justify-between gap-4">
                    {/* Left: Logo & Branding */}
                    <Link to="/" className="flex items-center gap-3 group transition-all">
                        <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 bg-cyber-blue/20 rounded-xl blur-lg group-hover:bg-cyber-blue/30 transition-all opacity-0 group-hover:opacity-100"></div>
                            <div className="h-10 sm:h-12 w-10 sm:w-12 rounded-xl bg-gradient-to-br from-cyber-blue to-cyber-purple flex items-center justify-center font-black text-black text-lg shadow-neon/40 relative z-10 transition-transform group-hover:scale-105">
                                C
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-black tracking-tight text-gray-900 dark:text-white leading-none mb-1 group-hover:text-cyber-blue transition-colors uppercase">
                                CAN<span className="text-cyber-blue font-light">Simulator</span>
                            </span>
                            <div className="hidden sm:block text-[10px] font-bold tracking-[0.2em] text-gray-500 dark:text-gray-400 uppercase">
                                ISO 11898-1:2015
                            </div>
                        </div>
                    </Link>

                    {/* Center: Navigation Links (Hidden on mobile) */}
                    <div className={navContainerClass}>
                        {NAV_LINKS.map((link) => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                className={({ isActive }) => navLinkClass(isActive)}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
                                </svg>
                                {link.label}
                            </NavLink>
                        ))}
                    </div>

                    {/* Right: Actions */}
                    <div className="hidden lg:flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className={cn(iconButtonBase, iconButtonInactive)}
                            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {theme === 'dark' ? (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                </svg>
                            )}
                        </button>

                        {/* User Profile */}
                        {isAuthenticated && user ? (
                            <div className="relative" ref={userMenuRef}>
                                <button
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    className={cn(
                                        "flex items-center gap-2 pl-2 pr-1 py-1 text-xs font-medium border rounded-full transition-all",
                                        isDark
                                            ? "bg-dark-800/50 hover:bg-dark-700/50 border-dark-700/50"
                                            : "bg-white hover:bg-light-100 border-light-200 shadow-sm",
                                    )}
                                >
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyber-blue to-cyber-purple flex items-center justify-center text-white text-xs font-bold ring-2 ring-dark-900">
                                        {user.name?.[0]?.toUpperCase()}
                                    </div>
                                    <svg className="w-3 h-3 text-gray-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {showUserMenu && (
                                    <div className={cn(
                                        "absolute right-0 mt-3 w-56 py-2 rounded-2xl shadow-2xl z-50 border animate-slide-in-down overflow-hidden transition-colors",
                                        isDark ? "bg-dark-950 border-dark-700 shadow-cyan-900/20" : "bg-white border-light-200 shadow-slate-200/50"
                                    )}>
                                        <div className={cn(
                                            "px-4 py-3 border-b mb-1",
                                            isDark ? "border-white/5" : "border-black/5"
                                        )}>
                                            <p className={cn("text-sm font-bold", isDark ? "text-white" : "text-slate-900")}>{user.name}</p>
                                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                        </div>
                                        <div className="p-1">
                                            <button
                                                onClick={handleLogout}
                                                className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-500/10 rounded-xl flex items-center gap-3 transition-colors font-medium"
                                            >
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link
                                to="/auth"
                                className="px-5 py-2 text-xs font-bold rounded-full transition-all bg-gradient-to-r from-cyber-blue to-cyber-purple text-white hover:shadow-neon/40 hover:scale-105 active:scale-95"
                            >
                                Sign In
                            </Link>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className={cn("lg:hidden p-2 rounded-lg transition-colors", isDark ? "text-gray-400" : "text-slate-600")}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {mobileMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className={cn(
                        "lg:hidden mt-4 pt-4 border-t space-y-2 pb-4 transition-colors",
                        isDark ? "border-white/5" : "border-black/5"
                    )}>
                        {NAV_LINKS.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                onClick={() => setMobileMenuOpen(false)}
                                className={cn(
                                    "block px-4 py-3 text-sm rounded-lg border border-transparent transition-colors",
                                    isDark ? "text-gray-300 hover:bg-white/5 hover:border-white/5" : "text-slate-600 hover:bg-black/5 hover:border-black/5"
                                )}
                            >
                                {link.label}
                            </Link>
                        ))}
                        {!isAuthenticated && (
                            <Link
                                to="/auth"
                                onClick={() => setMobileMenuOpen(false)}
                                className="block mx-4 mt-4 py-3 text-center text-sm font-bold bg-gradient-to-r from-cyber-blue to-cyber-purple text-white rounded-lg"
                            >
                                Sign In
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}

export default memo(Header);
