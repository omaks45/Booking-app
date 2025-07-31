/* eslint-disable prettier/prettier */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerConfig } from './config/swagger.config';
import helmet from 'helmet';
import * as compression from 'compression';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  
  // Get configuration values
  const port = configService.get<number>('app.port') || 5000;
  const environment = configService.get<string>('app.environment') || 'development';
  const apiPrefix = configService.get<string>('app.apiPrefix') || 'api';
  const corsOrigins = configService.get<string[]>('app.corsOrigins') || ['http://localhost:5000'];

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: environment === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  }));

  // Compression middleware
  app.use(compression());

  // Body parsing configuration for handling user data
  app.use(json({ 
    limit: '10mb', // Adjust based on your needs
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    }
  }));
  
  app.use(urlencoded({ 
    extended: true, 
    limit: '10mb',
    parameterLimit: 50000 // Prevent parameter pollution attacks
  }));

  // CORS configuration
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
      'Cache-Control'
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Global validation pipe for data validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error for non-whitelisted properties
      disableErrorMessages: environment === 'production', // Hide detailed validation errors in production
      validationError: {
        target: false,
        value: false,
      },
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // API versioning
  //app.enableVersioning({
    //type: VersioningType.URI,
    //defaultVersion: '1',
  //});

  // Set global API prefix
  app.setGlobalPrefix(apiPrefix, {
    exclude: ['/health', '/'], // Exclude health check and root from prefix
  });

  // DEBUG: Log configuration
  console.log('\n=== DEBUGGING CONFIGURATION ===');
  console.log(`API Prefix: ${apiPrefix}`);
  console.log(`Environment: ${environment}`);
  console.log(`Port: ${port}`);
  console.log(`CORS Origins: ${JSON.stringify(corsOrigins)}`);
  
  // Debug config service values
  console.log('\nConfig Service Values:');
  console.log('app.port:', configService.get('app.port'));
  console.log('app.environment:', configService.get('app.environment'));
  console.log('app.apiPrefix:', configService.get('app.apiPrefix'));
  console.log('app.corsOrigins:', configService.get('app.corsOrigins'));
  
  console.log('\n=== END DEBUGGING ===\n');

  // Setup Swagger documentation
  // Enable Swagger in both development and production
  const enableSwagger = environment === 'development' || 
    configService.get<string>('ENABLE_SWAGGER') === 'true';
  
  if (enableSwagger) {
    SwaggerConfig.setup(app);
    console.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);
  }

  // Graceful shutdown handling
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  // Start server
  await app.listen(port, '0.0.0.0');
  
  //console.log(`Application running on: http://localhost:${port}`);
  //console.log(`API endpoints should be available at: http://localhost:${port}/${apiPrefix}`);
  //console.log(`Test endpoint: http://localhost:${port}/${apiPrefix}/time-slots/available?date=2025-07-31`);
  
  if (environment === 'development') {
    console.log(`Health check: http://localhost:${port}/health`);
  }
}

bootstrap().catch((error) => {
  console.error('Error starting application:', error);
  process.exit(1);
});