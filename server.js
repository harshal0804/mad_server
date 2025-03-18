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
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

let activeSessions = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Event: Teacher creates a session
    socket.on('createSession', (teacherId) => {
        const sessionCode = Math.floor(1000 + Math.random() * 9000); // Generate a 4-digit code
        activeSessions[sessionCode] = {
            teacherId: teacherId,
            students: [],
            socketId: socket.id // Store the socket ID of the teacher
        };
        console.log(`Session created by teacher ${teacherId} with code: ${sessionCode}`);
        socket.emit('sessionCreated', { sessionCode, message: "Session created successfully!" });
    });

    // Event: Student joins a session
    socket.on('joinSession', (sessionCode, studentData) => {
        if (activeSessions[sessionCode]) {
            activeSessions[sessionCode].students.push(studentData);
            console.log(`Student ${studentData.name} (${studentData.rollNo}) joined session ${sessionCode}`);
            socket.emit('attendanceMarked', { message: "Attendance marked successfully!" });
            io.to(activeSessions[sessionCode].socketId).emit('updateSession', activeSessions[sessionCode]);
        } else {
            console.log(`Session ${sessionCode} not found`);
            socket.emit('sessionNotFound', { message: "Session not found!" });
        }
    });

    // Event: Teacher ends a session
    socket.on('endSession', (sessionCode) => {
        if (activeSessions[sessionCode]) {
            console.log(`Session ${sessionCode} ended by teacher ${activeSessions[sessionCode].teacherId}`);
            delete activeSessions[sessionCode];
            io.emit('sessionEnded', { sessionCode, message: "Session ended successfully!" });
        } else {
            console.log(`Session ${sessionCode} not found`);
            socket.emit('sessionNotFound', { message: "Session not found!" });
        }
    });

    // Event: User disconnects
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Clean up sessions if the teacher disconnects
        for (const sessionCode in activeSessions) {
            if (activeSessions[sessionCode].socketId === socket.id) {
                console.log(`Session ${sessionCode} ended due to teacher disconnect`);
                delete activeSessions[sessionCode];
                io.emit('sessionEnded', { sessionCode, message: "Session ended due to teacher disconnect!" });
            }
        }
    });
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});