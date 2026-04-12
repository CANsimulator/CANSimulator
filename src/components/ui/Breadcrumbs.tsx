import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumbs: React.FC = () => {
    const location = useLocation();
    const pathnames = location.pathname.split('/').filter(x => x);

    if (pathnames.length === 0) return null;

    return (
        <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-6 px-1 overflow-x-auto no-scrollbar">
            <Link 
                to="/" 
                className="flex items-center gap-1.5 hover:text-cyber-blue transition-colors group"
            >
                <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 flex items-center justify-center group-hover:border-cyber-blue/30 transition-all">
                    <Home size={12} />
                </div>
                <span>Home</span>
            </Link>

            {pathnames.map((name, index) => {
                const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
                const isLast = index === pathnames.length - 1;
                const formattedName = name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

                return (
                    <React.Fragment key={routeTo}>
                        <ChevronRight size={10} className="text-gray-300 dark:text-gray-700" />
                        {isLast ? (
                            <motion.span 
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-dark-950 dark:text-gray-300"
                            >
                                {formattedName}
                            </motion.span>
                        ) : (
                            <Link to={routeTo} className="hover:text-cyber-blue transition-colors">
                                {formattedName}
                            </Link>
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
};
