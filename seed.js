require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User'); // Adjust path as necessary

const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI)
    .then(async () => {
        console.log('Connected to MongoDB');

        const users = [
            { username: 'admin', password: 'admin123', role: 'admin' },
            { username: 'user1', password: 'user1', role: 'client' },
            { username: 'user2', password: 'user2', role: 'client' },
        ];

        await User.deleteMany({}); // Clear existing users
        await User.insertMany(users); // Insert new users

        console.log('Users seeded successfully');
        mongoose.connection.close();
    })
    .catch(err => console.error('Error connecting to MongoDB:', err));