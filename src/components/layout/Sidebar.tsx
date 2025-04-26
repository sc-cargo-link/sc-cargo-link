
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Box, Compass, Package, Route, Truck } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();

  const navItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: <Box className="h-5 w-5" />,
    },
    {
      name: 'Contracts',
      path: '/contracts',
      icon: <Package className="h-5 w-5" />,
    },
    {
      name: 'Routes',
      path: '/routes',
      icon: <Route className="h-5 w-5" />,
    },
    {
      name: 'Cargo',
      path: '/cargo',
      icon: <Truck className="h-5 w-5" />,
    },
  ];

  return (
    <div className="w-16 md:w-64 border-r border-neon-blue/20 bg-space-dark">
      <div className="flex h-16 items-center justify-center md:justify-start px-4 border-b border-neon-blue/20">
        <Compass className="h-8 w-8 text-neon-blue animate-pulse-glow" />
        <span className="ml-2 text-xl font-bold text-white hidden md:block">
          HAUL<span className="text-neon-blue">PLANNER</span>
        </span>
      </div>

      <nav className="mt-5 px-2">
        <div className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`
                group flex items-center px-2 py-3 text-sm font-medium rounded-md transition-all duration-200
                ${location.pathname === item.path 
                  ? 'bg-space-medium text-neon-blue neon-border' 
                  : 'text-gray-300 hover:text-neon-blue'}
              `}
            >
              <div className={`
                flex items-center justify-center
                ${location.pathname === item.path ? 'text-neon-blue' : 'text-gray-400 group-hover:text-neon-blue'}
              `}>
                {item.icon}
                <span className="ml-3 hidden md:block">{item.name}</span>
              </div>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;
