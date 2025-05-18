import React from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { db } from './firebase';

const sampleLocations = [
  ['Andheri Station', 'Juhu Beach'],
  ['Borivali', 'Marine Drive'],
  ['Dadar', 'Powai Lake'],
  ['Versova', 'Bandra Bandstand'],
  ['Churchgate', 'Gateway of India'],
  ['Kandivali', 'Colaba Causeway'],
  ['Kurla', 'Chhatrapati Shivaji Maharaj Terminus'],
  ['Goregaon', 'Film City'],
  ['Thane', 'Yeoor Hills'],
  ['Vile Parle', 'Siddhivinayak Temple']
];

const sampleModes = ['cab', 'auto'];

const CreateRequest = () => {
  const handleCreateRequests = async () => {
    try {
      for (let i = 0; i < 10; i++) {
        const riderUUID = uuidv4(); // Unique ID for both rider and request
        const [pickup, drop] = sampleLocations[i];

        // Rider Data
        const riderData = {
          name: `Rider ${i + 1}`,
          email: `rider${i + 1}@example.com`,
          phoneNo: `99900000${i}`,
          riderId: riderUUID,
          currentAddress: pickup,
          previousRides: [
            {
              totalFare: (Math.random() * 300 + 50).toFixed(2), // ₹50 - ₹350
              mode: sampleModes[Math.floor(Math.random() * sampleModes.length)],
              totalDistance: (Math.random() * 10 + 1).toFixed(1) + ' km',
              startAddress: 'Sample Start Point',
              destinationAddress: 'Sample Destination',
              rating: (Math.random() * 2 + 3).toFixed(1) // 3.0 - 5.0
            }
          ]
        };

        // Request Data
        const requestData = {
          dropAddress: drop,
          pickupAddress: pickup,
          driverId: null,
          riderId: riderUUID, // Reference to rider document
          mode: sampleModes[Math.floor(Math.random() * sampleModes.length)],
          status: 'pending',
          distance: (Math.random() * 10 + 1).toFixed(1) // 1.0 - 11.0 km
        };

        // Write both rider and request
        await Promise.all([
          setDoc(doc(db, 'riders', riderUUID), riderData),
          setDoc(doc(db, 'requests', riderUUID), requestData)
        ]);

        console.log(`✅ Created rider and request with ID: ${riderUUID}`);
      }

      alert('🎉 All 10 riders and ride requests created successfully!');
    } catch (error) {
      console.error('❌ Error creating data:', error);
    }
  };

  return (
    <div className="p-4">
      <button
        onClick={handleCreateRequests}
        className="px-6 py-3 bg-green-600 text-white font-bold rounded-md hover:bg-green-700"
      >
        Create 10 Ride Requests & Riders
      </button>
    </div>
  );
};

export default CreateRequest;
