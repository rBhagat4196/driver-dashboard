import { io } from "socket.io-client";

const socket = io("http://localhost:5000"); // adjust for deployed backend

export default socket;
