
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Package, Route, MapPin } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname.startsWith('/contracts') 
                      ? 'text-neon-blue bg-space-medium' 
                      : 'text-gray-300 hover:text-neon-blue'
                  }`}
                >
                  <Package className="h-5 w-5 mr-2" />
                  Contracts
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-space-dark border border-neon-blue/20">
                <DropdownMenuItem asChild>
                  <Link to="/contracts" className="text-gray-300 hover:text-neon-blue focus:text-neon-blue">
                    All Contracts
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/contracts/record" className="text-gray-300 hover:text-neon-blue focus:text-neon-blue">
                    Record Contract
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/contracts/remote" className="text-gray-300 hover:text-neon-blue focus:text-neon-blue">
                    Remote Session
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
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
            
            <Link
              to="/route-planning"
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === '/route-planning' 
                  ? 'text-neon-blue bg-space-medium' 
                  : 'text-gray-300 hover:text-neon-blue'
              }`}
            >
              <MapPin className="h-5 w-5 mr-2" />
              Route Planning
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
