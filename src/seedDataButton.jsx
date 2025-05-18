import React, { useState } from 'react';
import { db } from './firebase';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export default function SeedDataButton() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const auth = getAuth();
  const currentDriverId = auth.currentUser?.uid || 'y2m2GHYzLBhEeoOquA8CEjKMwWg1';

  const seedData = async () => {
    setLoading(true);
    try {
      // 1. Seed Riders
      const rider1Ref = doc(db, 'riders', 'rider_456');
      await setDoc(rider1Ref, {
        name: "Priya Sharma",
        email: "priya@example.com",
        phoneNo: "+919876543211",
        riderId: "rider_456",
        currentAddress: "Juhu, Mumbai",
        createdAt: Timestamp.now()
      });

      const rider2Ref = doc(db, 'riders', 'rider_789');
      await setDoc(rider2Ref, {
        name: "Amit Patel",
        email: "amit@example.com",
        phoneNo: "+919876543212",
        riderId: "rider_789",
        currentAddress: "Bandra, Mumbai",
        createdAt: Timestamp.now()
      });

      // 2. Seed Current Driver Data
      const driverRef = doc(db, 'drivers', currentDriverId);
      await setDoc(driverRef, {
        name: "Rajesh Kumar",
        email: "rajesh@example.com",
        phoneNo: "+919876543210",
        rating: 4.5,
        vehicle: "MH01AB1234",
        currentAddress: "Andheri East, Mumbai",
        mode: "cab",
        currentRide: {
          totalFare: 350,
          chatId: "chat_789",
          totalDistance: 12.5,
          startAddress: "Andheri East",
          destinationAddress: "Bandra West",
          passengers: [
            {
              fare: 150,
              distance: 5.2,
              RiderId: "riders/rider_456",
              pickupAddress: "Andheri Station",
              dropAddress: "Juhu Beach"
            },
            {
              fare: 200,
              distance: 7.3,
              RiderId: "riders/rider_789",
              pickupAddress: "Versova",
              dropAddress: "Bandra West"
            }
          ],
          createdAt: Timestamp.now()
        },
        previousRides: [
          {
            totalFare: 280,
            mode: "cab",
            totalDistance: 10.2,
            startAddress: "Malad East",
            destinationAddress: "Dadar West",
            completedAt: Timestamp.fromDate(new Date('2023-06-15T14:30:00Z')),
            rating: 4.0
          },
          {
            totalFare: 180,
            mode: "cab",
            totalDistance: 6.5,
            startAddress: "Goregaon East",
            destinationAddress: "Andheri West",
            completedAt: Timestamp.fromDate(new Date('2023-06-14T09:15:00Z')),
            rating: 5.0
          }
        ],
        createdAt: Timestamp.now()
      }, { merge: true }); // Use merge: true to not overwrite existing auth data

      // 3. Seed Requests
      const request1Ref = doc(db, 'requests', 'req_456');
      await setDoc(request1Ref, {
        dropAddress: "Juhu Beach",
        pickupAddress: "Andheri Station",
        driverId: currentDriverId,
        riderId: "riders/rider_456",
        mode: "cab",
        status: "completed",
        distance: 5.2,
        createdAt: Timestamp.now()
      });

      const request2Ref = doc(db, 'requests', 'req_789');
      await setDoc(request2Ref, {
        dropAddress: "Bandra West",
        pickupAddress: "Versova",
        driverId: currentDriverId,
        riderId: "riders/rider_789",
        mode: "cab",
        status: "accepted",
        distance: 7.3,
        createdAt: Timestamp.now()
      });

      // 4. Seed Chat
      const chatRef = doc(db, 'chats', 'chat_789');
      await setDoc(chatRef, {
        driverId: currentDriverId,
        passengersIds: ["rider_456", "rider_789"],
        createdAt: Timestamp.now()
      });

      // 5. Seed Messages
      const messagesRef = collection(db, 'chats', 'chat_789', 'messages');
      await addDoc(messagesRef, {
        senderId: currentDriverId,
        senderName: "Rajesh",
        text: "I've arrived at the pickup location",
        timestamp: Timestamp.fromDate(new Date('2023-06-16T10:15:00Z'))
      });
      
      await addDoc(messagesRef, {
        senderId: "rider_456",
        senderName: "Priya",
        text: "Coming down in 2 minutes",
        timestamp: Timestamp.fromDate(new Date('2023-06-16T10:16:00Z'))
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error seeding data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={seedData}
        disabled={loading}
        className={`px-4 py-2 rounded-md shadow-lg ${
          loading ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
        } text-white font-medium transition-colors`}
      >
        {loading ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Seeding Data...
          </span>
        ) : (
          'Seed Test Data'
        )}
      </button>
      {success && (
        <div className="mt-2 p-2 bg-green-500 text-white rounded-md animate-fade-in">
          Test data seeded successfully for driver {currentDriverId}!
        </div>
      )}
    </div>
  );
}