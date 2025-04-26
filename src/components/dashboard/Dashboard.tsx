
import React from 'react';
import StatCard from './StatCard';
import ContractList from '../contracts/ContractList';
import { sampleContracts } from '@/data/sampleData';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Route, Truck, AlertTriangle } from 'lucide-react';

const Dashboard = () => {
  // Filter contracts by status
  const pendingContracts = sampleContracts.filter(contract => contract.status === 'pending');
  const activeContracts = sampleContracts.filter(contract => contract.status === 'in-progress');
  
  // Calculate total earnings
  const totalEarnings = sampleContracts.reduce((sum, contract) => {
    if (contract.status === 'completed') {
      return sum + contract.payment;
    }
    return sum;
  }, 0);
  
  // Calculate potential earnings
  const potentialEarnings = pendingContracts.reduce((sum, contract) => sum + contract.payment, 0);
  
  // Find urgent contracts (deadline within 24 hours)
  const urgentContracts = pendingContracts.filter(contract => 
    contract.deadline && (contract.deadline.getTime() - Date.now() < 86400000)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Mission Control</h1>
        <p className="text-gray-400 mt-2">Welcome to your hauling operations center</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Active Contracts" 
          value={activeContracts.length.toString()}
          description="Current hauling missions"
          icon={<Package className="h-6 w-6 text-neon-blue" />}
          trend={{ value: "2", direction: "up" }}
        />
        <StatCard 
          title="Pending Contracts" 
          value={pendingContracts.length.toString()} 
          description="Awaiting action"
          icon={<Truck className="h-6 w-6 text-neon-blue" />}
          trend={{ value: "1", direction: "up" }}
        />
        <StatCard 
          title="Active Routes" 
          value="3" 
          description="Mapped star systems"
          icon={<Route className="h-6 w-6 text-neon-blue" />}
          trend={{ value: "5%", direction: "up" }}
        />
        <StatCard 
          title="Total Earnings" 
          value={`${totalEarnings.toLocaleString()} aUEC`}
          description={`${potentialEarnings.toLocaleString()} aUEC pending`}
          icon={<AlertTriangle className="h-6 w-6 text-neon-blue" />}
          trend={{ value: "12%", direction: "up" }}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2 holographic-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-neon-blue">Active Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <ContractList contracts={activeContracts.length ? activeContracts : pendingContracts.slice(0, 2)} compact />
          </CardContent>
        </Card>

        <Card className="holographic-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-neon-blue">Urgent Missions</CardTitle>
          </CardHeader>
          <CardContent>
            {urgentContracts.length > 0 ? (
              <div className="space-y-4">
                {urgentContracts.map(contract => (
                  <div key={contract.id} className="flex items-center space-x-3 p-2 rounded-lg bg-red-500/10 border border-red-500/30">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    <div>
                      <h4 className="font-medium text-white">{contract.title}</h4>
                      <p className="text-xs text-gray-400">Deadline approaching</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <p className="text-gray-400">No urgent missions</p>
                <p className="text-xs text-gray-500 mt-1">All deadlines are comfortable</p>
              </div>
            )}

            <Separator className="my-4 bg-gray-700" />
            
            <div>
              <h4 className="font-medium text-neon-blue mb-2">Quick Stats</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Cargo Hauled (Week):</span>
                  <span className="text-white">425 SCU</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Contracts Completed:</span>
                  <span className="text-white">18</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Success Rate:</span>
                  <span className="text-white">96%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
