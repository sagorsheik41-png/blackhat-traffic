const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.error(`⚠️  MongoDB Connection Error: ${err.message}`);
        console.error('   The server will run but database features won\'t work.');
        console.error('   Start MongoDB and restart the server to enable full functionality.');
    }
};

module.exports = connectDB;
