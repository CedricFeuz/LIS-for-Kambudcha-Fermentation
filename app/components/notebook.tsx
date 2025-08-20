import React, { useState, useEffect } from 'react';
import { FaCog, FaUser, FaUserCheck, FaPlus, FaTrash, FaFlask } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

interface NotebookProps {
  onOpenSettings: () => void;
  onUserLogin: (user: User) => void;
  onUserLogout: () => void;
  currentUser: User | null;
  onOpenExperiment: (experiment: Experiment) => void;
  onCreateExperiment: (experiment: Experiment) => void;
}

interface User {
  username: string;
  password?: string;
  name?: string;
}

interface TeaSettings {
  id: number;
  name: string;
  teaGramsPerLiter: number;
  incubatorTemperature: number;
  sugarType: string;
  sugarGramsPerLiter: number;
  inoculumConcentration: number;
}

interface Batch {
  id: string;
  teaId: number;
  teaName: string;
  replicate: number;
  takenOut: string | null;
  plated: string | null;
  hplcVial: string | null;
  phValue: number | null;
  phTimestamp: string | null;
  labCount: number[] | null; // Changed from number | null to number[] | null
  aabCount: number[] | null; // Changed from number | null to number[] | null
  yeastMouldCount: number[] | null; // Changed from number | null to number[] | null
}

interface ScobyWeight {
  teaId: number;
  teaName: string;
  weight: number;
}

interface ScobyWeightDried {
  teaId: number;
  teaName: string;
  weight: number;
}

interface Experiment {
  id: string;
  name: string;
  date: string;
  description: string;
  protocolDate: string | null;
  cellCountingDate: string | null;
  scobyDriedDate: string | null;
  protocolNotes: string | null;
  cellCountingNotes: string | null;
  scobyDriedNotes: string | null;
  protocolUserName: string | null;
  cellCountingUserName: string | null;
  scobyDriedUserName: string | null;
  scobyWeights: ScobyWeight[];
  scobyWeightsDried: ScobyWeightDried[];
  numberOfSamples: number; // Added field for number of samples
  batches: Batch[];
}

interface UserSettings {
  teas: TeaSettings[];
  experiments: Experiment[];
}

