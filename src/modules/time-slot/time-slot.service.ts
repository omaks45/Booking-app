/* eslint-disable prettier/prettier */
import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TimeSlot, SlotStatus } from './schemas/time-slot.schema';
import { DateUtil } from '../../common/utils/date.utils';
import { ConfigService } from '@nestjs/config';

export interface GetAvailableSlotsDto {
  date: string;
  includeWeekends?: boolean;
  duration?: number;
}

export interface SlotBookingResult {
  slot: TimeSlot;
  timeUntilBooking: string;
  canCancel: boolean;
}

@Injectable()
export class TimeSlotService {
  private readonly workingHours: { start: string; end: string };
  private readonly slotDuration: number;
  private readonly advanceHours: number;
  private readonly allowWeekends: boolean;

  constructor(
    @InjectModel(TimeSlot.name) private timeSlotModel: Model<TimeSlot>,
    private configService: ConfigService,
  ) {
    // Cache configuration values for better performance
    this.workingHours = {
      start: this.configService.get<string>('app.booking.workingHours.start') || '09:00',
      end: this.configService.get<string>('app.booking.workingHours.end') || '17:00',
    };
    this.slotDuration = this.configService.get<number>('app.booking.slotDuration') || 60;
    this.advanceHours = this.configService.get<number>('app.booking.minimumAdvanceHours') || 3;
    this.allowWeekends = this.configService.get<boolean>('app.booking.allowWeekends') || false;
  }

  /**
   * Get available slots for a specific date with optimized performance
   * Time Complexity: O(n) where n is the number of existing slots
   */
  async getAvailableSlots(params: GetAvailableSlotsDto): Promise<TimeSlot[]> {
    const { date, includeWeekends = this.allowWeekends, duration = this.slotDuration } = params;

    // Validate date format and business rules
    const validation = DateUtil.validateBookingDateTime(
      date,
      this.workingHours.start,
      {
        advanceHours: this.advanceHours,
        startTime: this.workingHours.start,
        endTime: this.workingHours.end,
        allowWeekends: includeWeekends,
      }
    );

    if (!validation.isValid) {
      throw new BadRequestException(validation.errors.join(', '));
    }

    // Generate or retrieve slots efficiently
    const slots = await this.getOrCreateDaySlots(date, duration);
    
    // Filter available slots based on advance notice and current time
    return this.filterAvailableSlots(slots, date);
  }

  /**
   * Get available slots for multiple dates (batch operation)
   * Time Complexity: O(d * s) where d is days and s is slots per day
   */
  async getAvailableSlotsRange(
    startDate: string,
    days: number,
    includeWeekends: boolean = this.allowWeekends
  ): Promise<Map<string, TimeSlot[]>> {
    const dateRange = includeWeekends 
      ? DateUtil.getDateRange(days, DateUtil.parseDate(startDate))
      : DateUtil.getBusinessDateRange(days, DateUtil.parseDate(startDate));

    const slotsMap = new Map<string, TimeSlot[]>();

    // Use Promise.all for parallel processing of multiple dates
    const slotPromises = dateRange.map(async (date) => {
      try {
        const slots = await this.getAvailableSlots({ date, includeWeekends });
        return { date, slots };
      } catch (error) {
        // Skip invalid dates but log for monitoring
        console.warn(`Skipping date ${date}: ${error.message}`);
        return { date, slots: [] };
      }
    });

    const results = await Promise.all(slotPromises);
    
    results.forEach(({ date, slots }) => {
      slotsMap.set(date, slots);
    });

    return slotsMap;
  }

