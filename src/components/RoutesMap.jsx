import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";

// Fix leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom icons
const DRIVER_ICON = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/4474/4474284.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const PICKUP_ICON = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/4474/4474228.png",
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const DROP_ICON = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/4474/4474195.png",
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

// Config
const ORS_KEY = "5b3ce3597851110001cf6248ba39e587c4a94695a96bae7c245bd79e";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

async function geocodeAddress(address) {
  if (!address) return null;
  
  try {
    const response = await axios.get(NOMINATIM_URL, {
      params: {
        q: address,
        format: 'json',
        limit: 1
      }
    });
    
    if (response.data && response.data.length > 0) {
      return {
        latitude: parseFloat(response.data[0].lat),
        longitude: parseFloat(response.data[0].lon)
      };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

async function fetchRoute(coords) {
  if (!coords || coords.length < 2) return null;
  
  try {
    const { data } = await axios.post(
      "https://api.openrouteservice.org/v2/directions/driving-car",
      { coordinates: coords },
      {
        headers: {
          Authorization: ORS_KEY,
          "Content-Type": "application/json",
        }
      }
    );
    return data;
  } catch (err) {
    console.error("Route fetch error:", err);
    return null;
  }
}

export default function RoutesMap({ driverLocation, passengers = [], startAddress, endAddress }) {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [routeCoordinates, setRouteCoordinates] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function buildRoutes() {
      setLoading(true);
      setError(null);

      try {
        // 1. Convert addresses to coordinates if needed
        const driverCoords = typeof driverLocation === 'string' 
          ? await geocodeAddress(driverLocation) 
          : driverLocation;
        
        const endCoords = await geocodeAddress(endAddress);

        if (!driverCoords || !endCoords) {
          throw new Error("Could not geocode addresses");
        }

        // 2. Get main route from driver start to destination
        const mainRoute = await fetchRoute([
          [driverCoords.longitude, driverCoords.latitude],
          [endCoords.longitude, endCoords.latitude]
        ]);

        // 3. Get passenger routes
        const passengerRoutes = await Promise.all(
          passengers.map(async (passenger) => {
            try {
              const pickupCoords = await geocodeAddress(passenger.pickup);
              const dropCoords = await geocodeAddress(passenger.drop);
              
              if (!pickupCoords || !dropCoords) return null;

              const route = await fetchRoute([
                [driverCoords.longitude, driverCoords.latitude],
                [pickupCoords.longitude, pickupCoords.latitude],
                [dropCoords.longitude, dropCoords.latitude]
              ]);

              return {
                ...passenger,
                routeData: route,
                pickupCoords,
                dropCoords
              };
            } catch (err) {
              console.error("Error processing passenger route:", err);
              return null;
            }
          })
        );

        setRouteCoordinates({
          driver: driverCoords,
          end: endCoords,
          mainRoute
        });
        setRoutes(passengerRoutes.filter(route => route !== null));
      } catch (err) {
        console.error("Error building routes:", err);
        setError("Failed to load map data. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    if ((driverLocation || startAddress) && endAddress) {
      buildRoutes();
    }
  }, [driverLocation, passengers, startAddress, endAddress]);

  if (loading) return <div className="p-4 text-center">Loading map...</div>;
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
  if (!routeCoordinates) return <div className="p-4 text-center">No route data available</div>;

  const mapCenter = [
    routeCoordinates.driver.latitude, 
    routeCoordinates.driver.longitude
  ];

  return (
    <div className="border rounded-lg overflow-hidden" style={{ height: "500px", width: "100%" }}>
      <MapContainer 
        center={mapCenter} 
        zoom={13} 
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
        />

        {/* Driver Marker */}
        <Marker 
          position={[routeCoordinates.driver.latitude, routeCoordinates.driver.longitude]} 
          icon={DRIVER_ICON}
        >
          <Popup>Driver Location</Popup>
        </Marker>

        {/* Destination Marker */}
        <Marker 
          position={[routeCoordinates.end.latitude, routeCoordinates.end.longitude]} 
          icon={DROP_ICON}
        >
          <Popup>Final Destination: {endAddress}</Popup>
        </Marker>

        {/* Main Route */}
        {routeCoordinates.mainRoute?.routes?.[0]?.geometry?.coordinates && (
          <Polyline
            positions={routeCoordinates.mainRoute.routes[0].geometry.coordinates.map(
              coord => [coord[1], coord[0]]
            )}
            color="#3b82f6"
            weight={4}
            opacity={0.8}
          >
            <Popup>Main Route to Destination</Popup>
          </Polyline>
        )}

        {/* Passenger Routes */}
        {routes.filter(route => route?.routeData?.routes?.[0]?.geometry?.coordinates).map((route) => (
          <React.Fragment key={route.id}>
            <Marker 
              position={[route.pickupCoords.latitude, route.pickupCoords.longitude]} 
              icon={PICKUP_ICON}
            >
              <Popup>
                <div>
                  <strong>{route.name}</strong><br />
                  Pickup: {route.pickup}<br />
                  Fare: ₹{route.fare?.toFixed(2)}
                </div>
              </Popup>
            </Marker>
            
            <Marker 
              position={[route.dropCoords.latitude, route.dropCoords.longitude]} 
              icon={DROP_ICON}
            >
              <Popup>
                <div>
                  <strong>{route.name}</strong><br />
                  Drop: {route.drop}<br />
                  Distance: {route.distance} km
                </div>
              </Popup>
            </Marker>
            
            <Polyline
              positions={route.routeData.routes[0].geometry.coordinates.map(
                coord => [coord[1], coord[0]]
              )}
              color={`#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`}
              weight={3}
              opacity={0.7}
            >
              <Popup>{route.name}'s Route</Popup>
            </Polyline>
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
}