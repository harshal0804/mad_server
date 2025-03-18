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

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Teacher creates a session
    socket.on('createSession', (teacherId) => {
        const sessionCode = Math.floor(1000 + Math.random() * 9000);
        activeSessions[sessionCode] = {
            teacherId: teacherId,
            students: [],
            socketId: socket.id
        };
        console.log(`Session created: ${sessionCode}`);
        socket.emit('sessionCreated', { sessionCode });
    });

    // Student joins a session
    socket.on('joinSession', (sessionCode, studentData) => {
        if (activeSessions[sessionCode]) {
            activeSessions[sessionCode].students.push(studentData);
            console.log(`Student joined: ${studentData.name}`);
            socket.emit('attendanceMarked', { message: "Attendance marked!" });
            io.to(activeSessions[sessionCode].socketId).emit('updateSession', activeSessions[sessionCode]);
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
