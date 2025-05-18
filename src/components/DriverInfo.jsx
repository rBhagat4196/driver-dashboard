import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { FaCar, FaMapMarkerAlt, FaUser } from "react-icons/fa";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom driver icon
const driverIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/4474/4474284.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

export default function DriverInfo({ uid }) {
  const [driverData, setDriverData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  
  // Default to Mumbai coordinates if no location is set
  const [currentCoords, setCurrentCoords] = useState({
    latitude: 19.0760,
    longitude: 72.8777
  });

  // Fetch driver data including location
  useEffect(() => {
    const fetchDriverData = async () => {
      try {
        const docRef = doc(db, "drivers", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setDriverData(data);

          // Try to set location from different sources
          if (data.currentLocation) {
            // Use stored coordinates if available
            setCurrentCoords({
              latitude: data.currentLocation.latitude,
              longitude: data.currentLocation.longitude
            });
          } else if (data.currentAddress) {
            // Geocode address if coordinates not available
            const coords = await geocodeAddress(data.currentAddress);
            if (coords) {
              setCurrentCoords(coords);
            }
          }
          setMapKey(prev => prev + 1); // Force map re-render
        } else {
          console.error("No driver document found");
        }
      } catch (err) {
        console.error("Error fetching driver data:", err);
        setLocationError("Failed to load driver information");
      } finally {
        setLoading(false);
      }
    };

    fetchDriverData();
  }, [uid]);

  // Geocode address string to coordinates
  const geocodeAddress = async (address) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon)
        };
      }
      return null;
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  };

  // Update driver's current location
  const updateDriverLocation = async () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setIsUpdatingLocation(true);
    setLocationError(null);

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const newCoords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      // Get readable address from coordinates
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newCoords.latitude}&lon=${newCoords.longitude}`
      );
      const addressData = await response.json();
      const address = addressData.display_name || "Current Location";

      // Update Firestore
      const updateData = {
        currentAddress: address,
        currentLocation: newCoords,
        lastUpdated: new Date().toISOString()
      };

      await updateDoc(doc(db, "drivers", uid), updateData);

      // Update local state
      setDriverData(prev => ({
        ...prev,
        ...updateData
      }));
      setCurrentCoords(newCoords);
      setMapKey(prev => prev + 1);

    } catch (err) {
      console.error("Error updating location:", err);
      setLocationError("Failed to update location. Please try again.");
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md animate-pulse">
        <div className="h-6 w-1/3 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 w-full bg-gray-100 rounded"></div>
          <div className="h-4 w-3/4 bg-gray-100 rounded"></div>
          <div className="h-4 w-2/3 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (!driverData) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <h3 className="text-lg font-medium text-gray-700">Driver not found</h3>
        <p className="mt-2 text-gray-500">Could not load driver information</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Driver Profile</h2>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          driverData.mode === "auto" 
            ? "bg-green-100 text-green-800" 
            : "bg-blue-100 text-blue-800"
        }`}>
          {driverData.mode?.toUpperCase() || "CAB"} MODE
        </span>
      </div>

      <div className="space-y-5">
        {/* Driver Information */}
        <div className="flex items-center">
          <div className="bg-blue-100 p-3 rounded-lg mr-4">
            <FaUser className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Driver Name</p>
            <p className="font-medium">
              {driverData.name || "Name not available"}
            </p>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="flex items-center">
          <div className="bg-purple-100 p-3 rounded-lg mr-4">
            <FaCar className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Vehicle</p>
            <p className="font-medium">
              {driverData.vehicle || "Not specified"}
            </p>
          </div>
        </div>

        {/* Location Section */}
        <div className="flex items-start">
          <div className="bg-red-100 p-3 rounded-lg mr-4">
            <FaMapMarkerAlt className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-sm text-gray-500">Current Location</p>
                <p className="font-medium">
                  {driverData.currentAddress || "Location not set"}
                </p>
              </div>
              <button
                onClick={updateDriverLocation}
                disabled={isUpdatingLocation}
                className={`px-3 py-1 rounded-md text-sm ${
                  isUpdatingLocation
                    ? "bg-gray-200 text-gray-500"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {isUpdatingLocation ? "Updating..." : "Update"}
              </button>
            </div>

            {locationError && (
              <p className="text-xs text-red-500 mb-2">{locationError}</p>
            )}

            {/* Map Container */}
            <div className="mt-3 h-64 rounded-lg overflow-hidden border border-gray-200">
              <MapContainer
                key={mapKey}
                center={[currentCoords.latitude, currentCoords.longitude]}
                zoom={15}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker 
                  position={[currentCoords.latitude, currentCoords.longitude]}
                  icon={driverIcon}
                >
                  <Popup className="text-sm">
                    <div className="font-medium">{driverData.name || "Driver"}</div>
                    <div className="text-gray-600">
                      {driverData.currentAddress || "Current location"}
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}