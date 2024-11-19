const mongoose = require('mongoose');
const User = require('./models/User');

const mongoURI = 'mongodb://admin:VRuAd2Nvmp4ELHh5@localhost:27017/test?authSource=admin';

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(async () => {
        console.log('Connected to MongoDB');

        const users = [
            { username: 'admin', password: 'admin123', role: 'admin' },
            { username: 'user1', password: 'user1', role: 'user' },
            { username: 'user2', password: 'user2', role: 'user' },
        ];

        await User.deleteMany({});
        await User.insertMany(users);

        console.log('Users seeded successfully');
        mongoose.connection.close();
    })
    .catch(err => console.error('Error connecting to MongoDB:', err));
