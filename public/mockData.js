export const driverData = {
  email: "rahulbhagat13slr@gmail.com",
  name: "Rahul Bhagat",
  vehicle: "UP09DSLR",
  mode: "cab",
  updatedAt: "2025-05-16T08:09:25.648Z",
  currentRide: {
    pickup: "Karol Bagh",
    drop: "New Delhi Railway Station",
    fare: 172.4,
    distance: 7.3, // in kilometers
    mode: "cab",
    route: "Paharganj Main Road",
    createdAt: "2025-05-16T08:09:25.648Z",
    passengers: [
      {
        id: "user789",
        name: "Ravi Verma",
        phone: "9123456789",
        pickup: "Karol Bagh",
        requestId: "xvSgwFUOva6dx4Yl5Jzb",
        route: "",
        status: "accepted"
      }
    ]
  },
  previousRides: [
    {
      pickup: "Saket",
      drop: "Rajiv Chowk",
      fare: 200,
      distance: 12.5,
      mode: "cab",
      route: "Yellow Line Metro Route",
      createdAt: "2023-05-14T08:30:00Z",
      completedAt: "2023-05-14T09:15:00Z",
      passengers: [
        {
          id: "pass3",
          name: "Ravi Verma",
          pickup: "Saket",
          route: "",
          status: "completed"
        }
      ]
    },
    {
      pickup: "Noida Sector 18",
      drop: "Delhi Airport",
      fare: 600,
      distance: 32.4,
      mode: "auto",
      route: "Expressway Route",
      createdAt: "2023-05-13T16:45:00Z",
      completedAt: "2023-05-13T17:40:00Z",
      passengers: [
        {
          id: "pass4",
          name: "Neha Gupta"
        },
        {
          id: "pass5",
          name: "Alok Singh",
          pickup: "Noida Sector 18",
          route: "Expressway Route",
          status: "completed"
        }
      ]
    },
    {
      pickup: "Connaught Place",
      drop: "Indira Gandhi Airport",
      fare: 329,
      distance: 18.2,
      mode: "cab",
      route: "Outer Ring Road",
      createdAt: "2025-05-16T07:29:15.712Z",
      completedAt: "2025-05-16T07:54:16.013Z",
      passengers: [
        {
          id: "user123",
          name: "Amit Kumar",
          phone: "9876543210",
          pickup: "Connaught Place",
          route: "",
          status: "completed",
          rating: 4.7
        }
      ]
    }
  ]
};
