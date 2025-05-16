// src/components/ModeSwitch.js
import React from "react";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";

export default function AutoRidesStatus({ uid }) {
  const [currentMode, setCurrentMode] = useState("cab");

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "drivers", uid), (snap) => {
      if (snap.exists()) {
        setCurrentMode(snap.data().mode || "cab");
      }
    });

    return () => unsub();
  }, [uid]);

  const toggleMode = async () => {
    const newMode = currentMode === "cab" ? "auto" : "cab";
    try {
      await updateDoc(doc(db, "drivers", uid), {
        mode: newMode,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error updating mode:", error);
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow mb-4">
      <h2 className="text-xl font-semibold mb-3">Driver Mode</h2>
      <div className="flex items-center">
        <span className="mr-3">Current Mode:</span>
        <button 
          onClick={toggleMode}
          className={`px-4 py-2 rounded-md mr-2 ${
            currentMode === "cab" 
              ? "bg-blue-500 text-white" 
              : "bg-gray-200"
          }`}
        >
          Cab
        </button>
        <button 
          onClick={toggleMode}
          className={`px-4 py-2 rounded-md ${
            currentMode === "auto" 
              ? "bg-green-500 text-white" 
              : "bg-gray-200"
          }`}
        >
          Auto
        </button>
      </div>
      <div className="mt-2 text-sm text-gray-500">
        <p>Driver: Rahul Bhagat</p>
        <p>Vehicle: UP09DSLR</p>
      </div>
    </div>
  );
}