  /**
   * Book a time slot with comprehensive validation
   * Time Complexity: O(1) - single document operations
   */
  async bookSlot(
    slotId: string,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<SlotBookingResult> {
    // Use findOneAndUpdate with atomic operation to prevent race conditions
    const slot = await this.timeSlotModel.findOneAndUpdate(
      { 
        _id: slotId, 
        status: SlotStatus.AVAILABLE 
      },
      { 
        $set: { 
          status: SlotStatus.BOOKED,
          bookedBy: userId,
          bookedAt: new Date(),
          metadata: metadata || {}
        }
      },
      { 
        new: true,
        runValidators: true
      }
    );

    if (!slot) {
      // Check if slot exists but is not available
      const existingSlot = await this.timeSlotModel.findById(slotId);
      if (!existingSlot) {
        throw new NotFoundException('Time slot not found');
      }
      throw new ConflictException('Time slot is no longer available');
    }

    // Validate advance notice at booking time (double-check)
    const slotDateTime = DateUtil.parseDateTime(
      DateUtil.formatDate(slot.date),
      slot.startTime
    );

    if (!DateUtil.meetsAdvanceNotice(slotDateTime, this.advanceHours)) {
      // Rollback the booking
      await this.timeSlotModel.findByIdAndUpdate(
        slotId,
        { $set: { status: SlotStatus.AVAILABLE }, $unset: { bookedBy: 1, bookedAt: 1, metadata: 1 } }
      );
      throw new BadRequestException(
        `Bookings must be made at least ${this.advanceHours} hours in advance`
      );
    }

    const timeUntilBooking = DateUtil.getTimeUntilBooking(slotDateTime);
    const canCancel = DateUtil.meetsAdvanceNotice(slotDateTime, 1); // 1 hour cancellation window

    return {
      slot,
      timeUntilBooking,
      canCancel
    };
  }

  /**
   * Cancel a booked slot
   * Time Complexity: O(1)
   */
  async cancelSlot(slotId: string, userId?: string): Promise<TimeSlot> {
    const filter: any = { _id: slotId, status: SlotStatus.BOOKED };
    
    // If userId provided, ensure only the user who booked can cancel
    if (userId) {
      filter.bookedBy = userId;
    }

    const slot = await this.timeSlotModel.findOneAndUpdate(
      filter,
      { 
        $set: { status: SlotStatus.AVAILABLE },
        $unset: { bookedBy: 1, bookedAt: 1, metadata: 1 }
      },
      { new: true }
    );

    if (!slot) {
      throw new NotFoundException('Slot not found or cannot be cancelled');
    }

    // Check if cancellation is within allowed timeframe
    const slotDateTime = DateUtil.parseDateTime(
      DateUtil.formatDate(slot.date),
      slot.startTime
    );

    if (!DateUtil.meetsAdvanceNotice(slotDateTime, 1)) {
      // Rollback cancellation
      await this.timeSlotModel.findByIdAndUpdate(
        slotId,
        { $set: { status: SlotStatus.BOOKED, bookedBy: userId } }
      );
      throw new BadRequestException('Cannot cancel booking less than 1 hour before appointment');
    }

    return slot;
  }

  /**
   * Get or create slots for a specific date with caching strategy
   * Time Complexity: O(log n) for query + O(s) for slot generation if needed
   */
  private async getOrCreateDaySlots(date: string, duration: number = this.slotDuration): Promise<TimeSlot[]> {
    const startOfDay = new Date(date + 'T00:00:00.000Z');
    const endOfDay = new Date(date + 'T23:59:59.999Z');

    // Use index-optimized query
    const existingSlots = await this.timeSlotModel
      .find({
        date: { $gte: startOfDay, $lte: endOfDay },
        duration: duration
      })
      .sort({ startTime: 1 })
      .lean(); // Use lean() for better performance when we don't need Mongoose documents

    if (existingSlots.length > 0) {
      // Convert lean documents back to Mongoose documents for consistency
      return existingSlots.map(slot => new this.timeSlotModel(slot));
    }

    // Generate slots efficiently using DateUtil
    return await this.generateDaySlots(date, duration);
  }

  /**
   * Generate time slots for a specific date
   * Time Complexity: O(s) where s is the number of slots per day
   */
  private async generateDaySlots(date: string, duration: number): Promise<TimeSlot[]> {
    // Use DateUtil to generate time slots
    const timeSlots = DateUtil.generateTimeSlots(
      this.workingHours.start,
      this.workingHours.end,
      duration
    );

    // Prepare bulk insert data
    const slotDocuments = timeSlots.map(startTime => ({
      date: new Date(date + 'T00:00:00.000Z'),
      startTime,
      endTime: DateUtil.addMinutesToTime(startTime, duration),
      status: SlotStatus.AVAILABLE,
      duration,
      createdAt: new Date()
    }));

    try {
      // Use insertMany for better performance
      const createdSlots = await this.timeSlotModel.insertMany(slotDocuments, {
        ordered: false, // Continue on duplicates
        lean: false     // Return full Mongoose documents
      });

      return createdSlots;
    } catch (error) {
      // Handle duplicate key errors gracefully
      if (error.code === 11000) {
        // Fetch existing slots if duplicates occurred
        return await this.getOrCreateDaySlots(date, duration);
      }
      throw error;
    }
  }

  /**
   * Filter slots based on availability and advance notice
   * Time Complexity: O(n) where n is number of slots
   */
  private filterAvailableSlots(slots: TimeSlot[], date: string): TimeSlot[] {
    const availableTimeSlots = DateUtil.getAvailableTimeSlotsForDate(
      date,
      this.workingHours.start,
      this.workingHours.end,
      this.slotDuration,
      this.advanceHours
    );

    // Convert to Set for O(1) lookup
    const availableTimesSet = new Set(availableTimeSlots);

    return slots.filter(slot => 
      slot.status === SlotStatus.AVAILABLE && 
      availableTimesSet.has(slot.startTime)
    );
  }

  /**
   * Get booking statistics for analytics
   * Time Complexity: O(1) - uses MongoDB aggregation
   */
  async getBookingStats(startDate: string, endDate: string): Promise<{
    totalSlots: number;
    bookedSlots: number;
    availableSlots: number;
    utilizationRate: number;
  }> {
    const stats = await this.timeSlotModel.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $group: {
          _id: null,
          totalSlots: { $sum: 1 },
          bookedSlots: {
            $sum: { $cond: [{ $eq: ['$status', SlotStatus.BOOKED] }, 1, 0] }
          },
          availableSlots: {
            $sum: { $cond: [{ $eq: ['$status', SlotStatus.AVAILABLE] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || { totalSlots: 0, bookedSlots: 0, availableSlots: 0 };
    
    return {
      ...result,
      utilizationRate: result.totalSlots > 0 ? (result.bookedSlots / result.totalSlots) * 100 : 0
    };
  }

  /**
   * Free a booked slot (used for cancellations)
   * Time Complexity: O(1)
   */
  async freeSlot(slotId: string, userId?: string): Promise<TimeSlot> {
    const filter: any = { _id: slotId, status: SlotStatus.BOOKED };
    
    // If userId provided, ensure only the user who booked can free the slot
    if (userId) {
      filter.bookedBy = userId;
    }

    const slot = await this.timeSlotModel.findOneAndUpdate(
      filter,
      { 
        $set: { 
          status: SlotStatus.AVAILABLE,
          freedAt: new Date()
        },
        $unset: { 
          bookedBy: 1, 
          bookedAt: 1, 
          metadata: 1 
        }
      },
      { new: true }
    );

    if (!slot) {
      // Check if slot exists but is not booked
      const existingSlot = await this.timeSlotModel.findById(slotId);
      if (!existingSlot) {
        throw new NotFoundException('Time slot not found');
      }
      
      if (existingSlot.status === SlotStatus.AVAILABLE) {
        return existingSlot; // Already available, no action needed
      }
      
      throw new ConflictException('Slot is not booked or you do not have permission to free it');
    }

    return slot;
  }

  /**
   * Bulk free multiple slots (for batch cancellations)
   * Time Complexity: O(n) where n is number of slots
   */
  async freeMultipleSlots(slotIds: string[], userId?: string): Promise<{
    freedSlots: string[];
    errors: Array<{ slotId: string; error: string }>;
  }> {
    const freedSlots: string[] = [];
    const errors: Array<{ slotId: string; error: string }> = [];

    // Process slots in parallel for better performance
    const results = await Promise.allSettled(
      slotIds.map(async (slotId) => {
        try {
          await this.freeSlot(slotId, userId);
          return { success: true, slotId };
        } catch (error) {
          return { success: false, slotId, error: error.message };
        }
      })
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          freedSlots.push(result.value.slotId);
        } else {
          errors.push({
            slotId: result.value.slotId,
            error: result.value.error
          });
        }
      } else {
        errors.push({
          slotId: slotIds[index],
          error: result.reason?.message || 'Unknown error'
        });
      }
    });

    return { freedSlots, errors };
  }

  /**
   * Get slot by ID with detailed information
   * Time Complexity: O(1)
   */
  async getSlotById(slotId: string): Promise<TimeSlot & {
    timeUntilSlot?: string;
    canCancel?: boolean;
    isBookable?: boolean;
  }> {
    const slot = await this.timeSlotModel.findById(slotId);
    
    if (!slot) {
      throw new NotFoundException('Time slot not found');
    }

    const slotDateTime = DateUtil.parseDateTime(
      DateUtil.formatDate(slot.date),
      slot.startTime
    );

    const timeUntilSlot = DateUtil.getTimeUntilBooking(slotDateTime);
    const canCancel = slot.status === SlotStatus.BOOKED && 
                    DateUtil.meetsAdvanceNotice(slotDateTime, 1);
    const isBookable = slot.status === SlotStatus.AVAILABLE && 
                      DateUtil.meetsAdvanceNotice(slotDateTime, this.advanceHours);

    (slot as any).timeUntilSlot = timeUntilSlot;
    (slot as any).canCancel = canCancel;
    (slot as any).isBookable = isBookable;
    return slot;
  }

  /**
   * Find available slot by date and time
   * Time Complexity: O(1) - direct query with index
   */
  async findAvailableSlot(date: string, time: string): Promise<TimeSlot | null> {
    // Validate the date and time first
    const validation = DateUtil.validateBookingDateTime(date, time, {
      advanceHours: this.advanceHours,
      startTime: this.workingHours.start,
      endTime: this.workingHours.end,
      allowWeekends: this.allowWeekends,
    });

    if (!validation.isValid) {
      throw new BadRequestException(validation.errors.join(', '));
    }

    const startOfDay = new Date(date + 'T00:00:00.000Z');
    const endOfDay = new Date(date + 'T23:59:59.999Z');

    return await this.timeSlotModel.findOne({
      date: { $gte: startOfDay, $lte: endOfDay },
      startTime: time,
      status: SlotStatus.AVAILABLE
    });
  }

  /**
   * Book slot with integrated validation (optimized for booking service)
   * Time Complexity: O(1)
   */
  async bookSlotForBooking(
    date: string, 
    time: string, 
    userId: string,
    metadata?: Record<string, any>
  ): Promise<SlotBookingResult> {
    // Find the specific slot first
    const slot = await this.findAvailableSlot(date, time);
    
    if (!slot) {
      throw new BadRequestException('Selected time slot is not available');
    }

    // Use the existing bookSlot method
    return await this.bookSlot(slot._id.toString(), userId, metadata);
  }

  /**
   * Get user's booked slots
   * Time Complexity: O(log n + k) where k is number of user's bookings
   */
  async getUserBookedSlots(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<TimeSlot[]> {
    const filter: any = { 
      bookedBy: userId, 
      status: SlotStatus.BOOKED 
    };

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    return await this.timeSlotModel
      .find(filter)
      .sort({ date: 1, startTime: 1 });
  }

  /**
   * Check slot availability without creating slots
   * Time Complexity: O(1)
   */
  async isSlotAvailable(date: string, time: string): Promise<boolean> {
    try {
      // Validate business rules first
      const validation = DateUtil.validateBookingDateTime(date, time, {
        advanceHours: this.advanceHours,
        startTime: this.workingHours.start,
        endTime: this.workingHours.end,
        allowWeekends: this.allowWeekends,
      });

      if (!validation.isValid) {
        return false;
      }

      const slot = await this.findAvailableSlot(date, time);
      return slot !== null;
    } catch {
      return false;
    }
  }

  /**
   * Reschedule a booked slot to a new time
   * Time Complexity: O(1) - two atomic operations
   */
  async rescheduleSlot(
    currentSlotId: string,
    newDate: string,
    newTime: string,
    userId?: string
  ): Promise<{
    oldSlot: TimeSlot;
    newSlot: TimeSlot;
    timeUntilNewBooking: string;
  }> {
    // Validate new slot availability
    const newSlot = await this.findAvailableSlot(newDate, newTime);
    if (!newSlot) {
      throw new BadRequestException('New time slot is not available');
    }

    // Get current slot info before freeing
    const currentSlot = await this.getSlotById(currentSlotId);
    
    if (userId && (currentSlot as any).bookedBy !== userId) {
      throw new BadRequestException('You can only reschedule your own bookings');
    }

    // Free the current slot and book the new one atomically
    const [freedSlot, bookedResult] = await Promise.all([
      this.freeSlot(currentSlotId, userId),
      this.bookSlot(newSlot._id.toString(), userId, (currentSlot as any).metadata)
    ]);

    return {
      oldSlot: freedSlot,
      newSlot: bookedResult.slot,
      timeUntilNewBooking: bookedResult.timeUntilBooking
    };
  }

  /**
   * Clean up old slots (maintenance operation)
   * Should be run as a scheduled job
   */
  async cleanupOldSlots(daysOld: number = 30): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.timeSlotModel.deleteMany({
      date: { $lt: cutoffDate }
    });

    return { deletedCount: result.deletedCount || 0 };
  }
}