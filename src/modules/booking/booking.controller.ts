/* eslint-disable prettier/prettier */
import { 
    Controller, 
    Post, 
    Get, 
    Put, 
    Delete,
    Body, 
    Param, 
    Query,
    HttpStatus,
    ParseUUIDPipe,
    ValidationPipe,
    UsePipes,
    BadRequestException
} from '@nestjs/common';
import { 
    ApiTags, 
    ApiOperation, 
    ApiResponse, 
    ApiParam, 
    ApiQuery,
    ApiBody,
    ApiBadRequestResponse,
    ApiNotFoundResponse,
    ApiConflictResponse
} from '@nestjs/swagger';
import { BookingService, BookingResult, CancelBookingResult, RescheduleBookingResult } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { isValidObjectId, Types } from 'mongoose';

// Response DTOs for Swagger documentation
class BookingStatsResponseDto {
    totalBookings: number;
    confirmedBookings: number;
    cancelledBookings: number;
    cancellationRate: number;
    avgReschedules: number;
}

class CleanupResponseDto {
    deletedCount: number;
}

class RescheduleRequestDto {
    newDate: string;
    newTime: string;
    reason?: string;
}

class CancelRequestDto {
    reason?: string;
}

@ApiTags('Bookings')
@Controller({ path: 'bookings', version: '1' })
@UsePipes(new ValidationPipe({ transform: true }))
export class BookingController {
    constructor(private readonly bookingService: BookingService) {}

    @Post()
    @ApiOperation({ 
        summary: 'Create a new booking',
        description: 'Creates a new booking with comprehensive validation including user verification, slot availability, and duplicate booking checks.'
    })
    @ApiBody({ 
        type: CreateBookingDto,
        description: 'Booking details including user ID, date, time, and optional notes'
    })
    @ApiResponse({ 
        status: HttpStatus.CREATED, 
        description: 'Booking created successfully',
        schema: {
        type: 'object',
        properties: {
            _id: { type: 'string' },
            userId: { type: 'string' },
            timeSlotId: { type: 'string' },
            bookingDate: { type: 'string', format: 'date-time' },
            bookingTime: { type: 'string' },
            status: { type: 'string', enum: ['CONFIRMED', 'CANCELLED'] },
            notes: { type: 'string' },
            timeUntilBooking: { type: 'string' },
            canCancel: { type: 'boolean' },
            slot: { type: 'object' }
        }
        }
    })
    @ApiBadRequestResponse({ 
        description: 'Invalid input data, user not found, or slot not available',
        schema: {
        type: 'object',
        properties: {
            statusCode: { type: 'number', example: 400 },
            message: { type: 'string', example: 'Selected time slot is not available or does not meet booking requirements' },
            error: { type: 'string', example: 'Bad Request' }
        }
        }
    })
    @ApiConflictResponse({ 
        description: 'User already has a booking for this time slot',
        schema: {
        type: 'object',
        properties: {
            statusCode: { type: 'number', example: 409 },
            message: { type: 'string', example: 'You already have a booking for this time slot' },
            error: { type: 'string', example: 'Conflict' }
        }
        }
    })
    async createBooking(@Body() createBookingDto: CreateBookingDto): Promise<Partial<BookingResult>> {
        return await this.bookingService.createBooking(createBookingDto);
    }

