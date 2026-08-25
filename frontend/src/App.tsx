// frontend/src/App.tsx
import React, { useState, useEffect } from 'react';
import { graphQLClient } from './api/client';
import { 
  LOGIN_MUTATION, 
  GET_DASHBOARD, 
  GET_TICKETS, 
  GET_USERS, 
  CREATE_TICKET, 
  ADD_COMMENT, 
  ASSIGN_TICKET, 
  CHANGE_STATUS 
} from './api/operations';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [email, setEmail] = useState('agent@example.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);

  const [dashboard, setDashboard] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');

  // New Ticket Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('MEDIUM');

  // Selected Ticket for detail view
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const data: any = await graphQLClient.request(LOGIN_MUTATION, { email, password });
      localStorage.setItem('token', data.login.token);
      setToken(data.login.token);
    } catch (err: any) {
      setError(err.response?.errors?.[0]?.message || 'Login failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  const fetchData = async () => {
    if (!token) return;
    try {
      const dashData: any = await graphQLClient.request(GET_DASHBOARD);
      setDashboard(dashData.dashboard);

      const usersData: any = await graphQLClient.request(GET_USERS, { role: 'AGENT' });
      setAgents(usersData.users);

      const ticketsData: any = await graphQLClient.request(GET_TICKETS, {
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
      });
      setTickets(ticketsData.tickets.nodes);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, statusFilter, priorityFilter]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await graphQLClient.request(CREATE_TICKET, {
        title: newTitle,
        description: newDesc,
        priority: newPriority,
      });
      setNewTitle('');
      setNewDesc('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.errors?.[0]?.message || 'Failed to create ticket');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Support Tracker Login</h2>
          {error && <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded mb-4 text-sm">{error}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                required
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded transition">
              Sign In
            </button>
          </form>
          <div className="mt-4 text-xs text-gray-500 text-center">
            Default Seed: agent@example.com / reporter@example.com (password: password123)
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-gray-900 p-4 rounded-xl border border-gray-800">
          <h1 className="text-xl font-bold flex items-center gap-2">🛠️ Support Ticket & SLA Tracker</h1>
          <button onClick={handleLogout} className="bg-red-600/20 text-red-400 hover:bg-red-600/30 px-4 py-1.5 rounded text-sm transition">
            Sign Out
          </button>
        </div>

        {/* Dashboard Statistics */}
        {dashboard && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
              <div className="text-gray-400 text-sm">Open Tickets</div>
              <div className="text-3xl font-bold text-blue-400">{dashboard.openTickets}</div>
            </div>
            <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
              <div className="text-gray-400 text-sm">In Progress</div>
              <div className="text-3xl font-bold text-yellow-400">{dashboard.inProgressTickets}</div>
            </div>
            <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
              <div className="text-gray-400 text-sm">At Risk SLAs</div>
              <div className="text-3xl font-bold text-orange-400">{dashboard.atRiskTickets}</div>
            </div>
            <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
              <div className="text-gray-400 text-sm">Breached SLAs</div>
              <div className="text-3xl font-bold text-red-500">{dashboard.breachedTickets}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Create Ticket Form */}
          <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 h-fit">
            <h2 className="text-lg font-semibold mb-4">Create New Ticket</h2>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Title</label>
                <input 
                  type="text" 
                  value={newTitle} 
                  onChange={e => setNewTitle(e.target.value)} 
                  className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm text-white" 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <textarea 
                  value={newDesc} 
                  onChange={e => setNewDesc(e.target.value)} 
                  className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm text-white h-24" 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Priority</label>
                <select 
                  value={newPriority} 
                  onChange={e => setNewPriority(e.target.value)} 
                  className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-sm text-white"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded text-sm transition font-medium">
                Submit Ticket
              </button>
            </form>
          </div>

          {/* Ticket Listing & Filters */}
          <div className="lg:col-span-2 bg-gray-900 p-5 rounded-xl border border-gray-800 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Support Tickets</h2>
              <div className="flex gap-2">
                <select 
                  value={statusFilter} 
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-gray-950 border border-gray-800 rounded p-1.5 text-xs text-white"
                >
                  <option value="">All Statuses</option>
                  <option value="OPEN">OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
                <select 
                  value={priorityFilter} 
                  onChange={e => setPriorityFilter(e.target.value)}
                  className="bg-gray-950 border border-gray-800 rounded p-1.5 text-xs text-white"
                >
                  <option value="">All Priorities</option>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {tickets.length === 0 ? (
                <div className="text-gray-500 text-sm text-center py-8">No tickets found.</div>
              ) : (
                tickets.map(ticket => (
                  <div key={ticket.id} className="bg-gray-950 border border-gray-800 p-4 rounded-lg flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-mono text-gray-500">#{ticket.id.slice(0, 6)}</span>
                        <h3 className="font-semibold text-white">{ticket.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ticket.priority === 'URGENT' ? 'bg-red-500/20 text-red-400' :
                          ticket.priority === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {ticket.priority}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-gray-300">
                          {ticket.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-400 flex justify-between items-center pt-2 border-t border-gray-900">
                      <div>Reporter: {ticket.reporter.name} | Assignee: {ticket.assignee?.name || 'Unassigned'}</div>
                      <div className="flex gap-3">
                        <span className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${
                            ticket.sla.firstResponseState === 'BREACHED' ? 'bg-red-500' :
                            ticket.sla.firstResponseState === 'AT_RISK' ? 'bg-orange-400' : 'bg-green-500'
                          }`}></span>
                          Response: {ticket.sla.firstResponseRemainingMinutes}m left
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}