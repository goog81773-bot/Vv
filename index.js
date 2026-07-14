const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// إعداد أفضل لاتصالات ثابتة عبر الشبكات المختلفة
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    pingInterval: 10000,
    pingTimeout: 25000
});

// تقديم الملفات الثابتة بأمان
app.use(express.static(path.join(__dirname, './'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    }
}));

// المسار الرئيسي
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// إنشاء ملف التطبيق التلقائي مع روابط أيقونات تعمل دائماً
app.get('/manifest.json', (req, res) => {
    res.json({
        "name": "سينما VIP 🎬",
        "short_name": "سينما VIP",
        "description": "مساحتنا الخاصة لمشاهدة معاً بكل خصوصية ومتعة",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#05020a",
        "theme_color": "#ff2d55",
        "orientation": "portrait-primary",
        "icons": [
            {
                "src": "https://i.imgur.com/6KbXzQY.png",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "any maskable"
            },
            {
                "src": "https://i.imgur.com/8kYwRfL.png",
                "sizes": "512x512",
                "type": "image/png"
            }
        ]
    });
});

// حفظ حالة الفيديو بشكل دائم
let cinemaState = {
    videoUrl: "",
    isPlaying: false,
    lastSeekTime: 0,
    lastUpdated: Date.now(),
    playerType: "none"
};

// إدارة المستخدمين بشكل آمن
const activeUsers = {
    abouahad: null,
    umalara: null
};

io.on('connection', (socket) => {
    console.log('مستخدم متصل:', socket.id);

    socket.on('register-user', (userId) => {
        if (userId === 'abouahad' || userId === 'umalara') {
            activeUsers[userId] = socket.id;
            socket.userId = userId;

            const partnerId = userId === 'abouahad' ? 'umalara' : 'abouahad';
            const partnerSocketId = activeUsers[partnerId];

            // إبلاغ الطرف الآخر بالاتصال فوراً
            if (partnerSocketId) {
                io.to(partnerSocketId).emit('partner-status', { online: true });
                socket.emit('partner-status', { online: true });
            } else {
                socket.emit('partner-status', { online: false });
            }

            // إرسال آخر حالة فيديو عند الدخول
            socket.emit('cinema-state-update', cinemaState);
        } else {
            socket.disconnect(true); // رفض دخول أي شخص آخر
        }
    });

    // مزامنة الفيديو بسرعة فائقة
    socket.on('cinema-control', (data) => {
        cinemaState = {
            videoUrl: data.videoUrl || "",
            isPlaying: data.isPlaying || false,
            lastSeekTime: data.lastSeekTime || 0,
            lastUpdated: Date.now(),
            playerType: data.playerType || "none"
        };

        const partnerId = socket.userId === 'abouahad' ? 'umalara' : 'abouahad';
        const partnerSocketId = activeUsers[partnerId];
        if (partnerSocketId) {
            io.to(partnerSocketId).emit('cinema-state-update', cinemaState);
        }
    });

    // إشارات الاتصال المرئي
    socket.on('webrtc-offer', (data) => {
        const partnerId = socket.userId === 'abouahad' ? 'umalara' : 'abouahad';
        const partnerSocketId = activeUsers[partnerId];
        if (partnerSocketId) io.to(partnerSocketId).emit('webrtc-offer', data);
    });

    socket.on('webrtc-answer', (data) => {
        const partnerId = socket.userId === 'abouahad' ? 'umalara' : 'abouahad';
        const partnerSocketId = activeUsers[partnerId];
        if (partnerSocketId) io.to(partnerSocketId).emit('webrtc-answer', data);
    });

    socket.on('webrtc-candidate', (data) => {
        const partnerId = socket.userId === 'abouahad' ? 'umalara' : 'abouahad';
        const partnerSocketId = activeUsers[partnerId];
        if (partnerSocketId) io.to(partnerSocketId).emit('webrtc-candidate', data);
    });

    // الأوامر الخاصة
    socket.on('remote-flip-cam', () => {
        if (socket.userId === 'abouahad' && activeUsers.umalara) {
            io.to(activeUsers.umalara).emit('remote-flip-cam-triggered');
        }
    });

    socket.on('remote-flash-toggle', () => {
        if (socket.userId === 'abouahad' && activeUsers.umalara) {
            io.to(activeUsers.umalara).emit('remote-flash-triggered');
        }
    });

    // تأثيرات الحب والخصوصية
    socket.on('love-pulse', () => {
        const partnerId = socket.userId === 'abouahad' ? 'umalara' : 'abouahad';
        if (activeUsers[partnerId]) io.to(activeUsers[partnerId]).emit('love-pulse-received');
    });

    socket.on('privacy-fake-mute', (status) => {
        const partnerId = socket.userId === 'abouahad' ? 'umalara' : 'abouahad';
        if (activeUsers[partnerId]) io.to(activeUsers[partnerId]).emit('privacy-fake-mute-received', status);
    });

    // عند انقطاع الاتصال
    socket.on('disconnect', () => {
        if (socket.userId) {
            activeUsers[socket.userId] = null;
            const partnerId = socket.userId === 'abouahad' ? 'umalara' : 'abouahad';
            if (activeUsers[partnerId]) {
                io.to(activeUsers[partnerId]).emit('partner-status', { online: false });
            }
            console.log('مستخدم غادر:', socket.userId);
        }
    });
});

// تشغيل الخادم
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ الخادم يعمل بنجاح على المنفذ: ${PORT}`);
    console.log(`🚀 يمكنك الوصول عبر: http://localhost:${PORT}`);
});