    // FIXED: More specific route for user bookings to avoid conflicts
    @Get('user/:userId')
    @ApiOperation({ 
        summary: 'Get user bookings',
        description: 'Retrieves all bookings for a specific user with optional filtering by date range and booking history.'
    })
    @ApiParam({ 
        name: 'userId', 
        description: 'Unique identifier of the user',
        type: 'string'
    })
    @ApiQuery({ 
        name: 'includeHistory', 
        description: 'Include cancelled bookings in the response',
        type: 'boolean',
        required: false,
        example: false
    })
    @ApiQuery({ 
        name: 'startDate', 
        description: 'Filter bookings from this date (YYYY-MM-DD format)',
        type: 'string',
        required: false,
        example: '2024-01-01'
    })
    @ApiQuery({ 
        name: 'endDate', 
        description: 'Filter bookings until this date (YYYY-MM-DD format)',
        type: 'string',
        required: false,
        example: '2024-12-31'
    })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'User bookings retrieved successfully',
        schema: {
        type: 'array',
        items: {
            type: 'object',
            properties: {
            _id: { type: 'string' },
            userId: { type: 'string' },
            bookingDate: { type: 'string', format: 'date-time' },
            bookingTime: { type: 'string' },
            status: { type: 'string' },
            timeUntilBooking: { type: 'string' },
            canCancel: { type: 'boolean' }
            }
        }
        }
    })
    @ApiBadRequestResponse({ description: 'Invalid user ID or date format' })
    async getUserBookings(
    @Param('userId') userId: string,
    @Query('includeHistory') includeHistory?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
    ): Promise<Partial<BookingResult>[]> {
    // Use mongoose Types.ObjectId.isValid() instead
        if (!Types.ObjectId.isValid(userId)) {
            throw new BadRequestException('Invalid user ID format. Must be a valid MongoDB ObjectId.');
        }

        const includeHistoryBool = includeHistory === 'true';
        return await this.bookingService.getUserBookings(userId, includeHistoryBool, startDate, endDate);
    }

    // FIXED: Added ObjectId validation for booking ID
    @Get(':bookingId')
    @ApiOperation({ 
        summary: 'Get booking by ID',
        description: 'Retrieves detailed information about a specific booking including time until booking and cancellation eligibility.'
    })
    @ApiParam({ 
        name: 'bookingId', 
        description: 'Unique identifier of the booking (must be a valid MongoDB ObjectId)',
        type: 'string'
    })
    @ApiQuery({ 
        name: 'userId', 
        description: 'User ID for authorization (optional)',
        type: 'string',
        required: false
    })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Booking details retrieved successfully'
    })
    @ApiNotFoundResponse({ description: 'Booking not found' })
    @ApiBadRequestResponse({ description: 'Invalid booking ID format or unauthorized to view this booking' })
    async getBookingById(
        @Param('bookingId') bookingId: string,
        @Query('userId') userId?: string
    ): Promise<BookingResult> {
        // Validate bookingId format
        if (!isValidObjectId(bookingId)) {
            throw new BadRequestException('Invalid booking ID format. Must be a valid MongoDB ObjectId.');
        }

        // Validate userId if provided
        if (userId && !isValidObjectId(userId)) {
            throw new BadRequestException('Invalid user ID format');
        }

        return await this.bookingService.getBookingById(bookingId, userId);
    }

    @Put(':bookingId/cancel')
    @ApiOperation({ 
        summary: 'Cancel a booking',
        description: 'Cancels a booking and frees up the associated time slot. Requires at least 1 hour advance notice.'
    })
    @ApiParam({ 
        name: 'bookingId', 
        description: 'Unique identifier of the booking to cancel',
        type: 'string'
    })
    @ApiBody({ 
        type: CancelRequestDto,
        description: 'Optional cancellation reason',
        required: false
    })
    @ApiQuery({ 
        name: 'userId', 
        description: 'User ID for authorization',
        type: 'string',
        required: false
    })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Booking cancelled successfully',
        schema: {
        type: 'object',
        properties: {
            booking: { type: 'object' },
            freedSlot: { type: 'boolean' },
            message: { type: 'string' }
        }
        }
    })
    @ApiNotFoundResponse({ description: 'Booking not found' })
    @ApiBadRequestResponse({ 
        description: 'Cannot cancel booking (too close to appointment time or unauthorized)',
        schema: {
        type: 'object',
        properties: {
            statusCode: { type: 'number', example: 400 },
            message: { type: 'string', example: 'Cannot cancel booking less than 1 hour before appointment' }
        }
        }
    })
    async cancelBooking(
        @Param('bookingId') bookingId: string,
        @Body() cancelRequest: CancelRequestDto = {},
        @Query('userId') userId?: string
    ): Promise<CancelBookingResult> {
        // Validate bookingId format
        if (!isValidObjectId(bookingId)) {
            throw new BadRequestException('Invalid booking ID format');
        }

        // Validate userId if provided
        if (userId && !isValidObjectId(userId)) {
            throw new BadRequestException('Invalid user ID format');
        }

        return await this.bookingService.cancelBooking(bookingId, userId, cancelRequest.reason);
    }

    @Put(':bookingId/reschedule')
    @ApiOperation({ 
        summary: 'Reschedule a booking',
        description: 'Reschedules an existing booking to a new date and time. Validates availability and business rules.'
    })
    @ApiParam({ 
        name: 'bookingId', 
        description: 'Unique identifier of the booking to reschedule',
        type: 'string'
    })
    @ApiBody({ 
        type: RescheduleRequestDto,
        description: 'New booking details'
    })
    @ApiQuery({ 
        name: 'userId', 
        description: 'User ID for authorization',
        type: 'string',
        required: false
    })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Booking rescheduled successfully',
        schema: {
        type: 'object',
        properties: {
            booking: { type: 'object' },
            oldSlotFreed: { type: 'boolean' },
            newSlotBooked: { type: 'boolean' },
            timeUntilNewBooking: { type: 'string' }
        }
        }
    })
    @ApiNotFoundResponse({ description: 'Booking not found' })
    @ApiBadRequestResponse({ 
        description: 'Invalid new booking time or cannot reschedule cancelled booking'
    })
    async rescheduleBooking(
        @Param('bookingId') bookingId: string,
        @Body() rescheduleRequest: RescheduleRequestDto,
        @Query('userId') userId?: string
    ): Promise<RescheduleBookingResult> {
        // Validate bookingId format
        if (!isValidObjectId(bookingId)) {
            throw new BadRequestException('Invalid booking ID format');
        }

        // Validate userId if provided
        if (userId && !isValidObjectId(userId)) {
            throw new BadRequestException('Invalid user ID format');
        }

        return await this.bookingService.rescheduleBooking(
        bookingId,
        rescheduleRequest.newDate,
        rescheduleRequest.newTime,
        userId,
        rescheduleRequest.reason
        );
    }

    // FIXED: More specific route for stats to avoid conflicts
    @Get('stats/analytics')
    @ApiOperation({ 
        summary: 'Get booking statistics',
        description: 'Retrieves booking analytics including total bookings, cancellation rates, and reschedule averages for a specified date range.'
    })
    @ApiQuery({ 
        name: 'startDate', 
        description: 'Start date for statistics (YYYY-MM-DD format)',
        type: 'string',
        required: true,
        example: '2024-01-01'
    })
    @ApiQuery({ 
        name: 'endDate', 
        description: 'End date for statistics (YYYY-MM-DD format)',
        type: 'string',
        required: true,
        example: '2024-12-31'
    })
    @ApiQuery({ 
        name: 'userId', 
        description: 'Filter statistics for specific user (optional)',
        type: 'string',
        required: false
    })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Booking statistics retrieved successfully',
        type: BookingStatsResponseDto
    })
    @ApiBadRequestResponse({ description: 'Invalid date range or format' })
    async getBookingStats(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
        @Query('userId') userId?: string
    ): Promise<BookingStatsResponseDto> {
        // Validate userId if provided
        if (userId && !isValidObjectId(userId)) {
            throw new BadRequestException('Invalid user ID format');
        }

        return await this.bookingService.getBookingStats(startDate, endDate, userId);
    }

    // FIXED: More specific route for cleanup to avoid conflicts
    @Delete('cleanup/old')
    @ApiOperation({ 
        summary: 'Clean up old cancelled bookings',
        description: 'Removes cancelled bookings older than the specified number of days. This is typically used as a maintenance operation.'
    })
    @ApiQuery({ 
        name: 'daysOld', 
        description: 'Number of days old for bookings to be considered for cleanup',
        type: 'number',
        required: false,
        example: 90
    })
    @ApiResponse({ 
        status: HttpStatus.OK, 
        description: 'Cleanup completed successfully',
        type: CleanupResponseDto
    })
    async cleanupOldBookings(
        @Query('daysOld') daysOld?: string
    ): Promise<CleanupResponseDto> {
        const days = daysOld ? parseInt(daysOld, 10) : 90;
        return await this.bookingService.cleanupOldBookings(days);
    }
}