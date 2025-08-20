"use client";
import { useState } from 'react';
import Notebook from './components/notebook';
import Settings from './components/settings';
import ExperimentComponent from './components/experiment';

interface User {
  username: string;
  password?: string;
  name?: string;
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

export default function Home() {
  const [currentView, setCurrentView] = useState<'notebook' | 'settings' | 'experiment'>('notebook');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentExperiment, setCurrentExperiment] = useState<Experiment | null>(null);
 
  const openSettings = () => {
    setCurrentView('settings');
  };
 
  const openNotebook = () => {
    setCurrentView('notebook');
    setCurrentExperiment(null);
  };
 
  const openExperiment = (experiment: Experiment) => {
    setCurrentExperiment(experiment);
    setCurrentView('experiment');
  };
  
  const handleUserLogin = (user: User) => {
    setCurrentUser(user);
  };
  
  const handleUserLogout = () => {
    setCurrentUser(null);
    if (currentView !== 'notebook') {
      setCurrentView('notebook');
    }
    setCurrentExperiment(null);
  };
 
  const handleCreateExperiment = (experiment: Experiment) => {
    setCurrentExperiment(experiment);
    setCurrentView('experiment');
  };
  const handleSaveExperiment = async (updatedExperiment: Experiment) => {
    if (!currentUser) return;
    
    try {
      const response = await fetch('/userSettings.json');
      if (!response.ok) throw new Error('Failed to load settings');
      
      const data = await response.json();
      
      const userSettings = data[currentUser.username];
      const experiments = userSettings.experiments || [];
      
      const updatedExperiments = experiments.map((exp: Experiment) => 
        exp.id === updatedExperiment.id ? updatedExperiment : exp
      );
      
      const updatedSettings = {
        ...data,
        [currentUser.username]: {
          ...userSettings,
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
      
      setCurrentExperiment(updatedExperiment);
      
    } catch (error) {
      console.error('Error saving experiment:', error);
      alert('Failed to save experiment. Please try again.');
    }
  };
 
  return (
    <main>
      {currentView === 'settings' && (
        <Settings 
          onReturn={openNotebook} 
          currentUser={currentUser}
        />
      )}
      
      {currentView === 'notebook' && (
        <Notebook 
          onOpenSettings={openSettings} 
          onUserLogin={handleUserLogin}
          onUserLogout={handleUserLogout}
          currentUser={currentUser}
          onOpenExperiment={openExperiment}
          onCreateExperiment={handleCreateExperiment}
        />
      )}
      
      {currentView === 'experiment' && (
        <ExperimentComponent
          onReturn={openNotebook}
          currentUser={currentUser}
          currentExperiment={currentExperiment}
          onSaveExperiment={handleSaveExperiment}
        />
      )}
    </main>
  );
}