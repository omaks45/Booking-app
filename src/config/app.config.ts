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
}

export default registerAs('app', (): AppConfig => ({
    port: parseInt(process.env.PORT, 10) || 3000,
    environment: process.env.NODE_ENV || 'development',
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
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
}));

// Validation schema for environment variables
export const appConfigValidationSchema = {
    PORT: {
        default: 3000,
        validate: (value: string) => {
        const port = parseInt(value, 10);
        if (isNaN(port) || port < 1 || port > 65535) {
            throw new Error('PORT must be a valid port number between 1 and 65535');
        }
        return port;
        }
    },
    NODE_ENV: {
        default: 'development',
        validate: (value: string) => {
        const validEnvs = ['development', 'production', 'test', 'staging'];
        if (!validEnvs.includes(value)) {
            throw new Error(`NODE_ENV must be one of: ${validEnvs.join(', ')}`);
        }
        return value;
        }
    },
    MIN_ADVANCE_HOURS: {
        default: 3,
        validate: (value: string) => {
        const hours = parseInt(value, 10);
        if (isNaN(hours) || hours < 0 || hours > 168) {
            throw new Error('MIN_ADVANCE_HOURS must be between 0 and 168 hours');
        }
        return hours;
        }
    }
};