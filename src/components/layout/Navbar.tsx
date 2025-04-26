
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Route, Package } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="h-16 border-b border-neon-blue/20 bg-space-dark">
      <div className="h-full mx-auto px-4">
        <div className="flex h-full items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-white">
              CARGO<span className="text-neon-blue">LINK</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to="/contracts"
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname.startsWith('/contracts') 
                  ? 'text-neon-blue bg-space-medium' 
                  : 'text-gray-300 hover:text-neon-blue'
              }`}
            >
              <Package className="h-5 w-5 mr-2" />
              Contracts
            </Link>
            <Link
              to="/routes"
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === '/routes' 
                  ? 'text-neon-blue bg-space-medium' 
                  : 'text-gray-300 hover:text-neon-blue'
              }`}
            >
              <Route className="h-5 w-5 mr-2" />
              Routes
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
