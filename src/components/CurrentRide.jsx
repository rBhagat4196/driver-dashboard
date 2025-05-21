import React from "react";
import {
  doc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useEffect, useState ,useRef} from "react";
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
  const [passengers, setPassengers] = useState([]);
  const [startAddress, setStartAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const messagesEndRef = useRef(null);

 
  // Update these values only when driverData changes
  useEffect(() => {
    if (driverData?.currentRide) {
      setPassengers(getPassengersData());
      setStartAddress(getStartAddress());
      setDestinationAddress(getDestinationAddress());
    }
  }, [driverData]); // Only run when driverData changes
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "drivers", uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setDriverData(data);

        // Calculate available seats
        if (data.currentRide) {
          const maxSeats = data.mode === "auto" ? 4 : 1;
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

    const chatUnsub = onSnapshot(doc(db, "chats", chatId), (snap) => {
      if (snap.exists()) {
        const chatData = snap.data();
        setMessages(chatData.messages || []);
        scrollToBottom();
      }
    });

    return () => chatUnsub();
  }, [chatId]);

   const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  const completeRide = async () => {
    if (!driverData?.currentRide) return;

    setIsCompleting(true);
    try {
      const completedAt = new Date().toISOString();

      const totalFare =
        driverData.currentRide.passengers?.reduce(
          (sum, passenger) => sum + (Number(passenger.fare) || 0),
          0
        ) || 0;

      const totalDistance =
        driverData.currentRide.passengers?.reduce(
          (sum, passenger) => sum + (Number(passenger.distance) || 0),
          0
        ) || 0;

      const completedRide = {
        totalFare,
        mode: driverData.mode,
        totalDistance,
        startAddress: getStartAddress(),
        destinationAddress: getDestinationAddress(),
        completedAt,
        status: "completed",
        rating: null,
        driverId: uid,
        vehicle: driverData.vehicle,
      };

      // Update the driver document
      await updateDoc(doc(db, "drivers", uid), {
        previousRides: arrayUnion(completedRide),
        currentRide: null,
        updatedAt: serverTimestamp(),
      });

      // Process all passengers
      if (driverData.currentRide.passengers) {
        await Promise.all(
          driverData.currentRide.passengers.map(async (passenger) => {
            if (!passenger.riderId) return;

            // Create rider's completed ride record
            const riderCompletedRide = {
              totalFare: Number(passenger.fare),
              totalDistance: Number(passenger.distance),
              startAddress: passenger.pickupAddress,
              destinationAddress: passenger.dropAddress,
              completedAt,
              driverId: uid,
              mode: driverData.mode,
              rating: null,
            };

            // console.log("passenger Id",)
            // request has been completed
            const requestRef = doc(db, "requests", passenger.riderId);
            await updateDoc(requestRef, {
              status: "completed",
            });

            // Update rider's previous rides
            const riderRef = doc(db, "riders", passenger.riderId);
            await updateDoc(riderRef, {
              isPayment: true,
              notifications: arrayUnion({
                text: "Ride Completed",
                timeStamp: Date.now(),
                mark: "unread",
              }),
              previousRides: arrayUnion(riderCompletedRide),
              updatedAt: serverTimestamp(),
            });
          })
        );
      }
    } catch (error) {
      console.error("Error completing ride:", error);
    } finally {
      setIsCompleting(false);
    }
  };

  const getStartAddress = () => {
    if (!driverData?.currentRide?.passengers?.length) return "Unknown";

    if (driverData.mode === "auto") {
      return driverData.currentAddress || "Current location";
    } else {
      return (
        driverData.currentRide.passengers[0]?.pickupAddress || "Pickup location"
      );
    }
  };

  const getDestinationAddress = () => {
    if (!driverData?.currentRide?.passengers?.length) return "Unknown";

    if (driverData.mode === "auto") {
      const lastPassenger =
        driverData.currentRide.passengers[
          driverData.currentRide.passengers.length - 1
        ];
      return lastPassenger?.dropAddress || "Destination";
    } else {
      return driverData.currentRide.passengers[0]?.dropAddress || "Destination";
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatId) return;

    try {
      await updateDoc(doc(db, "chats", chatId), {
        messages: arrayUnion({
          text: newMessage,
          senderId: uid,
          senderName: driverData?.name || "Driver",
          timeStamp: new Date().toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
        }),
        updatedAt: serverTimestamp(), // Track last update time
      });
      
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const initializeChat = async () => {
    if (!driverData?.currentRide || driverData.currentRide.chatId) return;

    try {
      // Filter out any undefined passenger IDs
      // const passengerIds =
      //   driverData.currentRide.passengers
      //     ?.map((p) => p.RiderId)
      //     .filter((id) => id !== undefined) || [];

      const chatRef = await addDoc(collection(db, "chats"), {
        messages: [],
        rideId: `ride_${Date.now()}`,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "drivers", uid), {
        "currentRide.chatId": chatRef.id,
        updatedAt: serverTimestamp(),
      });

      setChatId(chatRef.id);
    } catch (error) {
      console.error("Error initializing chat:", error);
    }
  };

  const getPassengersData = () => {
    if (!driverData?.currentRide?.passengers) return [];

    return driverData.currentRide.passengers.map((passenger, index) => ({
      id: passenger.RiderId || `passenger-${index}`,
      name: passenger.name || `Passenger ${index + 1}`,
      pickup: passenger.pickupAddress,
      drop: passenger.dropAddress,
      fare: passenger.fare,
      distance: passenger.distance,
    }));
  };

  useEffect(() => {
    if (driverData?.currentRide && !chatId) {
      initializeChat();
    }
  }, [driverData?.currentRide, chatId]);

  if (!driverData) {
    return (
      <div className="bg-white p-4 rounded shadow">Loading ride data...</div>
    );
  }

  const currentRide = driverData.currentRide || null;

  if (!currentRide) {
    return (
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Current Ride</h2>
        <p className="text-gray-500">No active ride at the moment</p>
        <p className="text-sm mt-1">
          Mode:{" "}
          <span
            className={`px-2 py-0.5 rounded text-xs ${
              driverData.mode === "auto"
                ? "bg-green-100 text-green-800"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            {driverData.mode?.toUpperCase() || "CAB"}
          </span>
        </p>
      </div>
    );
  }

  // console.log(startAddress, passengers, destinationAddress);
  return (
    <div className="bg-white p-4 rounded shadow">
      <div className="flex justify-between items-start mb-3">
        <h2 className="text-xl font-semibold">Current Ride</h2>
        <div className="flex items-center space-x-2">
          <span
            className={`px-2 py-1 rounded-full text-xs ${
              currentRide.status === "completed"
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {currentRide.status?.toUpperCase() || "IN PROGRESS"}
          </span>
          <span
            className={`px-2 py-1 rounded-full text-xs ${
              driverData.mode === "auto"
                ? "bg-green-100 text-green-800"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            {driverData.mode?.toUpperCase() || "CAB"}
          </span>
          {driverData.mode === "auto" && (
            <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
              {availableSeats} SEATS LEFT
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-sm text-gray-500 font-medium">From</p>
          <p>{startAddress}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium">To</p>
          <p>{destinationAddress}</p>
        </div>
      </div>

      {currentRide.totalDistance && (
        <div className="mb-3">
          <p className="text-sm text-gray-500 font-medium">Distance</p>
          <p>{currentRide.totalDistance} km</p>
        </div>
      )}

      {currentRide.totalFare && (
        <div className="mb-3">
          <p className="text-sm text-gray-500 font-medium">Total Fare</p>
          <p>₹{currentRide.totalFare.toFixed(2)}</p>
        </div>
      )}

      {currentRide.passengers?.length > 0 && (
        <div className="border-t pt-3">
          <button
            onClick={() => setShowPassengers(!showPassengers)}
            className="flex items-center text-sm font-medium"
          >
            Passengers ({currentRide.passengers.length})
            <span className="ml-1">{showPassengers ? "▲" : "▼"}</span>
          </button>

          {showPassengers && (
            <ul className="mt-2 space-y-2">
              {currentRide.passengers.map((passenger, index) => (
                <li
                  key={passenger.RiderId || `passenger-${index}`}
                  className="flex justify-between items-center p-2 bg-gray-50 rounded"
                >
                  <div className="flex items-center">
                    <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs mr-2">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium">
                        {passenger.name || `Passenger ${index + 1}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {passenger.pickupAddress} → {passenger.dropAddress}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      ₹{passenger.fare?.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {passenger.distance} km
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-4 border-t pt-3">
        <h3 className="font-medium mb-2">Ride Chat</h3>
        <div
          className="bg-gray-50 rounded-lg p-3 mb-2"
          style={{ maxHeight: "200px", overflowY: "auto" }}
        >
          {messages.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No messages yet</p>
          ) : (
            <div className="space-y-2">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.senderId === uid ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs p-2 rounded-lg ${
                      message.senderId === uid
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.senderName} •{" "}
                      {message.timeStamp}
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
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            className="bg-blue-500 text-white px-4 py-2 rounded-r-lg hover:bg-blue-600"
          >
            Send
          </button>
        </div>
      </div>

      <RoutesMap
        driverLocation={driverData.currentAddress}
        passengers={passengers}
        startAddress={startAddress}
        mode={driverData?.mode}
        // endAddress={destinationAddress}
      />

      <div className="mt-4 pt-3 border-t">
        <button
          onClick={completeRide}
          disabled={isCompleting}
          className={`w-full py-2 px-4 rounded-md text-white font-medium ${
            isCompleting ? "bg-gray-400" : "bg-green-500 hover:bg-green-600"
          }`}
        >
          {isCompleting ? "Completing Ride..." : "Complete Ride"}
        </button>
      </div>
    </div>
  );
}
