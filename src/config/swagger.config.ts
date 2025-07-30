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
        .addServer('https://api.yourdomain.com', 'Production server')
        .addBearerAuth(
            {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Enter JWT token for authentication',
            },
            'JWT-auth', // This name will be used to reference this security scheme
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

        // Customize the document with additional metadata
        document.info.contact = {
        name: 'Booking System API',
        url: 'https://yourdomain.com',
        email: 'api@yourdomain.com',
        };

        // Add global responses
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

        SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            docExpansion: 'none',
            filter: true,
            showRequestHeaders: true,
            tryItOutEnabled: true,
            tagsSorter: 'alpha',
            operationsSorter: 'alpha',
        },
        customSiteTitle: 'Booking System API Documentation',
        customfavIcon: '/favicon.ico',
        customJs: [
            'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
        ],
        customCssUrl: [
            'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
        ],
        });

        console.log('📚 Swagger documentation available at: /api/docs');
    }

    // Method to generate OpenAPI JSON
    static generateOpenApiJson(app: INestApplication): any {
        const config = new DocumentBuilder()
        .setTitle('Time Slot Booking API')
        .setDescription('API for booking time slots with user management')
        .setVersion('1.0')
        .build();

        return SwaggerModule.createDocument(app, config);
    }
    }

// Custom decorator for common API responses
export const ApiCommonResponses = () => {
    return () => {
        // This would be implemented as a method decorator
        // combining common Swagger decorators
    };
};

// Swagger configuration for different environments
export const swaggerEnvironmentConfig = {
    development: {
        enabled: true,
        path: 'api/docs',
        options: {
        swaggerOptions: {
            persistAuthorization: true,
        },
        },
    },
    production: {
        enabled: process.env.ENABLE_SWAGGER === 'true',
        path: 'docs',
        options: {
        swaggerOptions: {
            persistAuthorization: false,
        },
        },
    },
    test: {
        enabled: false,
    },
};