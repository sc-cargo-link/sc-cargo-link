
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MapPin, Radio, HelpCircle } from 'lucide-react';

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
              to="/routes"
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === '/routes' 
                  ? 'text-neon-blue bg-space-medium' 
                  : 'text-gray-300 hover:text-neon-blue'
              }`}
            >
              <MapPin className="h-5 w-5 mr-2" />
              Planning
            </Link>
            
            <Link
              to="/contracts/remote"
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === '/contracts/remote' 
                  ? 'text-neon-blue bg-space-medium' 
                  : 'text-gray-300 hover:text-neon-blue'
              }`}
            >
              <Radio className="h-5 w-5 mr-2" />
              Remote
            </Link>
            
            <Link
              to="/help"
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === '/help' 
                  ? 'text-neon-blue bg-space-medium' 
                  : 'text-gray-300 hover:text-neon-blue'
              }`}
            >
              <HelpCircle className="h-5 w-5 mr-2" />
              Help
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
