/**
 * Header Component
 * Redesigned for CAN Simulator - Master the Bus
 */

import { useState, useRef, useEffect, memo } from 'react';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { cn } from '../../utils/cn';
import { Search } from 'lucide-react';

// Navigation links
const NAV_LINKS = [
    { to: '/', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { to: '/simulator', label: 'Simulator', icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0' },
    { to: '/inspector', label: 'Inspector', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
    { to: '/pricing', label: 'Pricing', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { to: '/contact', label: 'Contact', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' }
] as const;

export function Header() {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    const logoUrl = `${import.meta.env.BASE_URL}branding/can-simulator-logo-d-icon.svg`;
    const { isAuthenticated, user, logout, isLoading } = useAuth();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const userMenuRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const mobileButtonRef = useRef<HTMLButtonElement>(null);

    // Trap focus in mobile menu when open
    useFocusTrap(mobileMenuRef, mobileMenuOpen, () => setMobileMenuOpen(false));

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showUserMenu && userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
            if (mobileMenuOpen && 
                mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node) &&
                mobileButtonRef.current && !mobileButtonRef.current.contains(event.target as Node)) {
                setMobileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [mobileMenuOpen, showUserMenu]);

    const handleLogout = () => {
        logout();
        setShowUserMenu(false);
        navigate('/');
    };

    const navContainerClass = cn(
        "hidden lg:flex items-center gap-1 p-1 rounded-xl transition-colors",
        isDark
            ? "bg-[#121314]"
            : "bg-[#edeeef]", // surface_container
    );

    const navLinkClass = (isActive: boolean) => cn(
        "px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 font-[Space_Grotesk]",
        isActive
            ? isDark
                ? "bg-[#1b1c1d] text-[#00fbfb]"
                : "bg-[#ffffff] text-[#006876] shadow-sm" // surface_container_lowest
            : isDark
                ? "text-[#b9cac9] hover:text-[#e4e2e3] hover:bg-[#1b1c1d]"
                : "text-[#3c494c] hover:text-[#006876] hover:bg-white/50",
    );

    const iconButtonBase = "p-2 rounded-xl transition-all";
    const iconButtonInactive = isDark
        ? "text-[#b9cac9] hover:text-[#e4e2e3] hover:bg-[#1b1c1d]"
        : "text-[#3c494c] hover:text-[#006876] hover:bg-[#f3f4f5]";

    return (
        <header className={cn(
            "header-container sticky top-0 z-50 transition-colors shadow-sm",
            isDark ? "bg-[#050508]" : "bg-[#f8f9fa]" // surface
        )}>
            <div className="px-4 sm:px-6 py-3">
                <div className="flex items-center justify-between gap-4">
                    {/* Left: Logo & Branding */}
                    <Link to="/" className="flex items-center gap-3 group transition-all shrink-0">
                        <div className="relative">
                            <div className={cn(
                                "h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center relative z-10 transition-transform group-hover:scale-105",
                                isDark ? "bg-[#121314]" : "bg-[#ffffff] shadow-sm"
                            )}>
                                <img
                                    src={logoUrl}
                                    alt="CAN Simulator"
                                    className="h-7 w-7 sm:h-8 sm:w-8"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-[Space_Grotesk] font-bold tracking-tight text-[#191c1d] dark:text-[#e4e2e3] leading-none mb-1 group-hover:text-[#00bcd4] transition-colors">
                                CAN<span className="text-[#00bcd4]">Sim</span>
                            </span>
                            <div className="hidden sm:block text-[10px] font-bold tracking-[0.2em] text-[#546067] dark:text-gray-400 uppercase">
                                ISO 11898-1
                            </div>
                        </div>
                    </Link>

                    {/* Search Bar (Mocked) */}
                    <div className="hidden xl:flex flex-1 max-w-sm relative ml-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#839493]" />
                        <input
                            type="text"
                            placeholder="SEARCH PROTOCOL..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={cn(
                                "w-full pl-10 pr-12 py-2.5 rounded-xl text-[10px] font-bold tracking-widest transition-all uppercase focus:outline-none focus:ring-2 focus:ring-[#00bcd4]/50",
                                isDark 
                                    ? "bg-[#121314] text-[#e4e2e3] placeholder-[#839493]" 
                                    : "bg-[#edeeef] text-[#191c1d] placeholder-[#a0adb4]"
                            )}
                        />
                         <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <span className="text-[10px] font-mono font-bold text-[#a0adb4] bg-[#f8f9fa] rounded-md px-1.5 py-0.5">⌘K</span>
                        </div>
                    </div>

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
                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleTheme}
                            className={cn(iconButtonBase, iconButtonInactive)}
                            aria-label="Toggle Theme"
                        >
                            {isDark ? (
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
                        {!isLoading && isAuthenticated && user ? (
                            <div className="relative" ref={userMenuRef}>
                                <button
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    className={cn(
                                        "flex items-center gap-2 p-1 rounded-xl transition-all shrink-0",
                                        isDark
                                            ? "bg-[#1b1c1d]"
                                            : "bg-[#ffffff] shadow-sm hover:shadow-md",
                                    )}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-[#f3f4f5] dark:bg-[#121314] flex items-center justify-center text-[#191c1d] dark:text-[#e4e2e3] text-xs font-bold font-[Space_Grotesk]">
                                        {user.name?.[0]?.toUpperCase()}
                                    </div>
                                </button>
                                {showUserMenu && (
                                    <div className={cn(
                                        "absolute right-0 mt-3 w-56 py-2 rounded-xl shadow-[0_12px_32px_-4px_rgba(25,28,29,0.08)] z-50 animate-slide-in-down overflow-hidden",
                                        isDark ? "bg-[#121314]" : "bg-[#ffffff]"
                                    )}>
                                        <div className="px-4 py-3 border-b border-[#edeeef] dark:border-[#3a4a49]/15 mb-1">
                                            <p className="text-sm font-bold font-[Space_Grotesk] uppercase text-[#191c1d] dark:text-[#e4e2e3]">{user.name}</p>
                                            <p className="text-[11px] text-[#546067] truncate font-mono">{user.email}</p>
                                        </div>
                                        <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-xs text-[#ba1a1a] font-bold uppercase hover:bg-[#ffdad6]">Sign Out</button>
                                    </div>
                                )}
                            </div>
                        ) : !isLoading && (
                            <Link to="/auth" className="px-5 py-2 text-[11px] font-bold uppercase tracking-widest rounded-xl bg-gradient-to-br from-[#006876] to-[#00bcd4] text-[#ffffff] shadow-sm hover:shadow-md transition-all shrink-0 font-[Space_Grotesk]">
                                Auth
                            </Link>
                        )}

                        {/* Mobile Menu Toggle */}
                        <button
                            ref={mobileButtonRef}
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="lg:hidden p-2 text-gray-500 hover:text-white"
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
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div 
                        ref={mobileMenuRef}
                        className="lg:hidden mt-4 pt-4 border-t border-white/5 space-y-1 pb-4"
                    >
                        {NAV_LINKS.map((link) => (
                            <Link
                                key={link.to}
                                to={link.to}
                                onClick={() => setMobileMenuOpen(false)}
                                className="block px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </header>
    );
}

export default memo(Header);