function Notebook({ 
  onOpenSettings, 
  onUserLogin, 
  onUserLogout, 
  currentUser,
  onOpenExperiment,
  onCreateExperiment
}: NotebookProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(!!currentUser);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showNewExperimentModal, setShowNewExperimentModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [userTeas, setUserTeas] = useState<TeaSettings[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [newExperimentDescription, setNewExperimentDescription] = useState('');
  
  const [newExperimentName, setNewExperimentName] = useState('');
  const [selectedTeas, setSelectedTeas] = useState<{teaId: number, replicates: number}[]>([]);

  useEffect(() => {
    setIsLoggedIn(!!currentUser);
  }, [currentUser]);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/users.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const usersData = XLSX.utils.sheet_to_json<User>(worksheet);
        setUsers(usersData);
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUsers();
    
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser && !currentUser) {
      try {
        const user = JSON.parse(storedUser);
        onUserLogin(user);
      } catch (e) {
        localStorage.removeItem('currentUser');
      }
    }
  }, [onUserLogin, currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadUserSettings();
    } else {
      setUserTeas([]);
      setExperiments([]);
    }
  }, [currentUser]);

  const loadUserSettings = async () => {
    if (!currentUser) return;
    
    try {
      const response = await fetch('/userSettings.json');
      if (!response.ok) {
        return;
      }
      
      const data = await response.json();
      
      if (data[currentUser.username]) {
        const userSettings = data[currentUser.username];
        
        if (userSettings.teas) {
          setUserTeas(userSettings.teas);
        }
        
        if (userSettings.experiments) {
          setExperiments(userSettings.experiments);
        } else {
          setExperiments([]);
        }
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  };

  const handleLogin = () => {
    setLoginError('');
    
    if (!username || !password) {
      setLoginError('Please enter both username and password');
      return;
    }
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
      onUserLogin({ 
        username: user.username, 
        name: user.name 
      });
      
      setShowLoginModal(false);
      localStorage.setItem('currentUser', JSON.stringify({ 
        username: user.username, 
        name: user.name 
      }));
      
      setUsername('');
      setPassword('');
      checkUserSettings(user.username);
    } else {
      setLoginError('Invalid username or password');
    }
  };

  const checkUserSettings = async (username: string) => {
    try {
      const response = await fetch('/userSettings.json');
      if (!response.ok) {
        await initializeUserSettings(username);
        return;
      }
      
      const data = await response.json();
      if (!data[username]) {
        await initializeUserSettings(username, data);
      }
    } catch (error) {
      await initializeUserSettings(username);
    }
  };

  const initializeUserSettings = async (username: string, existingSettings = {}) => {
    try {
      const updatedSettings = {
        ...existingSettings,
        [username]: {
          teas: [],
          experiments: []
        }
      };
      
      const saveResponse = await fetch('/api/saveSettings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
      });
      
      if (!saveResponse.ok) {
        throw new Error('Failed to initialize user settings');
      }
    } catch (error) {
      console.error('Error initializing user settings:', error);
    }
  };

  const handleLogout = () => {
    onUserLogout();
    localStorage.removeItem('currentUser');
  };

  const handleDeleteExperiment = async (experimentId: string) => {
    if (!currentUser) return;
    
    if (window.confirm('Are you sure you want to delete this experiment?')) {
      try {
        const updatedExperiments = experiments.filter(exp => exp.id !== experimentId);
        setExperiments(updatedExperiments);
        
        const response = await fetch('/userSettings.json');
        if (!response.ok) throw new Error('Failed to load settings');
        
        const data = await response.json();
        
        const updatedSettings = {
          ...data,
          [currentUser.username]: {
            ...data[currentUser.username],
            experiments: updatedExperiments
          }
        };
        
        const saveResponse = await fetch('/api/saveSettings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedSettings),
        });
        
        if (!saveResponse.ok) throw new Error('Failed to save settings');
      } catch (error) {
        console.error('Error deleting experiment:', error);
        alert('Failed to delete experiment. Please try again.');
      }
    }
  };

  const handleNewExperiment = () => {
    if (!isLoggedIn) {
      alert('You need to log in to create a new experiment.');
      return;
    }
    
    setNewExperimentName('');
    setNewExperimentDescription('');
    setSelectedTeas([]);
    setShowNewExperimentModal(true);
  };

  const handleAddTeaToExperiment = (teaId: number, replicates: number) => {
    const existingIndex = selectedTeas.findIndex(item => item.teaId === teaId);
    
    if (existingIndex >= 0) {
      const updatedTeas = [...selectedTeas];
      updatedTeas[existingIndex] = { teaId, replicates };
      setSelectedTeas(updatedTeas);
    } else {
      setSelectedTeas([...selectedTeas, { teaId, replicates }]);
    }
  };

  const handleRemoveTeaFromExperiment = (teaId: number) => {
    setSelectedTeas(selectedTeas.filter(item => item.teaId !== teaId));
  };

  const handleCreateExperiment = async () => {
    if (!currentUser) return;
    
    if (!newExperimentName.trim()) {
      alert('Please enter an experiment name');
      return;
    }
    
    if (!newExperimentDescription.trim()) {
      alert('Please enter an experiment description');
      return;
    }
    
    if (selectedTeas.length === 0) {
      alert('Please select at least one tea for your experiment');
      return;
    }
    
    try {
      const batches: Batch[] = [];
      
      selectedTeas.forEach(({ teaId, replicates }) => {
        const tea = userTeas.find(t => t.id === teaId);
        if (!tea) return;
        
        for (let i = 1; i <= replicates; i++) {
          batches.push({
            id: uuidv4(),
            teaId: tea.id,
            teaName: tea.name,
            replicate: i,
            takenOut: null,
            plated: null,
            hplcVial: null,
            phValue: null,
            phTimestamp: null,
            labCount: null,
            aabCount: null,
            yeastMouldCount: null
          });
        }
      });
      
      const newExperiment: Experiment = {
        id: uuidv4(),
        name: newExperimentName,
        description: newExperimentDescription,
        date: new Date().toISOString(),
        protocolDate: null,
        cellCountingDate: null,
        scobyDriedDate: null,
        protocolNotes: '',
        cellCountingNotes: '',
        scobyDriedNotes: '',
        protocolUserName: null,
        cellCountingUserName: null,
        scobyDriedUserName: null,
        scobyWeights: [], 
        scobyWeightsDried: [],
        numberOfSamples: 3, // Add this line with default value of 3
        batches
      };
      
      const updatedExperiments = [...experiments, newExperiment];
      setExperiments(updatedExperiments);
      
      const response = await fetch('/userSettings.json');
      let data = {};
      
      if (response.ok) {
        data = await response.json();
      }
      
      const userSettingsData = data[currentUser.username as keyof typeof data];
      const userSettings = userSettingsData && typeof userSettingsData === 'object' 
        ? userSettingsData 
        : {};
      
      const updatedSettings = {
        ...data,
        [currentUser.username]: {
          ...userSettings,
          teas: userTeas,
          experiments: updatedExperiments
        }
      };
      
      const saveResponse = await fetch('/api/saveSettings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
      });
      
      if (!saveResponse.ok) throw new Error('Failed to save settings');
      
      setShowNewExperimentModal(false);
      onCreateExperiment(newExperiment);
      
    } catch (error) {
      console.error('Error creating experiment:', error);
      alert('Failed to create experiment. Please try again.');
    }
  };

  return (
    <div className="notebook-container h-screen flex flex-col">
      <div className="topbar bg-white border-b border-slate-200 p-4 flex justify-between items-center">
        <div>
          <button 
            className={`px-4 py-2 rounded-md flex items-center gap-2 ${
              isLoggedIn 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            onClick={isLoggedIn ? handleNewExperiment : undefined}
            disabled={!isLoggedIn}
          >
            <FaPlus size={14} />
            New Experiment
          </button>
        </div>
       
        <div className="text-xl font-semibold absolute left-1/2 transform -translate-x-1/2">
          Laboratory Notebook
        </div>
       
        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            {isLoggedIn && currentUser && (
              <span className="mr-2 text-sm font-medium text-gray-700">
                {currentUser.name || currentUser.username}
              </span>
            )}
            <div
              className="px-3 py-1.5 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors border border-slate-200 flex items-center cursor-pointer"
              onClick={() => isLoggedIn ? handleLogout() : setShowLoginModal(true)}
              title={isLoggedIn ? "Logout" : "Login"}
            >
              {isLoggedIn ? (
                <FaUserCheck size={20} className="text-green-600" />
              ) : (
                <FaUser size={20} className="text-slate-700" />
              )}
            </div>
          </div>
          
          <div
            className={`px-3 py-1.5 rounded-md border flex items-center cursor-pointer ${
              isLoggedIn 
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200' 
                : 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed'
            }`}
            onClick={isLoggedIn ? onOpenSettings : undefined}
            title={isLoggedIn ? "Settings" : "Log in to access settings"}
          >
            <FaCog size={20} className={isLoggedIn ? "text-slate-700" : "text-slate-400"} />
          </div>
        </div>
      </div>
     
      <div className="flex-grow p-4 relative">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FaFlask className="text-blue-600" />
            My Experiments
          </h2>
          
          {!isLoggedIn ? (
            <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-500">Please log in to view your experiments.</p>
            </div>
          ) : experiments.length === 0 ? (
            <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-500">No experiments yet. Click "New Experiment" to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {experiments.map(experiment => (
                <div 
                  key={experiment.id} 
                  className="bg-white p-4 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div 
                      className="flex-grow cursor-pointer"
                      onClick={() => onOpenExperiment(experiment)}
                    >
                      <h3 className="text-lg font-medium">{experiment.name}</h3>
                      <p className="text-sm text-gray-500">
                        Created: {new Date(experiment.date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {experiment.batches.length} batches
                      </p>
                    </div>
                    <button
                      className="text-red-600 hover:text-red-800 transition-colors p-1"
                      onClick={() => handleDeleteExperiment(experiment.id)}
                      title="Delete Experiment"
                    >
                      <FaTrash size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {showLoginModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-96">
              <h2 className="text-xl font-semibold mb-4">Login to Notebook</h2>
              
              {isLoading ? (
                <div className="text-center py-4">
                  <p>Loading user data...</p>
                </div>
              ) : (
                <>
                  {loginError && (
                    <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
                      {loginError}
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 mb-2" htmlFor="username">
                      Username
                    </label>
                    <input
                      id="username"
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                    />
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-gray-700 mb-2" htmlFor="password">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      onKeyUp={(e) => {
                        if (e.key === 'Enter') {
                          handleLogin();
                        }
                      }}
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <button
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                      onClick={() => setShowLoginModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      onClick={handleLogin}
                    >
                      Login
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        
        {showNewExperimentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-[600px] max-h-[80vh] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">Create New Experiment</h2>
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2" htmlFor="experimentName">
                  Experiment Name
                </label>
                <input
                  id="experimentName"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newExperimentName}
                  onChange={(e) => setNewExperimentName(e.target.value)}
                  placeholder="Enter experiment name"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2" htmlFor="experimentDescription">
                  Experiment Description <span className="text-red-500"></span>
                </label>
                <textarea
                  id="experimentDescription"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newExperimentDescription}
                  onChange={(e) => setNewExperimentDescription(e.target.value)}
                  placeholder="Describe what this experiment is testing"
                  rows={3}
                />
              </div>
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">Select Teas</h3>
                
                {userTeas.length === 0 ? (
                  <div className="text-center py-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-500">No teas available. Please add teas in Settings first.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userTeas.map(tea => {
                      const selectedTea = selectedTeas.find(item => item.teaId === tea.id);
                      const isSelected = !!selectedTea;
                      const replicates = selectedTea?.replicates || 1;
                      
                      return (
                        <div key={tea.id} className="p-3 border border-gray-200 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`tea-${tea.id}`}
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    handleAddTeaToExperiment(tea.id, 1);
                                  } else {
                                    handleRemoveTeaFromExperiment(tea.id);
                                  }
                                }}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <label htmlFor={`tea-${tea.id}`} className="font-medium">
                                {tea.name}
                              </label>
                            </div>
                            
                            {isSelected && (
                              <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600">Replicates:</label>
                                <select
                                  value={replicates}
                                  onChange={(e) => handleAddTeaToExperiment(tea.id, parseInt(e.target.value))}
                                  className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                                >
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                                    <option key={num} value={num}>{num}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                          
                          {isSelected && (
                            <div className="text-sm text-gray-500 pl-6">
                              <p>Will create {replicates} replicate{replicates > 1 ? 's' : ''} for {tea.name}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                  onClick={() => setShowNewExperimentModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  onClick={handleCreateExperiment}
                  disabled={userTeas.length === 0}
                >
                  Create Experiment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Notebook;