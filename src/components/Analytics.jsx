import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, registerables } from 'chart.js';
import { FaChartLine, FaChartBar, FaChartPie, FaCalendarAlt } from 'react-icons/fa';

ChartJS.register(...registerables);

export default function Analytics({ uid }) {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');
  const [stats, setStats] = useState({
    earnings: [],
    rides: [],
    distances: [],
    labels: []
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        
        const driverRef = doc(db, 'drivers', uid);
        const driverSnap = await getDoc(driverRef);
        
        if (!driverSnap.exists()) {
          throw new Error('Driver not found');
        }

        const driverData = driverSnap.data();
        const allRides = [
          ...(driverData.previousRides || []),
          ...(driverData.currentRide ? [driverData.currentRide] : [])
        ].filter(ride => ride.completedAt || ride.createdAt);

        const processedData = processRideData(allRides, timeRange);
        setStats(processedData);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [uid, timeRange]);

  const processRideData = (rides, range) => {
    const now = new Date();
    let labels = [];
    let earningsData = [];
    let ridesData = [];
    let distancesData = [];

    const getRideDate = (ride) => {
      return ride.completedAt ? new Date(ride.completedAt) : new Date(ride.createdAt);
    };

    if (range === 'week') {
      labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      earningsData = Array(7).fill(0);
      ridesData = Array(7).fill(0);
      distancesData = Array(7).fill(0);

      rides.forEach(ride => {
        const rideDate = getRideDate(ride);
        const dayOfWeek = rideDate.getDay();

        earningsData[dayOfWeek] += ride.fare || 0;
        ridesData[dayOfWeek] += 1;
        distancesData[dayOfWeek] += ride.distance || 0;
      });
    } else if (range === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const weeksInMonth = Math.ceil((lastDay.getDate() + firstDay.getDay()) / 7);
      
      labels = Array.from({ length: weeksInMonth }, (_, i) => `Week ${i + 1}`);
      earningsData = Array(weeksInMonth).fill(0);
      ridesData = Array(weeksInMonth).fill(0);
      distancesData = Array(weeksInMonth).fill(0);

      rides.forEach(ride => {
        const rideDate = getRideDate(ride);
        if (rideDate.getMonth() === now.getMonth()) {
          const weekOfMonth = Math.floor((rideDate.getDate() + firstDay.getDay() - 1) / 7);
          earningsData[weekOfMonth] += ride.fare || 0;
          ridesData[weekOfMonth] += 1;
          distancesData[weekOfMonth] += ride.distance || 0;
        }
      });
    } else {
      labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      earningsData = Array(12).fill(0);
      ridesData = Array(12).fill(0);
      distancesData = Array(12).fill(0);

      rides.forEach(ride => {
        const rideDate = getRideDate(ride);
        if (rideDate.getFullYear() === now.getFullYear()) {
          const month = rideDate.getMonth();
          earningsData[month] += ride.fare || 0;
          ridesData[month] += 1;
          distancesData[month] += ride.distance || 0;
        }
      });
    }

    return {
      labels,
      earnings: earningsData,
      rides: ridesData,
      distances: distancesData
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const totalEarnings = stats.earnings.reduce((a, b) => a + b, 0);
  const totalRides = stats.rides.reduce((a, b) => a + b, 0);
  const totalDistance = stats.distances.reduce((a, b) => a + b, 0);
  const avgPerRide = totalRides > 0 ? (totalEarnings / totalRides) : 0;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Driver Analytics</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setTimeRange('week')}
            className={`px-3 py-1 rounded-md ${timeRange === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Week
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-3 py-1 rounded-md ${timeRange === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Month
          </button>
          <button
            onClick={() => setTimeRange('year')}
            className={`px-3 py-1 rounded-md ${timeRange === 'year' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Year
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Earnings Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center mb-4">
            <FaChartLine className="text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold">Earnings (₹)</h3>
          </div>
          <div className="h-64">
            <Line
              data={{
                labels: stats.labels,
                datasets: [
                  {
                    label: 'Earnings (₹)',
                    data: stats.earnings,
                    borderColor: 'rgba(37, 99, 235, 1)',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.3,
                    fill: true
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'top' },
                  tooltip: {
                    callbacks: {
                      label: (context) => `₹${context.raw.toFixed(2)}`
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (value) => `₹${value}`
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Number of Rides Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center mb-4">
            <FaChartBar className="text-green-600 mr-2" />
            <h3 className="text-lg font-semibold">Number of Rides</h3>
          </div>
          <div className="h-64">
            <Bar
              data={{
                labels: stats.labels,
                datasets: [
                  {
                    label: 'Rides',
                    data: stats.rides,
                    backgroundColor: 'rgba(16, 185, 129, 0.6)',
                    borderColor: 'rgba(16, 185, 129, 1)',
                    borderWidth: 1
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Distance Traveled Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center mb-4">
            <FaChartPie className="text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold">Distance Traveled (km)</h3>
          </div>
          <div className="h-64">
            <Bar
              data={{
                labels: stats.labels,
                datasets: [
                  {
                    label: 'Distance (km)',
                    data: stats.distances,
                    backgroundColor: 'rgba(124, 58, 237, 0.6)',
                    borderColor: 'rgba(124, 58, 237, 1)',
                    borderWidth: 1
              }
            ]
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } },
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }}
        />
      </div>
    </div>

    {/* Summary Stats */}
    <div className="bg-white p-6 rounded-xl shadow-sm flex flex-col justify-center items-center">
      <FaCalendarAlt className="text-yellow-500 text-4xl mb-4" />
      <div className="text-center space-y-3">
        <div>
          <span className="block text-2xl font-bold text-gray-900">₹{totalEarnings.toFixed(2)}</span>
          <span className="text-gray-500">Total Earnings</span>
        </div>
        <div>
          <span className="block text-2xl font-bold text-gray-900">{totalRides}</span>
          <span className="text-gray-500">Total Rides</span>
        </div>
        <div>
          <span className="block text-2xl font-bold text-gray-900">{totalDistance.toFixed(1)} km</span>
          <span className="text-gray-500">Total Distance</span>
        </div>
        <div>
          <span className="block text-2xl font-bold text-gray-900">₹{avgPerRide.toFixed(2)}</span>
          <span className="text-gray-500">Avg Earnings / Ride</span>
        </div>
      </div>
    </div>
  </div>
</div>
  )}