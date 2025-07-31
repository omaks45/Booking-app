/* eslint-disable prettier/prettier */
import { 
  Controller, 
  Get, 
  Post,
  Put,
  Delete,
  Query, 
  Param, 
  Body,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiQuery, 
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse
} from '@nestjs/swagger';
import { TimeSlotService, SlotBookingResult } from './time-slot.service';
import { TimeSlot } from './schemas/time-slot.schema';

// Request/Response DTOs for Swagger documentation
class BookSlotRequestDto {
  userId?: string;
  metadata?: Record<string, any>;
}

class BookingStatsResponseDto {
  totalSlots: number;
  bookedSlots: number;
  availableSlots: number;
  utilizationRate: number;
}

class BulkFreeRequestDto {
  slotIds: string[];
}

class BulkFreeResponseDto {
  freedSlots: string[];
  errors: Array<{ slotId: string; error: string }>;
}

class CleanupResponseDto {
  deletedCount: number;
}

@ApiTags('Time Slots')
@Controller('time-slots')
@UsePipes(new ValidationPipe({ transform: true }))
export class TimeSlotController {
  constructor(private readonly timeSlotService: TimeSlotService) {}

  @Get('available')
  @ApiOperation({ 
    summary: 'Get available time slots for a specific date',
    description: 'Retrieves all available time slots for a given date, filtered by business rules and advance notice requirements.'
  })
  @ApiQuery({ 
    name: 'date', 
    description: 'Date in YYYY-MM-DD format',
    type: 'string',
    required: true,
    example: '2024-02-15'
  })
  @ApiQuery({ 
    name: 'includeWeekends', 
    description: 'Include weekend slots if available',
    type: 'boolean',
    required: false,
    example: false
  })
  @ApiQuery({ 
    name: 'duration', 
    description: 'Slot duration in minutes',
    type: 'number',
    required: false,
    example: 60
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Available time slots retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          date: { type: 'string', format: 'date-time' },
          startTime: { type: 'string', example: '09:00' },
          endTime: { type: 'string', example: '10:00' },
          status: { type: 'string', enum: ['AVAILABLE', 'BOOKED'] },
          duration: { type: 'number', example: 60 }
        }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid date format or date does not meet business rules',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Date must be at least 3 hours in the future' }
      }
    }
  })
  async getAvailableSlots(
    @Query('date') date: string,
    @Query('includeWeekends') includeWeekends?: string,
    @Query('duration') duration?: string
  ): Promise<TimeSlot[]> {
    const params = {
      date,
      includeWeekends: includeWeekends === 'true',
      duration: duration ? parseInt(duration, 10) : undefined
    };
    return await this.timeSlotService.getAvailableSlots(params);
  }

  @Get('available/range')
  @ApiOperation({ 
    summary: 'Get available slots for multiple dates',
    description: 'Retrieves available time slots for a range of dates, useful for calendar views and bulk operations.'
  })
  @ApiQuery({ 
    name: 'startDate', 
    description: 'Start date in YYYY-MM-DD format',
    type: 'string',
    required: true,
    example: '2024-02-01'
  })
  @ApiQuery({ 
    name: 'days', 
    description: 'Number of days to include in the range',
    type: 'number',
    required: true,
    example: 7
  })
  @ApiQuery({ 
    name: 'includeWeekends', 
    description: 'Include weekend dates in the range',
    type: 'boolean',
    required: false,
    example: false
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Available slots for date range retrieved successfully',
    schema: {
      type: 'object',
      additionalProperties: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            startTime: { type: 'string' },
            endTime: { type: 'string' },
            status: { type: 'string' }
          }
        }
      },
      example: {
        '2024-02-01': [
          { _id: '507f1f77bcf86cd799439011', startTime: '09:00', endTime: '10:00', status: 'AVAILABLE' }
        ]
      }
    }
  })
  @ApiBadRequestResponse({ description: 'Invalid date range or parameters' })
  async getAvailableSlotsRange(
    @Query('startDate') startDate: string,
    @Query('days') days: string,
    @Query('includeWeekends') includeWeekends?: string
  ): Promise<Record<string, TimeSlot[]>> {
    const daysNumber = parseInt(days, 10);
    const includeWeekendsBoolean = includeWeekends === 'true';
    
    const slotsMap = await this.timeSlotService.getAvailableSlotsRange(
      startDate, 
      daysNumber, 
      includeWeekendsBoolean
    );
    
    // Convert Map to Object for JSON serialization
    return Object.fromEntries(slotsMap);
  }

  @Get(':slotId')
  @ApiOperation({ 
    summary: 'Get detailed information about a specific time slot',
    description: 'Retrieves detailed information about a time slot including booking status, cancellation eligibility, and time calculations.'
  })
  @ApiParam({ 
    name: 'slotId', 
    description: 'Unique identifier of the time slot',
    type: 'string'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Time slot details retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        date: { type: 'string', format: 'date-time' },
        startTime: { type: 'string' },
        endTime: { type: 'string' },
        status: { type: 'string' },
        bookedBy: { type: 'string' },
        timeUntilSlot: { type: 'string' },
        canCancel: { type: 'boolean' },
        isBookable: { type: 'boolean' }
      }
    }
  })
  @ApiNotFoundResponse({ description: 'Time slot not found' })
  async getSlotById(@Param('slotId') slotId: string): Promise<TimeSlot & {
    timeUntilSlot?: string;
    canCancel?: boolean;
    isBookable?: boolean;
  }> {
    return await this.timeSlotService.getSlotById(slotId);
  }

  @Get('check/availability')
  @ApiOperation({ 
    summary: 'Check if a specific time slot is available',
    description: 'Quickly checks availability of a specific date and time without creating slots. Useful for real-time validation.'
  })
  @ApiQuery({ 
    name: 'date', 
    description: 'Date in YYYY-MM-DD format',
    type: 'string',
    required: true,
    example: '2024-02-15'
  })
  @ApiQuery({ 
    name: 'time', 
    description: 'Time in HH:MM format',
    type: 'string',
    required: true,
    example: '14:30'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Availability check completed',
    schema: {
      type: 'object',
      properties: {
        available: { type: 'boolean' },
        date: { type: 'string' },
        time: { type: 'string' }
      }
    }
  })
  async checkSlotAvailability(
    @Query('date') date: string,
    @Query('time') time: string
  ): Promise<{ available: boolean; date: string; time: string }> {
    const available = await this.timeSlotService.isSlotAvailable(date, time);
    return { available, date, time };
  }

  @Post(':slotId/book')
  @ApiOperation({ 
    summary: 'Book a specific time slot',
    description: 'Books a time slot with atomic operations to prevent race conditions. Validates advance notice and business rules.'
  })
  @ApiParam({ 
    name: 'slotId', 
    description: 'Unique identifier of the time slot to book',
    type: 'string'
  })
  @ApiBody({ 
    type: BookSlotRequestDto,
    description: 'Booking details including user ID and optional metadata',
    required: false
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Time slot booked successfully',
    schema: {
      type: 'object',
      properties: {
        slot: { type: 'object' },
        timeUntilBooking: { type: 'string' },
        canCancel: { type: 'boolean' }
      }
    }
  })
  @ApiNotFoundResponse({ description: 'Time slot not found' })
  @ApiConflictResponse({ 
    description: 'Time slot is no longer available',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'Time slot is no longer available' }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Booking does not meet advance notice requirements'
  })
  async bookSlot(
    @Param('slotId') slotId: string,
    @Body() bookingRequest: BookSlotRequestDto = {}
  ): Promise<SlotBookingResult> {
    return await this.timeSlotService.bookSlot(
      slotId, 
      bookingRequest.userId, 
      bookingRequest.metadata
    );
  }

  @Put(':slotId/cancel')
  @ApiOperation({ 
    summary: 'Cancel a booked time slot',
    description: 'Cancels a booked time slot and makes it available again. Requires at least 1 hour advance notice.'
  })
  @ApiParam({ 
    name: 'slotId', 
    description: 'Unique identifier of the time slot to cancel',
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
    description: 'Time slot cancelled successfully',
    type: TimeSlot
  })
  @ApiNotFoundResponse({ description: 'Slot not found or cannot be cancelled' })
  @ApiBadRequestResponse({ 
    description: 'Cannot cancel booking less than 1 hour before appointment'
  })
  async cancelSlot(
    @Param('slotId') slotId: string,
    @Query('userId') userId?: string
  ): Promise<TimeSlot> {
    return await this.timeSlotService.cancelSlot(slotId, userId);
  }

  @Put('bulk/free')
  @ApiOperation({ 
    summary: 'Free multiple booked slots in bulk',
    description: 'Frees multiple time slots in a single operation. Useful for batch cancellations or administrative operations.'
  })
  @ApiBody({ 
    type: BulkFreeRequestDto,
    description: 'Array of slot IDs to free'
  })
  @ApiQuery({ 
    name: 'userId', 
    description: 'User ID for authorization (optional)',
    type: 'string',
    required: false
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Bulk operation completed',
    type: BulkFreeResponseDto
  })
  async freeMultipleSlots(
    @Body() request: BulkFreeRequestDto,
    @Query('userId') userId?: string
  ): Promise<BulkFreeResponseDto> {
    return await this.timeSlotService.freeMultipleSlots(request.slotIds, userId);
  }

  @Get('user/:userId/booked')
  @ApiOperation({ 
    summary: 'Get all booked slots for a specific user',
    description: 'Retrieves all time slots booked by a specific user with optional date filtering.'
  })
  @ApiParam({ 
    name: 'userId', 
    description: 'Unique identifier of the user',
    type: 'string'
  })
  @ApiQuery({ 
    name: 'startDate', 
    description: 'Filter slots from this date (YYYY-MM-DD format)',
    type: 'string',
    required: false,
    example: '2024-01-01'
  })
  @ApiQuery({ 
    name: 'endDate', 
    description: 'Filter slots until this date (YYYY-MM-DD format)',
    type: 'string',
    required: false,
    example: '2024-12-31'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'User\'s booked slots retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          date: { type: 'string', format: 'date-time' },
          startTime: { type: 'string' },
          endTime: { type: 'string' },
          status: { type: 'string', example: 'BOOKED' },
          bookedBy: { type: 'string' },
          bookedAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  })
  async getUserBookedSlots(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): Promise<TimeSlot[]> {
    return await this.timeSlotService.getUserBookedSlots(userId, startDate, endDate);
  }

  @Get('stats/utilization')
  @ApiOperation({ 
    summary: 'Get time slot utilization statistics',
    description: 'Retrieves booking statistics and utilization rates for time slots within a specified date range.'
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
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Utilization statistics retrieved successfully',
    type: BookingStatsResponseDto
  })
  @ApiBadRequestResponse({ description: 'Invalid date range or format' })
  async getBookingStats(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ): Promise<BookingStatsResponseDto> {
    return await this.timeSlotService.getBookingStats(startDate, endDate);
  }

  @Delete('cleanup/old')
  @ApiOperation({ 
    summary: 'Clean up old time slots',
    description: 'Removes time slots older than the specified number of days. This is typically used as a maintenance operation.'
  })
  @ApiQuery({ 
    name: 'daysOld', 
    description: 'Number of days old for slots to be considered for cleanup',
    type: 'number',
    required: false,
    example: 30
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Cleanup completed successfully',
    type: CleanupResponseDto
  })
  async cleanupOldSlots(
    @Query('daysOld') daysOld?: string
  ): Promise<CleanupResponseDto> {
    const days = daysOld ? parseInt(daysOld, 10) : 30;
    return await this.timeSlotService.cleanupOldSlots(days);
  }

  @Put(':currentSlotId/reschedule')
  @ApiOperation({ 
    summary: 'Reschedule a booked slot to a new time',
    description: 'Reschedules an existing booked slot to a new date and time. Atomically frees the old slot and books the new one.'
  })
  @ApiParam({ 
    name: 'currentSlotId', 
    description: 'Unique identifier of the current booked slot',
    type: 'string'
  })
  @ApiQuery({ 
    name: 'newDate', 
    description: 'New date in YYYY-MM-DD format',
    type: 'string',
    required: true,
    example: '2024-02-20'
  })
  @ApiQuery({ 
    name: 'newTime', 
    description: 'New time in HH:MM format',
    type: 'string',
    required: true,
    example: '15:30'
  })
  @ApiQuery({ 
    name: 'userId', 
    description: 'User ID for authorization (optional)',
    type: 'string',
    required: false
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Slot rescheduled successfully',
    schema: {
      type: 'object',
      properties: {
        oldSlot: { type: 'object' },
        newSlot: { type: 'object' },
        timeUntilNewBooking: { type: 'string' }
      }
    }
  })
  @ApiNotFoundResponse({ description: 'Current slot not found' })
  @ApiBadRequestResponse({ 
    description: 'New time slot is not available or unauthorized to reschedule'
  })
  async rescheduleSlot(
    @Param('currentSlotId') currentSlotId: string,
    @Query('newDate') newDate: string,
    @Query('newTime') newTime: string,
    @Query('userId') userId?: string
  ): Promise<{
    oldSlot: TimeSlot;
    newSlot: TimeSlot;
    timeUntilNewBooking: string;
  }> {
    return await this.timeSlotService.rescheduleSlot(
      currentSlotId,
      newDate,
      newTime,
      userId
    );
  }
}