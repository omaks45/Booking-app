/* eslint-disable prettier/prettier */
import { registerAs } from '@nestjs/config';
import { MongooseModuleOptions } from '@nestjs/mongoose';

export default registerAs('database', (): MongooseModuleOptions => ({
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/booking-system',
    retryWrites: true,
    w: 'majority',
    retryAttempts: 3,
    retryDelay: 1000,
    autoIndex: process.env.NODE_ENV !== 'production', 
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    bufferCommands: false, // Disable mongoose buffering
}));

// Alternative factory function approach for more complex configurations
export const databaseConfigFactory = () => {
    const uri = process.env.MONGO_URI;
    
    if (!uri) {
        throw new Error('MONGO_URI environment variable is not defined');
    }

  // Extract database name from URI for logging (optional)
    const dbName = uri.split('/').pop()?.split('?')[0] || 'unknown';
    
    console.log(`Connecting to MongoDB Atlas database: ${dbName}`);

    return {
        uri,
        useNewUrlParser: true,
        useUnifiedTopology: true,
        retryWrites: true,
        w: 'majority',
        retryAttempts: 3,
        retryDelay: 1000,
        autoIndex: process.env.NODE_ENV !== 'production',
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferMaxEntries: 0,
        bufferCommands: false,
        // Additional Atlas-specific options
        ssl: true,
        sslValidate: true,
        authSource: 'admin',
    };
};

// Connection event handlers (optional - for monitoring)
export const mongooseConnectionHandlers = {
    onConnectionCreate: (connection: any) => {
        console.log('MongoDB connection created');
        
        connection.on('connected', () => {
        console.log('MongoDB Atlas connected successfully');
        });

        connection.on('error', (error: Error) => {
        console.error('MongoDB connection error:', error.message);
        });

        connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
        });

        connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
        });
    }
};