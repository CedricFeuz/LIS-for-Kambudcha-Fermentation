"use client";
import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaSave, FaFlask, FaFilePdf, FaFileExcel } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx'; // Import xlsx library

const getCurrentLocalTime = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

const formatTimestamp = (timestamp: string | null): string => {
  if (!timestamp) return "";
  try {
    const isUtc = timestamp.endsWith('Z');
    const cleanTimestamp = timestamp.replace('Z', '');
    let date;
    if (isUtc) {
      date = new Date(timestamp);
    } else {
      date = new Date(cleanTimestamp);
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (e) {
    console.error("Error formatting timestamp:", e);
    return "Invalid date";
  }
}; 

const formatForInput = (timestamp: string | null): string => {
  if (!timestamp) return "";
  try {
    const isUtc = timestamp.endsWith('Z');
    const cleanTimestamp = timestamp.replace('Z', '');
    let date;
    if (isUtc) {
      date = new Date(timestamp);
    } else {
      date = new Date(cleanTimestamp);
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (e) {
    console.error("Error formatting for input:", e);
    return "";
  }
};

const processInputTime = (input: string): string => {
  try {
    const inputDate = new Date(input);
    const year = inputDate.getFullYear();
    const month = String(inputDate.getMonth() + 1).padStart(2, '0');
    const day = String(inputDate.getDate()).padStart(2, '0');
    const hours = String(inputDate.getHours()).padStart(2, '0');
    const minutes = String(inputDate.getMinutes()).padStart(2, '0');
    const seconds = String(inputDate.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  } catch (e) {
    console.error("Error processing input time:", e);
    return "";
  }
};

const migrateTimestamp = (timestamp: string | null, isRequired: boolean = false): string | null => {
  if (!timestamp) {
    return isRequired ? getCurrentLocalTime() : null;
  }
  try {
    if (!timestamp.endsWith('Z')) {
      return timestamp;
    }
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  } catch (e) {
    console.error("Error migrating timestamp:", e);
    return isRequired ? getCurrentLocalTime() : timestamp;
  }
};

interface ExperimentProps {
  onReturn: () => void;
  currentUser: {
    username: string;
    name?: string;
  } | null;
  currentExperiment: Experiment | null;
  onSaveExperiment: (experiment: Experiment) => void;
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

function Experiment({ onReturn, currentUser, currentExperiment, onSaveExperiment }: ExperimentProps) {
  const [experiment, setExperiment] = useState<Experiment | null>(currentExperiment);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null); // Für Statusmeldungen

  useEffect(() => {
    if (currentExperiment) {
      // Create initial scobyWeights array if it doesn't exist
      let scobyWeightsArray: ScobyWeight[] = [];
      if (currentExperiment.scobyWeights) {
        scobyWeightsArray = currentExperiment.scobyWeights;
      } else if ('scobyWeight' in currentExperiment && (currentExperiment as any).scobyWeight !== null) {
        // If we're migrating from the old format, create a default entry
        // Just use the first tea as a placeholder
        const firstBatch = currentExperiment.batches[0];
        if (firstBatch) {
          scobyWeightsArray = [{
            teaId: firstBatch.teaId,
            teaName: firstBatch.teaName,
            weight: (currentExperiment as any).scobyWeight
          }];
        }
      }
      
      // Create initial scobyWeightsDried array if it doesn't exist
      let scobyWeightsDriedArray: ScobyWeightDried[] = [];
      if (currentExperiment.scobyWeightsDried) {
        scobyWeightsDriedArray = currentExperiment.scobyWeightsDried;
      } else if ('scobyWeightDried' in currentExperiment && (currentExperiment as any).scobyWeightDried !== null) {
        // If we're migrating from the old format, create a default entry
        // Just use the first tea as a placeholder
        const firstBatch = currentExperiment.batches[0];
        if (firstBatch) {
          scobyWeightsDriedArray = [{
            teaId: firstBatch.teaId,
            teaName: firstBatch.teaName,
            weight: (currentExperiment as any).scobyWeightDried
          }];
        }
      }

      // Migrate count fields from number to array
      const migratedBatches = currentExperiment.batches.map(batch => {
        // Initialize arrays with default values if needed
        const defaultNumberOfSamples = currentExperiment.numberOfSamples || 3;
        
        let labCountArray: number[] | null = null;
        let aabCountArray: number[] | null = null;
        let yeastMouldCountArray: number[] | null = null;
        
        // Convert single number to array or initialize as null
        if (batch.labCount !== null) {
          // Check if the batch.labCount is already an array
          if (Array.isArray(batch.labCount)) {
            labCountArray = batch.labCount;
          } else {
            // Initialize array with the single value for all samples
            labCountArray = Array(defaultNumberOfSamples).fill(batch.labCount);
          }
        }
        
        if (batch.aabCount !== null) {
          if (Array.isArray(batch.aabCount)) {
            aabCountArray = batch.aabCount;
          } else {
            aabCountArray = Array(defaultNumberOfSamples).fill(batch.aabCount);
          }
        }
        
        if (batch.yeastMouldCount !== null) {
          if (Array.isArray(batch.yeastMouldCount)) {
            yeastMouldCountArray = batch.yeastMouldCount;
          } else {
            yeastMouldCountArray = Array(defaultNumberOfSamples).fill(batch.yeastMouldCount);
          }
        }
        
        return {
          ...batch,
          takenOut: migrateTimestamp(batch.takenOut),
          plated: migrateTimestamp(batch.plated),
          hplcVial: migrateTimestamp(batch.hplcVial),
          phTimestamp: migrateTimestamp(batch.phTimestamp),
          labCount: labCountArray,
          aabCount: aabCountArray,
          yeastMouldCount: yeastMouldCountArray
        };
      });
  
      const migratedExperiment: Experiment = {
        ...currentExperiment,
        description: currentExperiment.description || '',
        date: migrateTimestamp(currentExperiment.date, true) as string,
        protocolDate: currentExperiment.protocolDate || null,
        cellCountingDate: currentExperiment.cellCountingDate || null,
        scobyDriedDate: currentExperiment.scobyDriedDate || null,
        protocolNotes: currentExperiment.protocolNotes || '', 
        cellCountingNotes: currentExperiment.cellCountingNotes || '',
        scobyDriedNotes: currentExperiment.scobyDriedNotes || '',
        protocolUserName: currentExperiment.protocolUserName || null,
        cellCountingUserName: currentExperiment.cellCountingUserName || null,
        scobyDriedUserName: currentExperiment.scobyDriedUserName || null,
        scobyWeights: scobyWeightsArray,
        scobyWeightsDried: scobyWeightsDriedArray,
        numberOfSamples: currentExperiment.numberOfSamples || 3, // Set default to 3 if not present
        batches: migratedBatches
      };
      setExperiment(migratedExperiment);
    } else {
      setExperiment(null);
    }
  }, [currentExperiment]);

  useEffect(() => {
    if (exportStatus) {
      const timer = setTimeout(() => {
        setExportStatus(null);
      }, 5000); // Nach 5 Sekunden löschen
      return () => clearTimeout(timer);
    }
  }, [exportStatus]);

  const handleSaveExperiment = () => {
    if (experiment) {
      onSaveExperiment(experiment);
      setHasUnsavedChanges(false);
    }
  };

  const handleReturnClick = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Do you want to save before returning?')) {
        handleSaveExperiment();
      }
    }
    onReturn();
  };

  const saveFileToServer = async (fileData: string, fileName: string, fileType: string) => {
    if (!currentUser) {
      setExportStatus("Fehler: Kein Benutzer angemeldet");
      return null;
    }
  
    try {
      const response = await fetch('/api/saveFile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: currentUser.username,
          fileData,
          fileName,
          fileType
        }),
      });
  
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Unbekannter Fehler');
      }
      
      return result.filePath;
    } catch (error) {
      console.error('Fehler beim Speichern der Datei:', error);
      throw error;
    }
  };

  // Update batch field
  const updateBatch = (batchId: string, field: keyof Batch, value: any) => {
    if (!experiment) return;

    const updatedBatches = experiment.batches.map(batch => {
      if (batch.id === batchId) {
        return { ...batch, [field]: value };
      }
      return batch;
    });

    setExperiment({ ...experiment, batches: updatedBatches });
    setHasUnsavedChanges(true);
  };

  // Update batch count value at specific index
  const updateBatchCountValue = (
    batchId: string, 
    field: 'labCount' | 'aabCount' | 'yeastMouldCount', 
    sampleIndex: number, 
    value: number | null
  ) => {
    if (!experiment) return;

    const updatedBatches = experiment.batches.map(batch => {
      if (batch.id === batchId) {
        // Initialize array if null
        let countArray = batch[field] || Array(experiment.numberOfSamples).fill(null);
        
        // Create a copy of the array
        const newCountArray = [...countArray];
        
        // Update the specific index
        newCountArray[sampleIndex] = value;
        
        // Check if all values are null, if so set the whole array to null
        const allNull = newCountArray.every(val => val === null);
        
        return { 
          ...batch, 
          [field]: allNull ? null : newCountArray 
        };
      }
      return batch;
    });

    setExperiment({ ...experiment, batches: updatedBatches });
    setHasUnsavedChanges(true);
  };

  // Update number of samples
  const updateNumberOfSamples = (newNumberOfSamples: number) => {
    if (!experiment || newNumberOfSamples < 1) return;

    // Update all batch count arrays to match the new size
    const updatedBatches = experiment.batches.map(batch => {
      const newLabCount = adjustArraySize(batch.labCount, newNumberOfSamples);
      const newAabCount = adjustArraySize(batch.aabCount, newNumberOfSamples);
      const newYeastMouldCount = adjustArraySize(batch.yeastMouldCount, newNumberOfSamples);
      
      return {
        ...batch,
        labCount: newLabCount,
        aabCount: newAabCount,
        yeastMouldCount: newYeastMouldCount
      };
    });

    setExperiment({ 
      ...experiment, 
      numberOfSamples: newNumberOfSamples,
      batches: updatedBatches
    });
    setHasUnsavedChanges(true);
  };

  // Helper function to adjust array size when changing number of samples
  const adjustArraySize = (array: number[] | null, newSize: number): number[] | null => {
    if (array === null) return null;
    
    // If array is smaller, pad with nulls
    if (array.length < newSize) {
      return [...array, ...Array(newSize - array.length).fill(null)];
    }
    // If array is larger, truncate
    if (array.length > newSize) {
      return array.slice(0, newSize);
    }
    // If same size, return original
    return array;
  };

  const setCurrentTime = (batchId: string, field: 'takenOut' | 'plated' | 'hplcVial' | 'phTimestamp') => {
    const currentTime = getCurrentLocalTime();
    updateBatch(batchId, field, currentTime);
  };

  const groupBatchesByTea = () => {
    if (!experiment) return [];

    const teaGroups: { [key: string]: Batch[] } = {};
    
    experiment.batches.forEach(batch => {
      const key = `${batch.teaId}-${batch.teaName}`;
      if (!teaGroups[key]) {
        teaGroups[key] = [];
      }
      teaGroups[key].push(batch);
    });

    return Object.entries(teaGroups).map(([key, batches]) => {
      const [teaId, teaName] = key.split('-');
      return {
        teaId: parseInt(teaId),
        teaName: teaName,
        batches: batches.sort((a, b) => a.replicate - b.replicate)
      };
    });
  };

  if (!experiment || !currentUser) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="text-center p-8 bg-gray-50 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">No Experiment Selected</h2>
          <p className="mb-4">Please select an experiment from the notebook or create a new one.</p>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            onClick={onReturn}
          >
            Return to Notebook
          </button>
        </div>
      </div>
    );
  }

  const teaGroups = groupBatchesByTea();
  const allBatches = teaGroups.flatMap(group => 
    group.batches.map(batch => ({
      ...batch,
      groupName: group.teaName
    }))
  );
  const sortedBatches = allBatches.sort((a, b) => {
    if (a.teaName !== b.teaName) {
      return a.teaName.localeCompare(b.teaName);
    }
    return a.replicate - b.replicate;
  });

  // Funktion zum Speichern von Dateien direkt als Binärdaten
  const saveBinaryFileToServer = async (fileData: Blob, fileName: string) => {
    if (!currentUser) {
      setExportStatus("Fehler: Kein Benutzer angemeldet");
      return null;
    }

    try {
      // FormData für Binärdaten erstellen
      const formData = new FormData();
      formData.append('username', currentUser.username);
      
      // Blob in File-Objekt konvertieren
      const file = new File([fileData], fileName, { type: fileData.type });
      formData.append('file', file);
      
      const response = await fetch('/api/saveBinaryFile', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Unbekannter Fehler');
      }
      
      return result.filePath;
    } catch (error) {
      console.error('Fehler beim Speichern der Datei:', error);
      throw error;
    }
  };

  // Calculate average of count arrays for export and display
  const calculateAverage = (counts: number[] | null): number | null => {
    if (!counts || counts.length === 0 || counts.every(val => val === null)) {
      return null;
    }
    
    // Filter out null values
    const validCounts = counts.filter(val => val !== null) as number[];
    
    if (validCounts.length === 0) {
      return null;
    }
    
    // Calculate average of valid values
    const sum = validCounts.reduce((acc, val) => acc + val, 0);
    return sum / validCounts.length;
  };

  // Aktualisierte PDF-Export-Funktion
  const handleExportPdf = async () => {
    if (!experiment || !currentUser || isExportingPdf) return;
    setIsExportingPdf(true);
    setExportStatus("PDF wird generiert...");

    try {
      // Fetch tea settings from the userSettings.json file
      const userSettingsResponse = await fetch('/userSettings.json');
      if (!userSettingsResponse.ok) {
        throw new Error('Could not fetch user settings');
      }
      
      const userSettingsData = await userSettingsResponse.json();
      
      // Get the current user's settings
      const userSettings = userSettingsData[currentUser.username];
      
      // Get the user's tea settings
      const teaSettings: TeaSettings[] = userSettings?.teas || [];
      
      // Create a map of tea settings for easy lookup by ID
      const teaSettingsMap = new Map<number, TeaSettings>();
      teaSettings.forEach(tea => {
        teaSettingsMap.set(tea.id, tea);
      });
      
      // Create PDF
      const doc = new jsPDF();
      const pageHeight = doc.internal.pageSize.height;
      let yPos = 20; // Initial Y position
    
      // Title and General Info - Biggest font size
      doc.setFontSize(20);
      doc.text(`Experiment: ${experiment.name}`, 14, yPos);
      yPos += 12;
    
      // Description - Second biggest font size
      doc.setFontSize(16);
      doc.text("Description:", 14, yPos);
      yPos += 8;
      
      // Normal text for description
      doc.setFontSize(10);
      // Handle potential multi-line description
      const descriptionLines = doc.splitTextToSize(experiment.description || 'N/A', 180);
      doc.text(descriptionLines, 14, yPos);
      yPos += descriptionLines.length * 5 + 12;
    
      // --- Tea Settings Table ---
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 20;
      }
      
      // Get unique teas from experiment batches
      const uniqueTeaIds = [...new Set(experiment.batches.map(batch => batch.teaId))];
      const teasInExperiment: TeaSettings[] = [];
      
      // For each unique tea ID in the experiment, get the full tea settings
      uniqueTeaIds.forEach(teaId => {
        const teaSetting = teaSettingsMap.get(teaId);
        if (teaSetting) {
          teasInExperiment.push(teaSetting);
        } else {
          // If tea settings not found, create a minimal entry using batch info
          const batchWithTea = experiment.batches.find(batch => batch.teaId === teaId);
          if (batchWithTea) {
            teasInExperiment.push({
              id: teaId,
              name: batchWithTea.teaName,
              teaGramsPerLiter: 0,
              incubatorTemperature: 0,
              sugarType: 'Unknown',
              sugarGramsPerLiter: 0,
              inoculumConcentration: 0
            });
          }
        }
      });
      
      // Tea Settings - Second biggest font size
      doc.setFontSize(16);
      doc.text("Tea Settings", 14, yPos);
      yPos += 8;
      
      const teaHeaders = [["Tea Name", "Tea (g/L)", "Incubator Temp.", "Sugar Type", "Sugar (g/L)", "Incubator Conc.", "Tea ID"]];
      const teaBody = teasInExperiment.map(tea => [
        tea.name,
        tea.teaGramsPerLiter.toString(),
        tea.incubatorTemperature.toString() + "°C",
        tea.sugarType,
        tea.sugarGramsPerLiter.toString(),
        tea.inoculumConcentration.toString() + "%",
        tea.id.toString()
      ]);
      
      autoTable(doc, {
        head: teaHeaders,
        body: teaBody,
        startY: yPos,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 35 }, // Tea Name
        },
        didDrawPage: (data) => {
          yPos = data.cursor?.y ?? yPos;
        }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 12;
    
      // --- Protocol Table ---
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 20;
      }
      
      // Protocol header - Second biggest font size
      doc.setFontSize(16);
      doc.text(`Protocol: Taken Out, Plated, HPLC, pH`, 14, yPos);
      yPos += 8;
      
      // Normal text for user info
      doc.setFontSize(10);
      
      // Zeige Protocol User Name, falls vorhanden
      const protocolUserText = experiment.protocolUserName 
        ? `Name: ${experiment.protocolUserName}    Date: ${experiment.protocolDate || 'N/A'}`
        : `Date: ${experiment.protocolDate || 'N/A'}`;
      
      doc.text(protocolUserText, 14, yPos);
      yPos += 8;
    
      const protocolHeaders = [["Tea", "Rep.", "Taken Out", "Plated", "HPLC Vial", "pH", "pH Time"]];
      const protocolBody = sortedBatches.map(b => [
        b.teaName,
        b.replicate,
        formatTimestamp(b.takenOut),
        formatTimestamp(b.plated),
        formatTimestamp(b.hplcVial),
        b.phValue !== null ? b.phValue.toFixed(2) : 'N/A',
        formatTimestamp(b.phTimestamp)
      ]);
    
      autoTable(doc, {
        head: protocolHeaders,
        body: protocolBody,
        startY: yPos,
        theme: 'grid',
        headStyles: { fillColor: [22, 160, 133] },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 10 },
        },
        didDrawPage: (data) => {
          yPos = data.cursor?.y ?? yPos;
        }
      });
    
      yPos = (doc as any).lastAutoTable.finalY + 10;
    
      if (experiment.scobyWeights && experiment.scobyWeights.length > 0) {
        if (yPos > pageHeight - 60) {
          doc.addPage();
          yPos = 20;
        }
        // Scoby Weight section - Third biggest font size
        doc.setFontSize(14);
        doc.text("Scoby Weights per Tea:", 14, yPos);
        yPos += 7;
        
        // Create a table for scoby weights
        const scobyWeightHeaders = [["Tea", "Weight (g)"]];
        const scobyWeightBody = experiment.scobyWeights.map(sw => [
          sw.teaName,
          sw.weight.toFixed(2)
        ]);
        
        autoTable(doc, {
          head: scobyWeightHeaders,
          body: scobyWeightBody,
          startY: yPos,
          theme: 'grid',
          headStyles: { fillColor: [155, 89, 182] }, // Different color for this table
          styles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 40 }, // Tea Name
            1: { cellWidth: 20 }, // Weight
          },
          didDrawPage: (data) => {
            yPos = data.cursor?.y ?? yPos;
          }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 8;
      }
      
      // Protocol Notes
      if (experiment.protocolNotes) {
        if (yPos > pageHeight - 60) {
          doc.addPage();
          yPos = 20;
        }
        // Additional Protocol Notes - Third biggest font size
        doc.setFontSize(14);
        doc.text("Additional Protocol Notes:", 14, yPos);
        yPos += 7;
        
        // Normal text for notes
        doc.setFontSize(10);
        const protoNotesLines = doc.splitTextToSize(experiment.protocolNotes, 180);
        doc.text(protoNotesLines, 14, yPos);
        yPos += protoNotesLines.length * 5 + 10;
      }
    
      // --- Protocol: Scoby weight dried ---
      if (experiment.scobyWeightsDried && experiment.scobyWeightsDried.length > 0) {
        // --- Protocol: Scoby weight dried ---
        if (yPos > pageHeight - 60) {
          doc.addPage();
          yPos = 20;
        }
        
        // Protocol header - Second biggest font size
        doc.setFontSize(16);
        doc.text("Protocol: Scoby weight dried", 14, yPos);
        yPos += 8;
        
        // Normal text for user info
        doc.setFontSize(10);
        
        // Zeige Scoby Dried User Name, falls vorhanden
        const scobyDriedUserText = experiment.scobyDriedUserName 
          ? `Name: ${experiment.scobyDriedUserName}    Date: ${experiment.scobyDriedDate || 'N/A'}`
          : `Date: ${experiment.scobyDriedDate || 'N/A'}`;
        
        doc.text(scobyDriedUserText, 14, yPos);
        yPos += 8;
        
        // Create a table for scoby weights dried
        const scobyWeightDriedHeaders = [["Tea", "Weight Dried (g)"]];
        const scobyWeightDriedBody = experiment.scobyWeightsDried.map(sw => [
          sw.teaName,
          sw.weight.toFixed(2)
        ]);
        
        autoTable(doc, {
          head: scobyWeightDriedHeaders,
          body: scobyWeightDriedBody,
          startY: yPos,
          theme: 'grid',
          headStyles: { fillColor: [145, 61, 136] }, // Different color for this table
          styles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 40 }, // Tea Name
            1: { cellWidth: 20 }, // Weight
          },
          didDrawPage: (data) => {
            yPos = data.cursor?.y ?? yPos;
          }
        });
        
        yPos = (doc as any).lastAutoTable.finalY + 8;
      }
      
      // Scoby dried Notes
      if (experiment.scobyDriedNotes) {
        if (yPos > pageHeight - 60) {
          doc.addPage();
          yPos = 20;
        }
        // Additional Protocol Notes - Third biggest font size
        doc.setFontSize(14);
        doc.text("Additional Protocol Notes:", 14, yPos);
        yPos += 7;
        
        // Normal text for notes
        doc.setFontSize(10);
        const scobyDriedNotesLines = doc.splitTextToSize(experiment.scobyDriedNotes, 180);
        doc.text(scobyDriedNotesLines, 14, yPos);
        yPos += scobyDriedNotesLines.length * 5 + 10;
      }
    
      // --- Cell Counting Table ---
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 20;
      }
      
      // Protocol header - Second biggest font size
      doc.setFontSize(16);
      doc.text("Protocol: Cell Counting", 14, yPos);
      yPos += 8;
      
      // Normal text for user info
      doc.setFontSize(10);
      
      // Show Number of Samples info
      doc.text(`Number of Samples per Batch: ${experiment.numberOfSamples}`, 14, yPos);
      yPos += 6;

      // Zeige Cell Counting User Name, falls vorhanden
      const cellCountingUserText = experiment.cellCountingUserName 
        ? `Name: ${experiment.cellCountingUserName}    Date: ${experiment.cellCountingDate || 'N/A'}`
        : `Date: ${experiment.cellCountingDate || 'N/A'}`;
      
      doc.text(cellCountingUserText, 14, yPos);
      yPos += 8;
    
      // Create headers for detailed samples
      const detailedCountHeaders = [["Tea", "Rep."]];
      
      // Add sample columns for each type
      for (let i = 0; i < experiment.numberOfSamples; i++) {
        detailedCountHeaders[0].push(`LAB #${i+1}`);
      }
      for (let i = 0; i < experiment.numberOfSamples; i++) {
        detailedCountHeaders[0].push(`AAB #${i+1}`);
      }
      for (let i = 0; i < experiment.numberOfSamples; i++) {
        detailedCountHeaders[0].push(`Y+M #${i+1}`);
      }
      
      // Create detailed data
      const detailedCountBody = sortedBatches.map(b => {
        const row = [b.teaName, b.replicate];
        
        // Add LAB counts
        for (let i = 0; i < experiment.numberOfSamples; i++) {
          const value = b.labCount && b.labCount[i] !== null ? b.labCount[i] : 'N/A';
          row.push(value);
        }
        
        // Add AAB counts
        for (let i = 0; i < experiment.numberOfSamples; i++) {
          const value = b.aabCount && b.aabCount[i] !== null ? b.aabCount[i] : 'N/A';
          row.push(value);
        }
        
        // Add Yeast+Mould counts
        for (let i = 0; i < experiment.numberOfSamples; i++) {
          const value = b.yeastMouldCount && b.yeastMouldCount[i] !== null ? b.yeastMouldCount[i] : 'N/A';
          row.push(value);
        }
        
        return row;
      });
      
      autoTable(doc, {
        head: detailedCountHeaders,
        body: detailedCountBody,
        startY: yPos,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 30 }, // Tea Name
          1: { cellWidth: 10 }, // Replicate
        },
        didDrawPage: (data) => {
          yPos = data.cursor?.y ?? yPos;
        }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 10;
      
      // Add average table
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.text("Cell Count Averages:", 14, yPos);
      yPos += 7;
      
      const countHeaders = [["Tea", "Rep.", "LAB Avg", "AAB Avg", "Yeast+Mould Avg"]];
      const countBody = sortedBatches.map(b => [
        b.teaName,
        b.replicate,
        calculateAverage(b.labCount) !== null ? calculateAverage(b.labCount)!.toFixed(2) : 'N/A',
        calculateAverage(b.aabCount) !== null ? calculateAverage(b.aabCount)!.toFixed(2) : 'N/A',
        calculateAverage(b.yeastMouldCount) !== null ? calculateAverage(b.yeastMouldCount)!.toFixed(2) : 'N/A'
      ]);
      
      autoTable(doc, {
        head: countHeaders,
        body: countBody,
        startY: yPos,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 10 },
        },
        didDrawPage: (data) => {
          yPos = data.cursor?.y ?? yPos;
        }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 10;
    
      // Cell Counting Notes
      if (experiment.cellCountingNotes) {
        if (yPos > pageHeight - 60) {
          doc.addPage();
          yPos = 20;
        }
        // Additional Protocol Notes - Third biggest font size
        doc.setFontSize(14);
        doc.text("Additional Protocol Notes:", 14, yPos);
        yPos += 7;
        
        // Normal text for notes
        doc.setFontSize(10);
        const cellNotesLines = doc.splitTextToSize(experiment.cellCountingNotes, 180);
        doc.text(cellNotesLines, 14, yPos);
        yPos += cellNotesLines.length * 5 + 4;
      }
    
      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `Experiment_${experiment.name.replace(/\s+/g, '_')}_${currentUser.username}_${timestamp}.pdf`;

      // PDF als Blob für direkten Upload erzeugen
      const pdfBlob = doc.output('blob');
      
      // Auf dem Server speichern
      const filePath = await saveBinaryFileToServer(pdfBlob, filename);
      
      if (filePath) {
        // Erfolgsmeldung mit Link anzeigen
        setExportStatus(`PDF erfolgreich gespeichert! Pfad: ${filePath}`);
        
        // Optional: Biete auch direkten Download an
        doc.save(filename);
      } else {
        throw new Error("Konnte keine Datei auf dem Server speichern");
      }
    } catch (error) {
      console.error("Fehler bei der PDF-Generierung:", error);
      setExportStatus(`PDF-Generierung fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Aktualisierte Excel-Export-Funktion
  const handleExportExcel = async () => {
    if (!experiment || !currentUser || isExportingExcel) return;
    setIsExportingExcel(true);
    setExportStatus("Excel-Datei wird generiert...");
  
    try {
      const wb = XLSX.utils.book_new();
      
      // Define interface for data rows
      interface ExcelDataRow {
        experiment: string;
        Formulation: string;
        Replication: number;
        Variable: string;
        Sample: number;
        "Analysis date": string;
        "Analysis time": string;
        value: any;
      }
      
      // Create a flat data structure with all measurements
      let flatData: ExcelDataRow[] = [];
      
      // 1. FIRST GROUP: Add scoby weight data
      if (experiment.scobyWeights && experiment.scobyWeights.length > 0) {
        experiment.scobyWeights.forEach(sw => {
          // Extract date and time components
          let dateStr = '';
          let timeStr = '';
          if (experiment.protocolDate) {
            const date = new Date(experiment.protocolDate);
            dateStr = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
            timeStr = ''; // Default time if not available
          }
          
          flatData.push({
            "experiment": experiment.name,
            "Formulation": sw.teaName,
            "Replication": experiment.batches.filter(b => b.teaId === sw.teaId).length,
            "Variable": "Tea weighted",
            "Sample": 1,
            "Analysis date": dateStr,
            "Analysis time": timeStr,
            "value": sw.weight
          });
        });
      }
      
      // 2. SECOND GROUP: Add scoby weight dried data
      if (experiment.scobyWeightsDried && experiment.scobyWeightsDried.length > 0) {
        experiment.scobyWeightsDried.forEach(sw => {
          // Extract date and time components
          let dateStr = '';
          let timeStr = '';
          if (experiment.scobyDriedDate) {
            const date = new Date(experiment.scobyDriedDate);
            dateStr = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
            timeStr = ''; // Default time if not available
          }
          
          flatData.push({
            "experiment": experiment.name,
            "Formulation": sw.teaName,
            "Replication": experiment.batches.filter(b => b.teaId === sw.teaId).length,
            "Variable": "Dried Tea weighted",
            "Sample": 1,
            "Analysis date": dateStr,
            "Analysis time": timeStr,
            "value": sw.weight
          });
        });
      }
      
      // 3. THIRD GROUP: Add all LAB count data
      let cellCountDateStr = '';
      let cellCountTimeStr = '';
      if (experiment.cellCountingDate) {
        const cellCountDate = new Date(experiment.cellCountingDate);
        cellCountDateStr = `${cellCountDate.getDate().toString().padStart(2, '0')}.${(cellCountDate.getMonth() + 1).toString().padStart(2, '0')}.${cellCountDate.getFullYear()}`;
        cellCountTimeStr = ''; // Default time if not available
      }
      
      sortedBatches.forEach(batch => {
        // LAB count (average)
        if (batch.labCount && !batch.labCount.every(val => val === null)) {
          const labAvg = calculateAverage(batch.labCount);
          if (labAvg !== null) {
            flatData.push({
              "experiment": experiment.name,
              "Formulation": batch.teaName,
              "Replication": batch.replicate,
              "Variable": "LAB",
              "Sample": experiment.numberOfSamples,
              "Analysis date": cellCountDateStr,
              "Analysis time": cellCountTimeStr,
              "value": labAvg
            });
          }
        }
      });
      
      // 4. FOURTH GROUP: Add all AAB count data
      sortedBatches.forEach(batch => {
        // AAB count (average)
        if (batch.aabCount && !batch.aabCount.every(val => val === null)) {
          const aabAvg = calculateAverage(batch.aabCount);
          if (aabAvg !== null) {
            flatData.push({
              "experiment": experiment.name,
              "Formulation": batch.teaName,
              "Replication": batch.replicate,
              "Variable": "AAB",
              "Sample": experiment.numberOfSamples,
              "Analysis date": cellCountDateStr,
              "Analysis time": cellCountTimeStr,
              "value": aabAvg
            });
          }
        }
      });
      
      // 5. FIFTH GROUP: Add all Y+M count data
      sortedBatches.forEach(batch => {
        // Yeast+Mould count (average)
        if (batch.yeastMouldCount && !batch.yeastMouldCount.every(val => val === null)) {
          const ymAvg = calculateAverage(batch.yeastMouldCount);
          if (ymAvg !== null) {
            flatData.push({
              "experiment": experiment.name,
              "Formulation": batch.teaName,
              "Replication": batch.replicate,
              "Variable": "Y+M",
              "Sample": experiment.numberOfSamples,
              "Analysis date": cellCountDateStr,
              "Analysis time": cellCountTimeStr,
              "value": ymAvg
            });
          }
        }
      });
      
      // 6. SIXTH GROUP: Protocol data (taken out, plated, pH) sorted by time
      // Create temporary arrays for each data type to sort them
      const protocolData: ExcelDataRow[] = [];
      
      sortedBatches.forEach(batch => {
        // Process taken out data
        if (batch.takenOut) {
          const takenOutDate = new Date(batch.takenOut);
          const dateStr = `${takenOutDate.getDate().toString().padStart(2, '0')}.${(takenOutDate.getMonth() + 1).toString().padStart(2, '0')}.${takenOutDate.getFullYear()}`;
          const timeStr = `${takenOutDate.getHours().toString().padStart(2, '0')}:${takenOutDate.getMinutes().toString().padStart(2, '0')}`;
          
          protocolData.push({
            "experiment": experiment.name,
            "Formulation": batch.teaName,
            "Replication": batch.replicate,
            "Variable": "Taken out",
            "Sample": 1,
            "Analysis date": dateStr,
            "Analysis time": timeStr,
            "value": "",
            // Adding timestamp for sorting purposes, will be removed later
            "timestamp": takenOutDate.getTime()
          } as any);
        }
        
        // Process plated data
        if (batch.plated) {
          const platedDate = new Date(batch.plated);
          const dateStr = `${platedDate.getDate().toString().padStart(2, '0')}.${(platedDate.getMonth() + 1).toString().padStart(2, '0')}.${platedDate.getFullYear()}`;
          const timeStr = `${platedDate.getHours().toString().padStart(2, '0')}:${platedDate.getMinutes().toString().padStart(2, '0')}`;
          
          protocolData.push({
            "experiment": experiment.name,
            "Formulation": batch.teaName,
            "Replication": batch.replicate,
            "Variable": "Plated",
            "Sample": 1,
            "Analysis date": dateStr,
            "Analysis time": timeStr,
            "value": "",
            // Adding timestamp for sorting purposes, will be removed later
            "timestamp": platedDate.getTime()
          } as any);
        }
        
        // Process pH data
        if (batch.phTimestamp && batch.phValue !== null) {
          const phDate = new Date(batch.phTimestamp);
          const dateStr = `${phDate.getDate().toString().padStart(2, '0')}.${(phDate.getMonth() + 1).toString().padStart(2, '0')}.${phDate.getFullYear()}`;
          const timeStr = `${phDate.getHours().toString().padStart(2, '0')}:${phDate.getMinutes().toString().padStart(2, '0')}`;
          
          protocolData.push({
            "experiment": experiment.name,
            "Formulation": batch.teaName,
            "Replication": batch.replicate,
            "Variable": "Ph value",
            "Sample": 1,
            "Analysis date": dateStr,
            "Analysis time": timeStr,
            "value": batch.phValue,
            // Adding timestamp for sorting purposes, will be removed later
            "timestamp": phDate.getTime()
          } as any);
        }
        
        // Don't include HPLC Vial per user's request as it wasn't mentioned in the "last three variables"
      });
      
      // Sort protocol data by timestamp
      protocolData.sort((a: any, b: any) => a.timestamp - b.timestamp);
      
      // Remove timestamp property and add to flatData
      protocolData.forEach(item => {
        const { timestamp, ...cleanItem } = item as any;
        flatData.push(cleanItem);
      });
      
      // Create worksheet from the flat data
      const ws = XLSX.utils.json_to_sheet(flatData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 20 }, // experiment
        { wch: 20 }, // Formulation
        { wch: 12 }, // Replication
        { wch: 20 }, // Variable
        { wch: 10 }, // Sample
        { wch: 15 }, // Analysis date
        { wch: 15 }, // Analysis time
        { wch: 15 }  // value
      ];
      
      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, ws, "Experiment Data");
      
      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `Experiment_${experiment.name.replace(/\s+/g, '_')}_${currentUser.username}_${timestamp}.xlsx`;
  
      // Erzeuge Excel als Blob für direkten Upload
      const excelBlob = new Blob(
        [XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], 
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      );
      
      // Auf dem Server speichern
      const filePath = await saveBinaryFileToServer(excelBlob, filename);
      
      if (filePath) {
        // Erfolgsmeldung mit Link anzeigen
        setExportStatus(`Excel-Datei erfolgreich gespeichert! Pfad: ${filePath}`);
        
        // Optional: Biete auch direkten Download an
        XLSX.writeFile(wb, filename);
      } else {
        throw new Error("Konnte keine Datei auf dem Server speichern");
      }
    } catch (error) {
      console.error("Fehler bei der Excel-Generierung:", error);
      setExportStatus(`Excel-Generierung fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Create header cells for cell counting table
  const renderCountHeaders = () => {
    const headers = [];
    
    // LAB Sample headers
    for (let i = 0; i < experiment.numberOfSamples; i++) {
      headers.push(
        <th key={`lab-header-${i}`} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[90px]">
          LAB #{i+1}
        </th>
      );
    }
    
    // AAB Sample headers
    for (let i = 0; i < experiment.numberOfSamples; i++) {
      headers.push(
        <th key={`aab-header-${i}`} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[90px]">
          AAB #{i+1}
        </th>
      );
    }
    
    // Yeast+Mould Sample headers
    for (let i = 0; i < experiment.numberOfSamples; i++) {
      headers.push(
        <th key={`ym-header-${i}`} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[90px]">
          Y+M #{i+1}
        </th>
      );
    }
    
    return headers;
  };

  // Render input cells for each count type
  const renderCountInputs = (batch: Batch & { groupName?: string }) => {
    const inputs = [];
    
    // LAB Sample inputs
    for (let i = 0; i < experiment.numberOfSamples; i++) {
      inputs.push(
        <td key={`lab-input-${batch.id}-${i}`} className="px-2 py-2 text-sm text-center">
          <input 
            type="number" 
            className="border border-gray-300 rounded px-2 py-1 w-full text-sm"
            value={(batch.labCount && batch.labCount[i] !== null) ? batch.labCount[i] : ''}
            onChange={(e) => updateBatchCountValue(
              batch.id, 
              'labCount', 
              i, 
              e.target.value ? parseInt(e.target.value) : null
            )}
            placeholder={`LAB #${i+1}`}
          />
        </td>
      );
    }
    
    // AAB Sample inputs
    for (let i = 0; i < experiment.numberOfSamples; i++) {
      inputs.push(
        <td key={`aab-input-${batch.id}-${i}`} className="px-2 py-2 text-sm text-center">
          <input 
            type="number" 
            className="border border-gray-300 rounded px-2 py-1 w-full text-sm"
            value={(batch.aabCount && batch.aabCount[i] !== null) ? batch.aabCount[i] : ''}
            onChange={(e) => updateBatchCountValue(
              batch.id, 
              'aabCount', 
              i, 
              e.target.value ? parseInt(e.target.value) : null
            )}
            placeholder={`AAB #${i+1}`}
          />
        </td>
      );
    }
    
    // Yeast+Mould Sample inputs
    for (let i = 0; i < experiment.numberOfSamples; i++) {
      inputs.push(
        <td key={`ym-input-${batch.id}-${i}`} className="px-2 py-2 text-sm text-center">
          <input 
            type="number" 
            className="border border-gray-300 rounded px-2 py-1 w-full text-sm"
            value={(batch.yeastMouldCount && batch.yeastMouldCount[i] !== null) ? batch.yeastMouldCount[i] : ''}
            onChange={(e) => updateBatchCountValue(
              batch.id, 
              'yeastMouldCount', 
              i, 
              e.target.value ? parseInt(e.target.value) : null
            )}
            placeholder={`Y+M #${i+1}`}
          />
        </td>
      );
    }
    
    return inputs;
  };

  return (
    <div className="experiment-container h-screen flex flex-col">
      <div className="topbar bg-white border-b border-slate-200 p-4 flex justify-between items-center">
        <button
          className="px-4 py-2 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors border border-slate-200 flex items-center gap-2"
          onClick={handleReturnClick}
        >
          <FaArrowLeft size={14} />
          Return to Notebook
        </button>
        
        <div className="text-xl font-semibold absolute left-1/2 transform -translate-x-1/2">
          Experiment: {experiment.name}
        </div>
        
        {/* Action Buttons Group */}
        <div className="flex items-center gap-2">
           {/* Export PDF Button */}
           <button
             className={`px-3 py-2 rounded-md flex items-center gap-1.5 text-sm ${
               isExportingPdf
                 ? 'bg-red-300 text-white cursor-not-allowed'
                 : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
             }`}
             onClick={handleExportPdf}
             disabled={isExportingPdf || isExportingExcel} // Disable if any export is active
             title="Export as PDF"
           >
             <FaFilePdf size={14} />
             {isExportingPdf ? 'Exporting...' : 'PDF'}
           </button>
           {/* Export Excel Button */}
           <button
             className={`px-3 py-2 rounded-md flex items-center gap-1.5 text-sm ${
                isExportingExcel
                 ? 'bg-green-300 text-white cursor-not-allowed'
                 : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
             }`}
             onClick={handleExportExcel}
             disabled={isExportingExcel || isExportingPdf} // Disable if any export is active
             title="Export as Excel"
           >
             <FaFileExcel size={14} />
              {isExportingExcel ? 'Exporting...' : 'Excel'}
           </button>
           {exportStatus && (
            <div className="mt-2 p-2 bg-blue-50 text-blue-700 rounded-md">
              {exportStatus}
            </div>
           )}
            {/* Save Button */}
            <button
              className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm ${
                hasUnsavedChanges
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-400 cursor-default border border-gray-200' // Style when disabled
              }`}
              onClick={handleSaveExperiment}
              disabled={!hasUnsavedChanges || isExportingPdf || isExportingExcel} // Disable if exporting
            >
              <FaSave size={14} />
              {hasUnsavedChanges ? 'Save' : 'Saved'}
            </button>
        </div>
        {/* Status-Meldungen außerhalb der Button-Gruppe einfügen, damit sie auf einer neuen Zeile erscheinen */}
        {exportStatus && (
          <div className="mt-2 p-2 bg-blue-50 text-blue-700 rounded-md text-sm">
            {exportStatus}
          </div>
        )}
      </div>
      
      <div className="flex-grow p-2 overflow-auto">
        <div className="experiment-panel w-full mx-auto">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <FaFlask className="text-blue-600" size={18} />
              <h2 className="text-xl font-semibold">Experiment Details</h2>
            </div>
            <p className="text-gray-700">{experiment.description}</p>
          </div>
          
          <div className="border border-gray-200 rounded-lg overflow-hidden mb-8">
            <div className="bg-gray-50 p-3 border-b border-gray-200 flex items-center gap-4">
              <h3 className="font-medium flex-grow">Protocol: Taken Out, Plated, HPLC, pH</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Name:</label>
                  <input 
                    type="text" 
                    className="border border-gray-300 rounded px-2 py-1 text-sm w-36"
                    value={experiment.protocolUserName || ''}
                    onChange={(e) => {
                      setExperiment({ ...experiment, protocolUserName: e.target.value || null });
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Enter your name"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Date:</label>
                  <input 
                    type="date" 
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                    value={experiment.protocolDate || ''}
                    onChange={(e) => {
                      setExperiment({ ...experiment, protocolDate: e.target.value || null });
                      setHasUnsavedChanges(true);
                    }}
                  />
                </div>
              </div>
            </div>
            
            <div className="p-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 table-fixed">
                  <colgroup>
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '19%' }} />
                    <col style={{ width: '19%' }} />
                    <col style={{ width: '19%' }} />
                    <col style={{ width: '20%' }} />
                  </colgroup>
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tea</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rep.</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Taken Out</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plated</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HPLC Vial</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">pH Value</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedBatches.map(batch => (
                      <tr key={`time-${batch.id}`}>
                        <td className="px-2 py-2 text-sm text-gray-900">
                          {batch.teaName}
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-900 text-left">
                          {batch.replicate}
                        </td>
                        <td className="px-2 py-2 text-sm">
                          <div className="flex flex-wrap items-center gap-1">
                            <div 
                              className="px-1 py-1 bg-blue-50 text-blue-700 rounded cursor-pointer hover:bg-blue-100 text-xs"
                              onClick={() => setCurrentTime(batch.id, 'takenOut')}
                            >
                              Set Now
                            </div>
                            <input 
                              type="datetime-local" 
                              className="border border-gray-300 rounded px-1 py-1 text-sm w-full mt-1"
                              value={formatForInput(batch.takenOut)}
                              onChange={(e) => {
                                const value = e.target.value ? processInputTime(e.target.value) : null;
                                updateBatch(batch.id, 'takenOut', value);
                              }}
                            />
                          </div>
                        </td>
                        <td className="px-2 py-2 text-sm">
                          <div className="flex flex-wrap items-center gap-1">
                            <div 
                              className="px-1 py-1 bg-blue-50 text-blue-700 rounded cursor-pointer hover:bg-blue-100 text-xs"
                              onClick={() => setCurrentTime(batch.id, 'plated')}
                            >
                              Set Now
                            </div>
                            <input 
                              type="datetime-local" 
                              className="border border-gray-300 rounded px-1 py-1 text-sm w-full mt-1"
                              value={formatForInput(batch.plated)}
                              onChange={(e) => {
                                const value = e.target.value ? processInputTime(e.target.value) : null;
                                updateBatch(batch.id, 'plated', value);
                              }}
                            />
                          </div>
                        </td>
                        <td className="px-2 py-2 text-sm">
                          <div className="flex flex-wrap items-center gap-1">
                            <div 
                              className="px-1 py-1 bg-blue-50 text-blue-700 rounded cursor-pointer hover:bg-blue-100 text-xs"
                              onClick={() => setCurrentTime(batch.id, 'hplcVial')}
                            >
                              Set Now
                            </div>
                            <input 
                              type="datetime-local" 
                              className="border border-gray-300 rounded px-1 py-1 text-sm w-full mt-1"
                              value={formatForInput(batch.hplcVial)}
                              onChange={(e) => {
                                const value = e.target.value ? processInputTime(e.target.value) : null;
                                updateBatch(batch.id, 'hplcVial', value);
                              }}
                            />
                          </div>
                        </td>
                        <td className="px-2 py-2 text-sm">
                          <div className="flex flex-wrap items-center gap-1">
                            <div 
                              className="px-1 py-1 bg-blue-50 text-blue-700 rounded cursor-pointer hover:bg-blue-100 text-xs"
                              onClick={() => setCurrentTime(batch.id, 'phTimestamp')}
                            >
                              Set Now
                            </div>
                            <div className="flex items-center gap-1 w-full mt-1">
                              <input 
                                type="datetime-local" 
                                className="border border-gray-300 rounded px-1 py-1 text-sm flex-1"
                                value={formatForInput(batch.phTimestamp)}
                                onChange={(e) => {
                                  const value = e.target.value ? processInputTime(e.target.value) : null;
                                  updateBatch(batch.id, 'phTimestamp', value);
                                }}
                              />
                              <input 
                                type="number" 
                                step="0.01"
                                min="0"
                                max="14"
                                className="border border-gray-300 rounded px-2 py-1 w-16 text-sm ml-1"
                                value={batch.phValue !== null ? batch.phValue : ''}
                                onChange={(e) => updateBatch(batch.id, 'phValue', e.target.value ? parseFloat(e.target.value) : null)}
                                placeholder="pH"
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-3 border border-gray-200 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scoby Weight per Tea (g):
                </label>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-md">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tea</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Weight (g)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teaGroups.map(group => {
                        // Find existing weight entry for this tea
                        const existingWeight = experiment.scobyWeights?.find(w => w.teaId === group.teaId);
                        
                        return (
                          <tr key={`scoby-weight-${group.teaId}`} className="border-t border-gray-200">
                            <td className="px-4 py-2 text-sm">{group.teaName}</td>
                            <td className="px-4 py-2 text-sm">
                              <input 
                                type="number"
                                step="0.01"
                                min="0"
                                className="w-40 border border-gray-300 rounded-md p-2 text-sm"
                                value={existingWeight?.weight !== undefined ? existingWeight.weight : ''}
                                onChange={(e) => {
                                  // Update or add weight for this tea
                                  const newValue = e.target.value ? parseFloat(e.target.value) : null;
                                  const updatedWeights = [...(experiment.scobyWeights || [])];
                                  const index = updatedWeights.findIndex(w => w.teaId === group.teaId);
                                  
                                  if (index >= 0) {
                                    if (newValue === null) {
                                      // Remove entry if value is empty
                                      updatedWeights.splice(index, 1);
                                    } else {
                                      // Update existing entry
                                      updatedWeights[index] = { 
                                        ...updatedWeights[index], 
                                        weight: newValue 
                                      };
                                    }
                                  } else if (newValue !== null) {
                                    // Add new entry
                                    updatedWeights.push({
                                      teaId: group.teaId,
                                      teaName: group.teaName,
                                      weight: newValue
                                    });
                                  }
                                  
                                  setExperiment({ ...experiment, scobyWeights: updatedWeights });
                                  setHasUnsavedChanges(true);
                                }}
                                placeholder="Enter weight in grams"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Protocol Notes Textarea */}
              <div className="mt-4 p-3 border border-gray-200 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Protocol Notes:
                </label>
                <textarea
                  className="w-full h-32 border border-gray-300 rounded-md p-2 text-sm"
                  placeholder="Enter additional notes about the protocol here..."
                  value={experiment.protocolNotes || ''}
                  onChange={(e) => {
                    setExperiment({ ...experiment, protocolNotes: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                />
              </div>
            </div>
          </div>
          {/* Protocol: Scoby weight dried section - Add after the first protocol section and before the cell counting section */}
          <div className="border border-gray-200 rounded-lg overflow-hidden mb-8">
            <div className="bg-gray-50 p-3 border-b border-gray-200 flex items-center gap-4">
              <h3 className="font-medium flex-grow">Protocol: Scoby weight dried</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Name:</label>
                  <input 
                    type="text" 
                    className="border border-gray-300 rounded px-2 py-1 text-sm w-36"
                    value={experiment.scobyDriedUserName || ''}
                    onChange={(e) => {
                      setExperiment({ ...experiment, scobyDriedUserName: e.target.value || null });
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Enter your name"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Date:</label>
                  <input 
                    type="date" 
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                    value={experiment.scobyDriedDate || ''}
                    onChange={(e) => {
                      setExperiment({ ...experiment, scobyDriedDate: e.target.value || null });
                      setHasUnsavedChanges(true);
                    }}
                  />
                </div>
              </div>
            </div>
            
            <div className="p-3 border border-gray-200 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scoby Weight Dried per Tea (g):
                </label>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-md">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tea</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Weight Dried (g)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teaGroups.map(group => {
                        // Find existing weight entry for this tea
                        const existingWeight = experiment.scobyWeightsDried?.find(w => w.teaId === group.teaId);
                        
                        return (
                          <tr key={`scoby-weight-dried-${group.teaId}`} className="border-t border-gray-200">
                            <td className="px-4 py-2 text-sm">{group.teaName}</td>
                            <td className="px-4 py-2 text-sm">
                              <input 
                                type="number"
                                step="0.01"
                                min="0"
                                className="w-40 border border-gray-300 rounded-md p-2 text-sm"
                                value={existingWeight?.weight !== undefined ? existingWeight.weight : ''}
                                onChange={(e) => {
                                  // Update or add weight for this tea
                                  const newValue = e.target.value ? parseFloat(e.target.value) : null;
                                  const updatedWeights = [...(experiment.scobyWeightsDried || [])];
                                  const index = updatedWeights.findIndex(w => w.teaId === group.teaId);
                                  
                                  if (index >= 0) {
                                    if (newValue === null) {
                                      // Remove entry if value is empty
                                      updatedWeights.splice(index, 1);
                                    } else {
                                      // Update existing entry
                                      updatedWeights[index] = { 
                                        ...updatedWeights[index], 
                                        weight: newValue 
                                      };
                                    }
                                  } else if (newValue !== null) {
                                    // Add new entry
                                    updatedWeights.push({
                                      teaId: group.teaId,
                                      teaName: group.teaName,
                                      weight: newValue
                                    });
                                  }
                                  
                                  setExperiment({ ...experiment, scobyWeightsDried: updatedWeights });
                                  setHasUnsavedChanges(true);
                                }}
                                placeholder="Enter dried weight in grams"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            
              
              {/* Protocol Notes Textarea */}
              <div className="mt-4 p-3 border border-gray-200 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Protocol Notes:
                </label>
                <textarea
                  className="w-full h-32 border border-gray-300 rounded-md p-2 text-sm"
                  placeholder="Enter additional notes about dried scoby weight here..."
                  value={experiment.scobyDriedNotes || ''}
                  onChange={(e) => {
                    setExperiment({ ...experiment, scobyDriedNotes: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                />
              </div>
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 p-3 border-b border-gray-200 flex items-center gap-4">
              <h3 className="font-medium flex-grow">Protocol: Cell Counting</h3>
              <div className="flex items-center gap-4">
                {/* Number of Samples field */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Number of Samples:</label>
                  <input 
                    type="number" 
                    min="1"
                    className="border border-gray-300 rounded px-2 py-1 text-sm w-16"
                    value={experiment.numberOfSamples}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value > 0) {
                        updateNumberOfSamples(value);
                      }
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Name:</label>
                  <input 
                    type="text" 
                    className="border border-gray-300 rounded px-2 py-1 text-sm w-36"
                    value={experiment.cellCountingUserName || ''}
                    onChange={(e) => {
                      setExperiment({ ...experiment, cellCountingUserName: e.target.value || null });
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Enter your name"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Date:</label>
                  <input 
                    type="date" 
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                    value={experiment.cellCountingDate || ''}
                    onChange={(e) => {
                      setExperiment({ ...experiment, cellCountingDate: e.target.value || null });
                      setHasUnsavedChanges(true);
                    }}
                  />
                </div>
              </div>
            </div>
            
            <div className="p-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 min-w-[150px]">Tea</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-[150px] bg-gray-50 z-10 min-w-[50px]">Rep.</th>
                      {renderCountHeaders()}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedBatches.map(batch => (
                      <tr key={`count-${batch.id}`}>
                        <td className="px-2 py-2 text-sm text-gray-900 sticky left-0 bg-white z-10 min-w-[150px]">
                          {batch.teaName}
                        </td>
                        <td className="px-2 py-2 text-sm text-gray-900 text-center sticky left-[150px] bg-white z-10 min-w-[50px]">
                          {batch.replicate}
                        </td>
                        {renderCountInputs(batch)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Averages Display */}
              <div className="mt-6 mb-4">
                <h4 className="font-medium text-gray-700 mb-2">Cell Count Averages</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tea</th>
                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Rep.</th>
                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">LAB Avg.</th>
                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">AAB Avg.</th>
                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Y+M Avg.</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedBatches.map(batch => (
                        <tr key={`avg-${batch.id}`}>
                          <td className="px-2 py-2 text-sm text-gray-900">{batch.teaName}</td>
                          <td className="px-2 py-2 text-sm text-gray-900 text-center">{batch.replicate}</td>
                          <td className="px-2 py-2 text-sm text-center">
                            {calculateAverage(batch.labCount) !== null 
                              ? calculateAverage(batch.labCount)!.toFixed(2) 
                              : 'N/A'}
                          </td>
                          <td className="px-2 py-2 text-sm text-center">
                            {calculateAverage(batch.aabCount) !== null 
                              ? calculateAverage(batch.aabCount)!.toFixed(2) 
                              : 'N/A'}
                          </td>
                          <td className="px-2 py-2 text-sm text-center">
                            {calculateAverage(batch.yeastMouldCount) !== null 
                              ? calculateAverage(batch.yeastMouldCount)!.toFixed(2) 
                              : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Cell Counting Notes Textarea */}
              <div className="mt-4 p-3 border border-gray-200 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Protocol Notes:
                </label>
                <textarea
                  className="w-full h-32 border border-gray-300 rounded-md p-2 text-sm"
                  placeholder="Enter additional notes about cell counting here..."
                  value={experiment.cellCountingNotes || ''}
                  onChange={(e) => {
                    setExperiment({ ...experiment, cellCountingNotes: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Experiment;
