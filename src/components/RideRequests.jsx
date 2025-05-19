import React from "react";
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";

export default function RideRequests({ uid }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [driverData, setDriverData] = useState(null);

  useEffect(() => {
    const driverUnsub = onSnapshot(doc(db, "drivers", uid), (driverSnap) => {
      if (driverSnap.exists()) {
        setDriverData(driverSnap.data());
      }
    });

    const requestsUnsub = onSnapshot(collection(db, "requests"), (snap) => {
      const filteredRequests = snap.docs
        .filter((doc) => {
          const data = doc.data();
          // Only show pending requests matching driver's mode
          return data.status === "pending" && data.mode === driverData?.mode;
        })
        .map((doc) => ({ id: doc.id, ...doc.data() }));
      setRequests(filteredRequests);
      setLoading(false);
    });

    return () => {
      driverUnsub();
      requestsUnsub();
    };
  }, [uid, driverData?.mode]);

  const handleAccept = async (request) => {
    try {
      const currentRide = driverData?.currentRide;
      const isAutoMode = driverData?.mode === "auto";

      if (currentRide && !isAutoMode) {
        alert("You can only have one active ride in cab mode");
        return;
      }

      // Calculate available seats
      const maxSeats = isAutoMode ? 4 : 1;
      const currentPassengers = currentRide?.passengers?.length || 0;
      const availableSeats = maxSeats - currentPassengers;

      if (currentRide && availableSeats <= 0) {
        alert("No available seats left in your auto");
        return;
      }

      // Prepare passenger data
      const passenger = {
        riderId: request.riderId,
        pickupAddress: request.pickupAddress,
        dropAddress: request.dropAddress,
        fare: calculateFare(request.mode, request.distance),
        distance: request.distance,
      };

      const riderRef = doc(db,"riders",request.riderId);
      await updateDoc(riderRef,{
        notifications: arrayUnion({
    text: "Ride request accepted",
    timeStamp: Date.now(),
    mark: "unread"
  })
      })
      // Update driver document
      const updateData = {
        updatedAt: new Date().toISOString(),
      };

      if (!currentRide) {
        // New ride
        updateData.currentRide = {
          startAddress: isAutoMode
            ? driverData.currentAddress
            : request.pickupAddress,
          destinationAddress: isAutoMode
            ? request.dropAddress
            : request.dropAddress,
          status: "accepted",
          passengers: [passenger],
          totalFare: calculateFare(request.mode, request.distance),
          totalDistance: request.distance,
          mode: request.mode,
          createdAt: new Date().toISOString(),
        };
      } else {
        // Existing ride (auto mode only)
        updateData["currentRide.passengers"] = arrayUnion(passenger);
        updateData["currentRide.totalFare"] =
          (currentRide.totalFare || 0) +
          calculateFare(request.mode, request.distance);
        updateData["currentRide.totalDistance"] =
          (currentRide.totalDistance || 0) + request.distance;

        // For auto mode, update destination address to the first passenger's drop location
        if (isAutoMode && currentRide.passengers?.length === 0) {
          updateData["currentRide.destinationAddress"] = request.dropAddress;
        }
      }

      const driverRef = doc(db, "drivers", uid);
      await updateDoc(driverRef, updateData);

      // Update request status
      await updateDoc(doc(db, "requests", request.id), {
        status: "accepted",
        acceptedAt: new Date().toISOString(),
        driverId: uid,
      });
    } catch (error) {
      console.error("Error accepting ride:", error);
    }
  };

  const handleReject = async (requestId) => {
    try {
      await updateDoc(doc(db, "requests", requestId), {
        status: "rejected",
        rejectedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error rejecting ride:", error);
    }
  };

  const calculateFare = (mode, distance) => {
    const baseFare = mode === "auto" ? 30 : 80;
    const perKm = mode === "auto" ? 10 : 15;
    return baseFare + distance * perKm;
  };

  if (loading || !driverData)
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Loading requests...</h2>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-3 border rounded-lg animate-pulse">
              <div className="h-4 w-3/4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-1/2 bg-gray-200 rounded mb-3"></div>
              <div className="flex space-x-2">
                <div className="h-8 w-20 bg-gray-200 rounded"></div>
                <div className="h-8 w-20 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">
          {driverData.mode === "auto" ? "Auto" : "Cab"} Ride Requests
        </h2>
        <div className="flex items-center">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full mr-2">
            {driverData.mode.toUpperCase()} MODE
          </span>
          {driverData.currentRide && driverData.mode === "auto" && (
            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full mr-2">
              {4 - (driverData.currentRide.passengers?.length || 0)} SEATS LEFT
            </span>
          )}
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
            {requests.length} Pending
          </span>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 mx-auto text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-700">
            No pending {driverData.mode} requests
          </h3>
          <p className="mt-1 text-gray-500">
            New {driverData.mode} ride requests will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium">{request.riderName}</h3>
                <div className="flex items-center">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      request.mode === "auto"
                        ? "bg-green-100 text-green-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {request.mode?.toUpperCase() || "CAB"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <p className="text-xs text-gray-500">From</p>
                  <p className="font-medium">{request.pickupAddress}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">To</p>
                  <p className="font-medium">{request.dropAddress}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <p className="text-xs text-gray-500">Distance</p>
                  <p className="font-medium">{request.distance} km</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Fare</p>
                  <p className="font-medium">
                    ₹{calculateFare(request.mode, request.distance).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p>{request.phoneNumber}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleReject(request.id)}
                    className="px-3 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleAccept(request)}
                    className="px-3 py-1 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    Accept
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
