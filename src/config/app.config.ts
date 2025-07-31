/* eslint-disable prettier/prettier */
import { registerAs } from '@nestjs/config';

export interface AppConfig {
  port: number;
  environment: string;
  apiPrefix: string;
  corsOrigins: string[];
  rateLimiting: {
    ttl: number;
    limit: number;
  };
  booking: {
    minimumAdvanceHours: number;
    maxBookingsPerUser: number;
    workingHours: {
      start: string;
      end: string;
    };
    slotDuration: number;
  };
  timezone: string;
  swagger: {
    enabled: boolean;
    path: string;
  };
}

export default registerAs('app', (): AppConfig => ({
    port: parseInt(process.env.PORT, 10) || 5000,
    environment: process.env.NODE_ENV || 'development',
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
        'http://localhost:3000', 
        'http://localhost:3001',
        'http://localhost:5000'
    ],
    rateLimiting: {
        ttl: parseInt(process.env.RATE_LIMIT_TTL, 10) || 60,
        limit: parseInt(process.env.RATE_LIMIT_LIMIT, 10) || 100,
    },
    booking: {
        minimumAdvanceHours: parseInt(process.env.MIN_ADVANCE_HOURS, 10) || 3,
        maxBookingsPerUser: parseInt(process.env.MAX_BOOKINGS_PER_USER, 10) || 5,
        workingHours: {
        start: process.env.WORKING_HOURS_START || '09:00',
        end: process.env.WORKING_HOURS_END || '17:00',
        },
        slotDuration: parseInt(process.env.SLOT_DURATION_MINUTES, 10) || 60,
    },
    timezone: process.env.TIMEZONE || 'UTC',
    swagger: {
        enabled: process.env.NODE_ENV === 'development' || process.env.ENABLE_SWAGGER === 'true',
        path: process.env.SWAGGER_PATH || 'api/docs',
    },
}));