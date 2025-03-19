const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

let activeSessions = {};

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Distance in meters
}

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Teacher creates a session
    socket.on('createSession', (teacherData) => {
        const sessionCode = Math.floor(1000 + Math.random() * 9000);
        activeSessions[sessionCode] = {
            teacherId: teacherData.teacherId,
            teacherLocation: teacherData.location, // { latitude, longitude }
            students: [],
            socketId: socket.id
        };
        console.log(`Session created: ${sessionCode}`);
        socket.emit('sessionCreated', { sessionCode });
    });

    // Student joins a session
    socket.on('joinSession', (sessionCode, studentData) => {
        if (activeSessions[sessionCode]) {
            const teacherLocation = activeSessions[sessionCode].teacherLocation;
            const studentLocation = studentData.location;

            // Calculate distance
            const distance = calculateDistance(
                teacherLocation.latitude,
                teacherLocation.longitude,
                studentLocation.latitude,
                studentLocation.longitude
            );

            if (distance <= 100) { // Allow attendance within 100 meters
                activeSessions[sessionCode].students.push({
                    ...studentData,
                    distance: distance.toFixed(2) // Distance in meters
                });
                console.log(`Student joined: ${studentData.name}`);
                socket.emit('attendanceMarked', { message: "Attendance marked!", distance });
                io.to(activeSessions[sessionCode].socketId).emit('updateSession', activeSessions[sessionCode]);
            } else {
                socket.emit('attendanceRejected', { message: "You are too far from the teacher!" });
            }
        } else {
            socket.emit('sessionNotFound', { message: "Session not found!" });
        }
    });

    // Teacher ends a session
    socket.on('endSession', (sessionCode) => {
        if (activeSessions[sessionCode]) {
            delete activeSessions[sessionCode];
            io.emit('sessionEnded', { sessionCode });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
