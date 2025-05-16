// src/components/EarningsHistory.js
import React from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";

export default function EarningsHistory({ uid }) {
  const [driverData, setDriverData] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "drivers", uid), (snap) => {
      if (snap.exists()) {
        setDriverData(snap.data());
      }
    });

    return () => unsub();
  }, [uid]);

  if (!driverData) return <div className="bg-white p-4 rounded shadow">Loading earnings data...</div>;

  // Get earnings from previousRides or a dedicated earnings array
  const earningsData = driverData.previousRides?.map(ride => ({
    date: ride.completedAt || ride.createdAt,
    amount: ride.fare || 0,
    mode: ride.mode || driverData.mode,
    from: ride.pickup,
    to: ride.drop
  })) || [];

  // Sort by date (newest first)
  const sortedEarnings = [...earningsData].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );

  // Only show last 5 unless expanded
  const displayedEarnings = showAll ? sortedEarnings : sortedEarnings.slice(0, 5);

  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Earnings History</h2>
        {earningsData.length > 0 && (
          <p className="text-sm text-gray-600">
            Total: ₹{earningsData.reduce((sum, e) => sum + (e.amount || 0), 0).toFixed(2)}
          </p>
        )}
      </div>

      {earningsData.length === 0 ? (
        <p className="text-gray-500">No earnings history yet</p>
      ) : (
        <>
          <ul className="divide-y">
            {displayedEarnings.map((e, index) => (
              <li key={index} className="py-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">₹{e.amount?.toFixed(2) || '0.00'}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(e.date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    e.mode === 'auto' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {e.mode?.toUpperCase() || 'CAB'}
                  </span>
                </div>
                <div className="text-sm mt-1">
                  <p className="text-gray-600 truncate">{e.from} → {e.to}</p>
                </div>
              </li>
            ))}
          </ul>

          {earningsData.length > 5 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-blue-500 text-sm mt-2 w-full text-center"
            >
              {showAll ? 'Show Less' : `Show All (${earningsData.length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}