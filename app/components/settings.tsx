"use client";
import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaPlus, FaTrash } from 'react-icons/fa';

interface SettingsProps {
  onReturn: () => void;
  currentUser: {
    username: string;
    name?: string;
  } | null;
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

function Settings({ onReturn, currentUser }: SettingsProps) {
  const [teas, setTeas] = useState<TeaSettings[]>([]);
  const [newTea, setNewTea] = useState<Omit<TeaSettings, 'id'>>({
    name: '',
    teaGramsPerLiter: 0,
    incubatorTemperature: 25,
    sugarType: '',
    sugarGramsPerLiter: 0,
    inoculumConcentration: 0
  });
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      loadUserSettings();
    } else {
      setIsLoading(false);
    }
  }, [currentUser]);

  const loadUserSettings = async () => {
    try {
      setIsLoading(true);
      
      // Fetch the settings file
      const response = await fetch('/userSettings.json');
      
      // If the file doesn't exist yet, create it
      if (!response.ok) {
        setTeas([]);
        setIsLoading(false);
        return;
      }
      
      const data = await response.json();
      
      // Check if the current user has settings
      if (currentUser && data[currentUser.username] && data[currentUser.username].teas) {
        setTeas(data[currentUser.username].teas);
      } else {
        setTeas([]);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setTeas([]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUserSettings = async (updatedTeas: TeaSettings[]) => {
    if (!currentUser) return;
    
    try {
      // First load the current settings file
      let currentSettings = {};
      try {
        const response = await fetch('/userSettings.json');
        if (response.ok) {
          currentSettings = await response.json();
        }
      } catch (error) {
        // File might not exist yet, which is fine
      }
      
      // Update the current user's settings
      const updatedSettings = {
        ...currentSettings,
        [currentUser.username]: {
          teas: updatedTeas
        }
      };
      
      // Save the updated settings
      const saveResponse = await fetch('/api/saveSettings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
      });
      
      if (!saveResponse.ok) {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  const handleAddTea = async () => {
    // Validate the input
    if (!newTea.name) {
      alert('Please enter a tea name');
      return;
    }

    if (!newTea.sugarType) {
      alert('Please enter a sugar type');
      return;
    }
    
    // Find the highest ID to determine the next ID
    const nextId = teas.length > 0 
      ? Math.max(...teas.map(tea => tea.id)) + 1 
      : 1;
    
    // Create the new tea object
    const teaToAdd = { ...newTea, id: nextId };
    
    // Create a new array with all existing teas plus the new one
    const updatedTeas = [...teas, teaToAdd];
    
    // Update the state
    setTeas(updatedTeas);
    
    // Save the updated settings with the new array directly
    await saveUserSettings(updatedTeas);
    
    // Reset the form
    setNewTea({
      name: '',
      teaGramsPerLiter: 0,
      incubatorTemperature: 25,
      sugarType: '',
      sugarGramsPerLiter: 0,
      inoculumConcentration: 0
    });
    
    setIsAdding(false);
  };

  const handleDeleteTea = async (id: number) => {
    // Create a new array without the deleted tea
    const updatedTeas = teas.filter(tea => tea.id !== id);
    
    // Update the state
    setTeas(updatedTeas);
    
    // Save the updated settings with the new array directly
    await saveUserSettings(updatedTeas);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Convert numerical inputs to numbers
    const processedValue = ['teaGramsPerLiter', 'incubatorTemperature', 'sugarGramsPerLiter', 'inoculumConcentration'].includes(name)
      ? parseFloat(value) || 0
      : value;
    
    setNewTea(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  if (!currentUser) {
    return (
      <div className="settings-container h-screen flex flex-col">
        <div className="topbar bg-white border-b border-slate-200 p-4 flex justify-between items-center">
          <div className="w-24"></div>
          <div className="text-xl font-semibold absolute left-1/2 transform -translate-x-1/2">
            Settings
          </div>
          <button
            className="px-4 py-2 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors border border-slate-200 flex items-center gap-2"
            onClick={onReturn}
          >
            Return
          </button>
        </div>
        
        <div className="flex-grow p-4 flex items-center justify-center">
          <div className="text-center p-8 bg-gray-50 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Login Required</h2>
            <p className="mb-4">You need to log in to access settings.</p>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              onClick={onReturn}
            >
              Return to Notebook
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container h-screen flex flex-col">
      {/* Top Bar */}
      <div className="topbar bg-white border-b border-slate-200 p-4 flex justify-between items-center">
        {/* Left: Empty space for alignment */}
        <div className="w-24"></div>
       
        {/* Center: Title */}
        <div className="text-xl font-semibold absolute left-1/2 transform -translate-x-1/2">
          Settings
        </div>
       
        {/* Right: Return Button */}
        <button
          className="px-4 py-2 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors border border-slate-200 flex items-center gap-2"
          onClick={onReturn}
        >
          Return
        </button>
      </div>
     
      {/* Settings Content Area */}
      <div className="flex-grow p-4 overflow-auto">
        <div className="settings-panel max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Kombucha Tea Settings</h2>
            {!isAdding && (
              <button
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                onClick={() => setIsAdding(true)}
              >
                <FaPlus size={14} />
                Add New Tea
              </button>
            )}
          </div>
          
          {isLoading ? (
            <div className="text-center py-8">
              <p>Loading your tea settings...</p>
            </div>
          ) : (
            <>
              {/* Add New Tea Form */}
              {isAdding && (
                <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                  <h3 className="text-lg font-medium mb-4">Add New Tea</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tea Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={newTea.name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter tea name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tea (g/L)
                      </label>
                      <input
                        type="number"
                        name="teaGramsPerLiter"
                        value={newTea.teaGramsPerLiter}
                        onChange={handleInputChange}
                        min="0"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Incubator Temperature (°C)
                      </label>
                      <input
                        type="number"
                        name="incubatorTemperature"
                        value={newTea.incubatorTemperature}
                        onChange={handleInputChange}
                        min="0"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sugar Type
                      </label>
                      <input
                        type="text"
                        name="sugarType"
                        value={newTea.sugarType}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter sugar type (e.g., White Sugar, Honey)"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sugar (g/L)
                      </label>
                      <input
                        type="number"
                        name="sugarGramsPerLiter"
                        value={newTea.sugarGramsPerLiter}
                        onChange={handleInputChange}
                        min="0"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                      Inoculum Concentration (%)
                      </label>
                      <input
                        type="number"
                        name="inoculumConcentration"
                        value={newTea.inoculumConcentration}
                        onChange={handleInputChange}
                        min="0"
                        max="100"
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <button
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                      onClick={() => {
                        setIsAdding(false);
                        setNewTea({
                          name: '',
                          teaGramsPerLiter: 0,
                          incubatorTemperature: 25,
                          sugarType: '',
                          sugarGramsPerLiter: 0,
                          inoculumConcentration: 0
                        });
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      onClick={handleAddTea}
                    >
                      Save Tea
                    </button>
                  </div>
                </div>
              )}
              
              {/* Tea List */}
              {teas.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-500">No teas added yet. Click "Add New Tea" to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {teas.map(tea => (
                    <div key={tea.id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-medium">{tea.name}</h3>
                        <button
                          className="text-red-600 hover:text-red-800 transition-colors"
                          onClick={() => handleDeleteTea(tea.id)}
                          title="Delete Tea"
                        >
                          <FaTrash size={16} />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                        <div>
                          <p className="text-sm text-gray-500">Tea</p>
                          <p>{tea.teaGramsPerLiter} g/L</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500">Incubator Temp</p>
                          <p>{tea.incubatorTemperature}°C</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500">Sugar Type</p>
                          <p>{tea.sugarType}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500">Sugar</p>
                          <p>{tea.sugarGramsPerLiter} g/L</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500">Inoculum Concentration</p>
                          <p>{tea.inoculumConcentration}%</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500">ID</p>
                          <p>{tea.id}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;