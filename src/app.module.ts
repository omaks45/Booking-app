/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import databaseConfig from './config/database.config';
import appConfig from './config/app.config';
import { BookingModule } from './modules/booking/booking.module';
import { TimeSlotModule } from './modules/time-slot/time-slot.module';
import { UserModule } from './modules/users/users.module';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, appConfig],
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),
    
    // Database connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
        retryWrites: true,
        w: 'majority',
        retryAttempts: 3,
        retryDelay: 1000,
        autoIndex: configService.get<string>('NODE_ENV') !== 'production',
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        // Atlas-specific options
        ssl: true,
        authSource: 'admin',
      }),
      inject: [ConfigService],
    }),
    
    // Feature modules - Order matters due to dependencies
    UserModule,     // Base module with no dependencies
    TimeSlotModule, // Depends on ConfigModule (which is global)
    BookingModule,  // Depends on TimeSlotModule and UserModule
  ],
})
export class AppModule {}