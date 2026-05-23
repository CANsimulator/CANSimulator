/**
 * Header Component
 * Redesigned for CAN Simulator - Basic Architecture
 */

import { useState, useRef, useEffect, memo } from 'react';
import { Link, useNavigate, NavLink, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { cn } from '../../utils/cn';
import { ChevronDown, Activity, Swords, Binary, AlertTriangle, Sliders, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Navigation links (Standard top-level items)
const NAV_LINKS = [
    { to: '/', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { to: '/simulator', label: 'Dashboard', icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0' },
    { to: '/pricing', label: 'Pricing', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { to: '/contact', label: 'Contact', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' }
] as const;

const LABS_LINKS = [
    { to: '/physical', label: 'Physical Layer', icon: Activity, description: 'Voltage diff & logic' },
    { to: '/arbitration', label: 'Arbitration Arena', icon: Swords, description: 'Message collision' },
    { to: '/inspector', label: 'Frame Inspector', icon: Binary, description: 'Bit-level analysis' },
    { to: '/errors', label: 'Fault Injection', icon: AlertTriangle, description: 'Error handling' },
    { to: '/signals', label: 'Signal Matrix', icon: Sliders, description: 'Database decoding' },
    { to: '/generations', label: 'CAN Generations', icon: Zap, description: 'FD & XL evolution' },
];

export function Header() {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    const logoUrl = `${import.meta.env.BASE_URL}branding/can-simulator-logo-d-icon.svg`;
    const { isAuthenticated, user, logout, isLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [labsDropdownOpen, setLabsDropdownOpen] = useState(false);
    
    const userMenuRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);
    const mobileButtonRef = useRef<HTMLButtonElement>(null);
    const labsDropdownRef = useRef<HTMLDivElement>(null);

    // Trap focus in mobile menu when open
    useFocusTrap(mobileMenuRef, mobileMenuOpen, () => setMobileMenuOpen(false));

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showUserMenu && userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
            if (labsDropdownOpen && labsDropdownRef.current && !labsDropdownRef.current.contains(event.target as Node)) {
                setLabsDropdownOpen(false);
            }
            if (mobileMenuOpen && 
                mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node) &&
                mobileButtonRef.current && !mobileButtonRef.current.contains(event.target as Node)) {
                setMobileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [mobileMenuOpen, showUserMenu, labsDropdownOpen]);

    const handleLogout = () => {
        logout();
        setShowUserMenu(false);
        navigate('/');
    };

    const navContainerClass = cn(
        "hidden lg:flex items-center gap-1 p-1 rounded-xl transition-colors",
        isDark ? "bg-[#121314]" : "bg-[#edeeef]"
    );

    const navLinkClass = (isActive: boolean) => cn(
        "px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 font-[Space_Grotesk]",
        isActive
            ? isDark
                ? "bg-[#1b1c1d] text-[#00fbfb]"
                : "bg-[#ffffff] text-[#006876] shadow-sm"
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
            isDark ? "bg-[#050508]" : "bg-[#f8f9fa]"
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

                    {/* Center: Navigation Links */}
                    <div className={navContainerClass}>
                        <NavLink to="/" className={({ isActive }) => navLinkClass(isActive)}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={NAV_LINKS[0].icon} />
                            </svg>
                            {NAV_LINKS[0].label}
                        </NavLink>

                        <NavLink to="/simulator" className={({ isActive }) => navLinkClass(isActive)}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={NAV_LINKS[1].icon} />
                            </svg>
                            {NAV_LINKS[1].label}
                        </NavLink>

                        {/* Labs Dropdown */}
                        <div className="relative" ref={labsDropdownRef}>
                            <button
                                onClick={() => setLabsDropdownOpen(!labsDropdownOpen)}
                                className={cn(
                                    "px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 font-[Space_Grotesk]",
                                    labsDropdownOpen || location.pathname.match(/^\/(physical|arbitration|inspector|errors|signals|generations)/)
                                        ? isDark ? "bg-[#1b1c1d] text-[#00fbfb]" : "bg-[#ffffff] text-[#006876] shadow-sm"
                                        : isDark ? "text-[#b9cac9] hover:text-[#e4e2e3] hover:bg-[#1b1c1d]" : "text-[#3c494c] hover:text-[#006876] hover:bg-white/50"
                                )}
                            >
                                <Activity className="w-4 h-4" />
                                Labs
                                <ChevronDown className={cn("w-3 h-3 transition-transform", labsDropdownOpen && "rotate-180")} />
                            </button>
                            
                            <AnimatePresence>
                                {labsDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                        className={cn(
                                            "absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[480px] p-4 rounded-[1.5rem] shadow-2xl z-50 grid grid-cols-2 gap-2 border",
                                            isDark ? "bg-[#121314] border-white/5" : "bg-white border-black/5"
                                        )}
                                    >
                                        {LABS_LINKS.map((lab) => {
                                            const isActive = location.pathname === lab.to;
                                            return (
                                                <Link
                                                    key={lab.to}
                                                    to={lab.to}
                                                    onClick={() => setLabsDropdownOpen(false)}
                                                    className={cn(
                                                        "group flex items-start gap-3 p-3 rounded-xl transition-all",
                                                        isActive 
                                                            ? isDark ? "bg-white/10" : "bg-[#006876]/5"
                                                            : isDark ? "hover:bg-white/5" : "hover:bg-gray-50"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                                        isActive
                                                            ? isDark ? "bg-cyber-blue text-dark-900" : "bg-[#006876] text-white"
                                                            : isDark ? "bg-white/5 text-cyber-blue group-hover:bg-cyber-blue group-hover:text-dark-900" 
                                                                     : "bg-[#006876]/10 text-[#006876] group-hover:bg-[#006876] group-hover:text-white"
                                                    )}>
                                                        <lab.icon size={20} />
                                                    </div>
                                                    <div>
                                                        <div className={cn(
                                                            "text-sm font-bold tracking-tight mb-0.5 uppercase",
                                                            isActive ? (isDark ? "text-white" : "text-[#006876]") : (isDark ? "text-gray-300 group-hover:text-white" : "text-gray-800")
                                                        )}>
                                                            {lab.label}
                                                        </div>
                                                        <div className="text-[11px] text-gray-500">{lab.description}</div>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <NavLink to="/pricing" className={({ isActive }) => navLinkClass(isActive)}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={NAV_LINKS[2].icon} />
                            </svg>
                            {NAV_LINKS[2].label}
                        </NavLink>

                        <NavLink to="/contact" className={({ isActive }) => navLinkClass(isActive)}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={NAV_LINKS[3].icon} />
                            </svg>
                            {NAV_LINKS[3].label}
                        </NavLink>
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
                                        isDark ? "bg-[#1b1c1d]" : "bg-[#ffffff] shadow-sm hover:shadow-md",
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
                        className="lg:hidden mt-4 pt-4 border-t border-gray-200 dark:border-white/5 space-y-1 pb-4 text-left font-sans h-[60vh] overflow-y-auto"
                    >
                        <Link to="/" onClick={() => setMobileMenuOpen(false)} className={cn("block px-4 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all font-[Space_Grotesk]", location.pathname === '/' ? isDark ? "bg-[#1b1c1d] text-[#00fbfb]" : "bg-white text-[#006876] shadow-sm" : isDark ? "text-gray-400 hover:text-white hover:bg-white/5" : "text-gray-600 hover:text-[#006876] hover:bg-gray-100/50")}>Home</Link>
                        <Link to="/simulator" onClick={() => setMobileMenuOpen(false)} className={cn("block px-4 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all font-[Space_Grotesk]", location.pathname === '/simulator' ? isDark ? "bg-[#1b1c1d] text-[#00fbfb]" : "bg-white text-[#006876] shadow-sm" : isDark ? "text-gray-400 hover:text-white hover:bg-white/5" : "text-gray-600 hover:text-[#006876] hover:bg-gray-100/50")}>Simulator</Link>
                        
                        <div className="px-4 py-2 mt-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Labs</div>
                        {LABS_LINKS.map((lab) => (
                            <Link key={lab.to} to={lab.to} onClick={() => setMobileMenuOpen(false)} className={cn("block px-6 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-3", location.pathname === lab.to ? isDark ? "bg-white/10 text-cyber-blue" : "bg-[#006876]/10 text-[#006876]" : isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-[#006876]")}>
                                <lab.icon size={16} />
                                {lab.label}
                            </Link>
                        ))}

                        <div className="border-t border-gray-200 dark:border-white/5 my-2"></div>
                        <Link to="/pricing" onClick={() => setMobileMenuOpen(false)} className={cn("block px-4 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all font-[Space_Grotesk]", location.pathname === '/pricing' ? isDark ? "bg-[#1b1c1d] text-[#00fbfb]" : "bg-white text-[#006876] shadow-sm" : isDark ? "text-gray-400 hover:text-white hover:bg-white/5" : "text-gray-600 hover:text-[#006876] hover:bg-gray-100/50")}>Pricing</Link>
                        <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className={cn("block px-4 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all font-[Space_Grotesk]", location.pathname === '/contact' ? isDark ? "bg-[#1b1c1d] text-[#00fbfb]" : "bg-white text-[#006876] shadow-sm" : isDark ? "text-gray-400 hover:text-white hover:bg-white/5" : "text-gray-600 hover:text-[#006876] hover:bg-gray-100/50")}>Contact</Link>
                    </div>
                )}
            </div>
        </header>
    );
}

export default memo(Header);
