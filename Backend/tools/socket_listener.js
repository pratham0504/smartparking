const { io } = require("socket.io-client");

const SERVER = process.env.SERVER || "http://localhost:3001";

const socket = io(SERVER, {
  transports: ["websocket"],
  reconnectionAttempts: 5,
});

socket.on("connect", () => {
  console.log("Connected to Socket.IO server", socket.id);
});

socket.on("camera_event", (data) => {
  console.log("camera_event:", data);
});

socket.on("fastag_event", (data) => {
  console.log("fastag_event:", data);
});

socket.on("disconnect", () => {
  console.log("disconnected");
});
