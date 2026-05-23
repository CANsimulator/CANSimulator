import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTheme } from '../../context/ThemeContext';

const LABS = [
    { to: '/physical', label: 'Differential Scope' },
    { to: '/arbitration', label: 'Arbitration Arena' },
    { to: '/inspector', label: 'Frame Inspector' },
    { to: '/errors', label: 'Fault Injector' },
    { to: '/signals', label: 'Signal Matrix' },
    { to: '/generations', label: 'Speed Generations' },
];

export const LabNavigation: React.FC = () => {
    const location = useLocation();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const currentIndex = LABS.findIndex(lab => location.pathname === lab.to);
    
    // If not on a lab page, don't render anything
    if (currentIndex === -1) return null;

    const prevLab = currentIndex > 0 ? LABS[currentIndex - 1] : null;
    const nextLab = currentIndex < LABS.length - 1 ? LABS[currentIndex + 1] : null;

    return (
        <div className="w-full mt-12 pt-8 border-t border-gray-200 dark:border-white/5 flex items-center justify-between">
            <div className="flex-1">
                {prevLab && (
                    <Link 
                        to={prevLab.to} 
                        className={cn(
                            "group inline-flex flex-col items-start px-4 py-3 rounded-xl transition-all",
                            isDark ? "hover:bg-white/5" : "hover:bg-gray-100"
                        )}
                    >
                        <span className="flex items-center text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                            <ChevronLeft size={14} className="mr-1 transition-transform group-hover:-translate-x-1" />
                            Previous Lab
                        </span>
                        <span className={cn(
                            "text-sm font-black transition-colors uppercase italic",
                            isDark ? "text-gray-300 group-hover:text-cyber-blue" : "text-gray-700 group-hover:text-[#006876]"
                        )}>
                            {prevLab.label}
                        </span>
                    </Link>
                )}
            </div>

            <div className="flex-1 flex justify-center">
                <Link 
                    to="/simulator" 
                    className={cn(
                        "p-3 rounded-full transition-all text-gray-500 hover:text-gray-900 dark:hover:text-white",
                        isDark ? "hover:bg-white/5" : "hover:bg-gray-100"
                    )}
                    title="Return to Dashboard"
                >
                    <LayoutGrid size={20} />
                </Link>
            </div>

            <div className="flex-1 flex justify-end">
                {nextLab && (
                    <Link 
                        to={nextLab.to} 
                        className={cn(
                            "group inline-flex flex-col items-end px-4 py-3 rounded-xl transition-all",
                            isDark ? "hover:bg-white/5" : "hover:bg-gray-100"
                        )}
                    >
                        <span className="flex items-center text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                            Next Lab
                            <ChevronRight size={14} className="ml-1 transition-transform group-hover:translate-x-1" />
                        </span>
                        <span className={cn(
                            "text-sm font-black transition-colors uppercase italic",
                            isDark ? "text-gray-300 group-hover:text-cyber-blue" : "text-gray-700 group-hover:text-[#006876]"
                        )}>
                            {nextLab.label}
                        </span>
                    </Link>
                )}
            </div>
        </div>
    );
};
