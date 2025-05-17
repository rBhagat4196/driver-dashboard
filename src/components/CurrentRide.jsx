// src/components/CurrentRide.js
import React from "react";
import { doc, updateDoc, arrayUnion, onSnapshot, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import RoutesMap from "./RoutesMap";

export default function CurrentRide({ uid }) {
  const [driverData, setDriverData] = useState(null);
  const [showPassengers, setShowPassengers] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatId, setChatId] = useState(null);
  const [availableSeats, setAvailableSeats] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "drivers", uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setDriverData(data);
        
        // Calculate available seats
        if (data.currentRide) {
          const maxSeats = data.mode === 'auto' ? 4 : 1; // Auto can have 4 seats, cab has 1
          const occupiedSeats = data.currentRide.passengers?.length || 0;
          setAvailableSeats(maxSeats - occupiedSeats);
        }

        // Set chatId when current ride exists
        if (data.currentRide?.chatId) {
          setChatId(data.currentRide.chatId);
        }
      }
    });
    return () => unsub();
  }, [uid]);

  // Listen for chat messages when chatId is available
  useEffect(() => {
    if (!chatId) return;

    const messagesUnsub = onSnapshot(
      collection(db, "chats", chatId, "messages"),
      (snap) => {
        const chatMessages = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).sort((a, b) => a.timestamp?.toDate() - b.timestamp?.toDate());
        setMessages(chatMessages);
      }
    );

    return () => messagesUnsub();
  }, [chatId]);

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

      // Update all accepted requests to completed
      if (driverData.currentRide.acceptedRequests) {
  await Promise.all(
    driverData.currentRide.acceptedRequests.map(requestId => 
      updateDoc(doc(db, "requests", requestId), {
        status: "completed",
        completedAt: new Date().toISOString()
      })
    )
  );
}


    } catch (error) {
      console.error("Error completing ride:", error);
    } finally {
      setIsCompleting(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatId) return;

    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        text: newMessage,
        senderId: uid,
        senderName: driverData?.name || "Driver",
        timestamp: serverTimestamp()
      });
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const initializeChat = async () => {
    if (!driverData?.currentRide || driverData.currentRide.chatId) return;

    try {
      const chatRef = await addDoc(collection(db, "chats"), {
        rideId: driverData.currentRide.requestId || `ride_${Date.now()}`,
        driverId: uid,
        passengerIds: driverData.currentRide.passengers.map(p => p.id),
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, "drivers", uid), {
        "currentRide.chatId": chatRef.id,
        updatedAt: new Date().toISOString()
      });

      setChatId(chatRef.id);
    } catch (error) {
      console.error("Error initializing chat:", error);
    }
  };
// function passengers data here like, id, name, pickup, drop

// function for driver address
const getPassengersData = () => {
    if (!driverData?.currentRide?.passengers) return [];
    
    return driverData.currentRide.passengers.map(passenger => ({
      id: passenger.id,
      name: passenger.name || 'Passenger',
      pickup: passenger?.pickupCoordinates || driverData.currentRide.pickupCoordinates,
      drop: passenger?.dropCoordinates || driverData.currentRided.dropCoordinates,
    }));
  };

  // Function to get driver address data
  const getDriverAddress = () => {
    if (!driverData) return null;
    
    return {
      latitude: driverData.currentLocation?.latitude || null,
      longitude: driverData.currentLocation?.longitude || null
    };
  };

  // Get the processed data
  const passengers = getPassengersData();
  const driverAddress = getDriverAddress();

  // console.log(passengers);
  // console.log(driverAddress)
  useEffect(() => {
    if (driverData?.currentRide && !chatId) {
      initializeChat();
    }
  }, [driverData?.currentRide, chatId]);

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
          {currentRide.mode === 'auto' && (
            <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
              {availableSeats} SEATS LEFT
            </span>
          )}
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
          <p className="text-sm text-gray-500 font-medium">Total Fare</p>
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

      {/* Chat System */}
      <div className="mt-4 border-t pt-3">
        <h3 className="font-medium mb-2">Ride Chat</h3>
        <div className="bg-gray-50 rounded-lg p-3 mb-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {messages.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No messages yet</p>
          ) : (
            <div className="space-y-2">
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={`flex ${message.senderId === uid ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-xs p-2 rounded-lg ${
                      message.senderId === uid 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.senderName} •{' '}
                      {message.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 border rounded-l-lg p-2"
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button
            onClick={sendMessage}
            className="bg-blue-500 text-white px-4 py-2 rounded-r-lg hover:bg-blue-600"
          >
            Send
          </button>
        </div>
      </div>
      <RoutesMap driverLocation={driverAddress} passengers={passengers} />
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