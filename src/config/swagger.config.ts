/* eslint-disable prettier/prettier */
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export class SwaggerConfig {
    static setup(app: INestApplication): void {
        const config = new DocumentBuilder()
        .setTitle('Time Slot Booking API')
        .setDescription(`
            A comprehensive booking system API that allows users to:
            - Schedule consultation appointments with 3-hour advance notice
            - Manage user information and profiles
            - View available time slots
            - Cancel and reschedule bookings
            
            ## Key Features:
            - **3-Hour Rule**: All bookings must be made at least 3 hours in advance
            - **Real-time Availability**: Dynamic time slot generation and availability checking
            - **User Management**: Complete user profile and booking history
            - **Flexible Scheduling**: Configurable working hours and slot durations
            
        `)
        .setVersion('1.0')
        .addTag('Users', 'User management and profile operations')
        .addTag('Time Slots', 'Available time slot operations')
        .addTag('Bookings', 'Booking management and scheduling')
        .addTag('Health', 'API health check endpoints')
        .addServer('http://localhost:3000', 'Development server')
        .addServer('http://localhost:5000', 'Development server (alt port)')
        .addServer('https://api.yourdomain.com', 'Production server')
        .addBearerAuth(
            {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Enter JWT token for authentication',
            },
            'JWT-auth',
        )
        .addApiKey(
            {
            type: 'apiKey',
            name: 'X-API-Key',
            in: 'header',
            description: 'API Key for external integrations',
            },
            'API-Key',
        )
        .setContact(
            'API Support',
            'https://yourdomain.com/support',
            'support@yourdomain.com'
        )
        .setLicense(
            'MIT',
            'https://opensource.org/licenses/MIT'
        )
        .setTermsOfService('https://yourdomain.com/terms')
        .build();

        const document = SwaggerModule.createDocument(app, config, {
        operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
        deepScanRoutes: true,
        });

        // Add global responses for better documentation
        document.components.responses = {
        BadRequest: {
            description: 'Bad Request - Invalid input parameters',
            content: {
            'application/json': {
                schema: {
                type: 'object',
                properties: {
                    statusCode: { type: 'number', example: 400 },
                    message: { 
                    oneOf: [
                        { type: 'string' },
                        { type: 'array', items: { type: 'string' } }
                    ],
                    example: 'Validation failed'
                    },
                    error: { type: 'string', example: 'Bad Request' },
                    timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
                    path: { type: 'string', example: '/api/v1/bookings' }
                }
                }
            }
            }
        },
        Unauthorized: {
            description: 'Unauthorized - Invalid or missing authentication',
            content: {
            'application/json': {
                schema: {
                type: 'object',
                properties: {
                    statusCode: { type: 'number', example: 401 },
                    message: { type: 'string', example: 'Unauthorized' },
                    error: { type: 'string', example: 'Unauthorized' }
                }
                }
            }
            }
        },
        NotFound: {
            description: 'Not Found - Resource not found',
            content: {
            'application/json': {
                schema: {
                type: 'object',
                properties: {
                    statusCode: { type: 'number', example: 404 },
                    message: { type: 'string', example: 'Resource not found' },
                    error: { type: 'string', example: 'Not Found' }
                }
                }
            }
            }
        },
        TooManyRequests: {
            description: 'Rate limit exceeded',
            content: {
            'application/json': {
                schema: {
                type: 'object',
                properties: {
                    statusCode: { type: 'number', example: 429 },
                    message: { type: 'string', example: 'Too many requests' },
                    error: { type: 'string', example: 'Too Many Requests' }
                }
                }
            }
            }
        },
        InternalServerError: {
            description: 'Internal Server Error',
            content: {
            'application/json': {
                schema: {
                type: 'object',
                properties: {
                    statusCode: { type: 'number', example: 500 },
                    message: { type: 'string', example: 'Internal server error' },
                    error: { type: 'string', example: 'Internal Server Error' }
                }
                }
            }
            }
        }
        };

        // Determine environment-specific settings
        const isProduction = process.env.NODE_ENV === 'production';
        
        SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
            persistAuthorization: !isProduction, // Don't persist auth in production
            displayRequestDuration: true,
            docExpansion: 'none',
            filter: true,
            showRequestHeaders: true,
            tryItOutEnabled: true,
            tagsSorter: 'alpha',
            operationsSorter: 'alpha',
            defaultModelsExpandDepth: 2,
            defaultModelExpandDepth: 2,
            displayOperationId: !isProduction,
        },
        customSiteTitle: 'Booking System API Documentation',
        customfavIcon: '/favicon.ico',
        customCss: `
            .swagger-ui .topbar { display: none; }
            .swagger-ui .info { margin: 20px 0; }
            .swagger-ui .scheme-container { margin: 20px 0; }
        `,
        });
    }

    // Method to check if Swagger should be enabled
    static shouldEnable(): boolean {
        const env = process.env.NODE_ENV || 'development';
        const explicitlyEnabled = process.env.ENABLE_SWAGGER === 'true';
        
        return env === 'development' || explicitlyEnabled;
    }
}