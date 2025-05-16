// src/components/CurrentRide.js
import React from "react";
import { doc, updateDoc, arrayUnion, onSnapshot} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";

export default function CurrentRide({ uid }) {
  const [driverData, setDriverData] = useState(null);
  const [showPassengers, setShowPassengers] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "drivers", uid), (snap) => {
      if (snap.exists()) setDriverData(snap.data());
    });

    return () => unsub();
  }, [uid]);

  const completeRide = async () => {
    if (!driverData?.currentRide) return;
    
    setIsCompleting(true);
    try {
      const completedRide = {
        ...driverData.currentRide,
        status: "completed",
        completedAt: new Date().toISOString()
      };

      // Update the driver document
      await updateDoc(doc(db, "drivers", uid), {
        previousRides: arrayUnion(completedRide),
        currentRide: null,
        updatedAt: new Date().toISOString()
      });

      // If this was an accepted request, update the request status
      if (driverData.currentRide.requestId) {
        await updateDoc(doc(db, "requests", driverData.currentRide.requestId), {
          status: "completed",
          completedAt: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error("Error completing ride:", error);
    } finally {
      setIsCompleting(false);
    }
  };

  if (!driverData) return <div className="bg-white p-4 rounded shadow">Loading ride data...</div>;

  const currentRide = driverData.currentRide || null;

  if (!currentRide) return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-semibold mb-2">Current Ride</h2>
      <p className="text-gray-500">No active ride at the moment</p>
      <p className="text-sm mt-1">
        Mode: <span className={`px-2 py-0.5 rounded text-xs ${
          driverData.mode === 'auto' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
        }`}>
          {driverData.mode?.toUpperCase() || 'CAB'}
        </span>
      </p>
    </div>
  );

  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="flex justify-between items-start mb-3">
        <h2 className="text-xl font-semibold">Current Ride</h2>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs ${
            currentRide.status === 'completed' ? 'bg-green-100 text-green-800' :
            currentRide.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {currentRide.status?.toUpperCase() || 'ACTIVE'}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs ${
            currentRide.mode === 'auto' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
          }`}>
            {currentRide.mode?.toUpperCase() || 'CAB'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-sm text-gray-500 font-medium">From</p>
          <p>{currentRide.pickup}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium">To</p>
          <p>{currentRide.drop}</p>
        </div>
      </div>

      {currentRide.mode === 'auto' && currentRide.route && (
        <div className="mb-3">
          <p className="text-sm text-gray-500 font-medium">Route</p>
          <p>{currentRide.route}</p>
        </div>
      )}

      {currentRide.fare && (
        <div className="mb-3">
          <p className="text-sm text-gray-500 font-medium">Fare</p>
          <p>₹{currentRide.fare.toFixed(2)}</p>
        </div>
      )}

      {currentRide.passengers?.length > 0 && (
        <div className="border-t pt-3">
          <button 
            onClick={() => setShowPassengers(!showPassengers)}
            className="flex items-center text-sm font-medium"
          >
            Passengers ({currentRide.passengers.length})
            <span className="ml-1">{showPassengers ? '▲' : '▼'}</span>
          </button>
          
          {showPassengers && (
            <ul className="mt-2 space-y-2">
              {currentRide.passengers.map((passenger, index) => (
                <li key={index} className="flex items-center">
                  <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs mr-2">
                    {index + 1}
                  </span>
                  <div>
                    <p>{passenger.name || `Passenger ${index + 1}`}</p>
                    {passenger.phone && (
                      <p className="text-xs text-gray-500">{passenger.phone}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-4 pt-3 border-t">
        <button
          onClick={completeRide}
          disabled={isCompleting}
          className={`w-full py-2 px-4 rounded-md text-white font-medium ${
            isCompleting ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {isCompleting ? 'Completing Ride...' : 'Complete Ride'}
        </button>
      </div>
    </div>
  );
}