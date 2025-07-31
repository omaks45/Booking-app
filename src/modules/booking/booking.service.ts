/* eslint-disable prettier/prettier */
import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Booking, BookingStatus } from './schemas/booking.schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { TimeSlotService } from '../time-slot/time-slot.service';
import { UserService } from '../users/users.service';
import { DateUtil } from '../../common/utils/date.utils';

export interface BookingResult extends Booking {
  timeUntilBooking?: string;
  canCancel?: boolean;
  slot?: any;
}

export interface CancelBookingResult {
  booking: Booking;
  freedSlot: boolean;
  message: string;
}

export interface RescheduleBookingResult {
  booking: Booking;
  oldSlotFreed: boolean;
  newSlotBooked: boolean;
  timeUntilNewBooking: string;
}

@Injectable()
export class BookingService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    private timeSlotService: TimeSlotService,
    private userService: UserService,
  ) {}

  /**
   * Create a new booking with comprehensive validation
   * Time Complexity: O(1) - direct operations
   */
  async createBooking(createBookingDto: CreateBookingDto): Promise<Partial<BookingResult>> {
    const { userId, date, time, notes } = createBookingDto;

    try {
      // Validate user exists (parallel with slot validation)
      const [user, isSlotAvailable] = await Promise.all([
        this.userService.findById(userId),
        this.timeSlotService.isSlotAvailable(date, time)
      ]);

      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (!isSlotAvailable) {
        throw new BadRequestException('Selected time slot is not available or does not meet booking requirements');
      }

      // Check if user already has a booking for this date/time
      const existingBooking = await this.bookingModel.findOne({
        userId,
        bookingDate: new Date(date),
        bookingTime: time,
        status: { $ne: BookingStatus.CANCELLED }
      });

      if (existingBooking) {
        throw new ConflictException('You already have a booking for this time slot');
      }

      // Book the slot using the optimized method
      const slotBookingResult = await this.timeSlotService.bookSlotForBooking(
        date, 
        time, 
        userId,
        { 
          purpose: 'consultation',
          notes: notes || '',
          bookedVia: 'booking-service'
        }
      );

      // Create booking record
      const booking = new this.bookingModel({
        userId,
        timeSlotId: slotBookingResult.slot._id,
        bookingDate: new Date(date),
        bookingTime: time,
        status: BookingStatus.CONFIRMED, // Start as confirmed since slot is successfully booked
        notes,
        bookedAt: new Date()
      });

      const savedBooking = await booking.save();

      return {
        ...savedBooking.toObject(),
        timeUntilBooking: slotBookingResult.timeUntilBooking,
        canCancel: slotBookingResult.canCancel,
        slot: slotBookingResult.slot
      };

    } catch (error) {
      // If anything fails, ensure we don't leave orphaned data
      if (error instanceof BadRequestException || 
          error instanceof ConflictException || 
          error instanceof NotFoundException) {
        throw error;
      }
      
      // Log unexpected errors for monitoring
      console.error('Unexpected error in createBooking:', error);
      throw new BadRequestException('Unable to create booking. Please try again.');
    }
  }

  /**
   * Get user bookings with enhanced information
   * Time Complexity: O(log n + k) where k is user's booking count
   */
  async getUserBookings(
    userId: string, 
    includeHistory: boolean = false,
    startDate?: string,
    endDate?: string
  ): Promise<Partial<BookingResult>[]> {
    const filter: any = { userId };
    
    if (!includeHistory) {
      filter.status = { $ne: BookingStatus.CANCELLED };
    }

    if (startDate || endDate) {
      filter.bookingDate = {};
      if (startDate) filter.bookingDate.$gte = new Date(startDate);
      if (endDate) filter.bookingDate.$lte = new Date(endDate);
    }

    const bookings = await this.bookingModel
      .find(filter)
      .populate('timeSlotId')
      .sort({ bookingDate: 1, bookingTime: 1 });

    // Enhance bookings with real-time information
    return await Promise.all(
      bookings.map(async (booking) => {
        const bookingDate = DateUtil.formatDate(booking.bookingDate);
        const bookingDateTime = DateUtil.parseDateTime(bookingDate, booking.bookingTime);
        
        const timeUntilBooking = DateUtil.getTimeUntilBooking(bookingDateTime);
        const canCancel = booking.status === BookingStatus.CONFIRMED && 
                         DateUtil.meetsAdvanceNotice(bookingDateTime, 1); // 1 hour cancellation window

        return {
          ...booking.toObject(),
          timeUntilBooking,
          canCancel
        } as Partial<BookingResult>;
      })
    );
  }

  /**
   * Cancel booking with optimized slot freeing
   * Time Complexity: O(1)
   */
  async cancelBooking(
    bookingId: string, 
    userId?: string,
    reason?: string
  ): Promise<CancelBookingResult> {
    const booking = await this.bookingModel.findById(bookingId);
    
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Verify user authorization if userId provided
    if (userId && booking.userId.toString() !== userId) {
      throw new BadRequestException('You can only cancel your own bookings');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      return {
        booking,
        freedSlot: false,
        message: 'Booking was already cancelled'
      };
    }

    // Check if cancellation is allowed (1 hour before appointment)
    const bookingDate = DateUtil.formatDate(booking.bookingDate);
    const bookingDateTime = DateUtil.parseDateTime(bookingDate, booking.bookingTime);
    
    if (!DateUtil.meetsAdvanceNotice(bookingDateTime, 1)) {
      throw new BadRequestException('Cannot cancel booking less than 1 hour before appointment');
    }

    try {
      // Update booking status and free slot atomically
      const [updatedBooking] = await Promise.all([
        this.bookingModel.findByIdAndUpdate(
          bookingId,
          {
            $set: {
              status: BookingStatus.CANCELLED,
              cancelledAt: new Date(),
              cancelReason: reason || 'User requested cancellation'
            }
          },
          { new: true }
        ),
        this.timeSlotService.freeSlot(booking.timeSlotId.toString(), userId)
      ]);

      return {
        booking: updatedBooking!,
        freedSlot: true,
        message: 'Booking cancelled successfully'
      };

    } catch (error) {
      // If slot freeing fails, rollback booking cancellation
      console.error('Error during booking cancellation:', error);
      throw new BadRequestException('Unable to cancel booking. Please try again.');
    }
  }

  /**
   * Reschedule a booking to a new date/time
   * Time Complexity: O(1)
   */
  async rescheduleBooking(
    bookingId: string,
    newDate: string,
    newTime: string,
    userId?: string,
    reason?: string
  ): Promise<RescheduleBookingResult> {
    const booking = await this.bookingModel.findById(bookingId);
    
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (userId && booking.userId.toString() !== userId) {
      throw new BadRequestException('You can only reschedule your own bookings');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Cannot reschedule a cancelled booking');
    }

    // Validate new date/time
    const validation = DateUtil.validateBookingDateTime(newDate, newTime, {
      advanceHours: 3, // Use standard advance hours
      allowWeekends: false,
    });

    if (!validation.isValid) {
      throw new BadRequestException(`Invalid new booking time: ${validation.errors.join(', ')}`);
    }

    try {
      // Reschedule the slot
      const rescheduleResult = await this.timeSlotService.rescheduleSlot(
        booking.timeSlotId.toString(),
        newDate,
        newTime,
        userId
      );

      // Update booking record
      const updatedBooking = await this.bookingModel.findByIdAndUpdate(
        bookingId,
        {
          $set: {
            timeSlotId: rescheduleResult.newSlot._id,
            bookingDate: new Date(newDate),
            bookingTime: newTime,
            rescheduledAt: new Date(),
            rescheduleReason: reason || 'User requested reschedule'
          },
          $inc: { rescheduleCount: 1 }
        },
        { new: true }
      );

      return {
        booking: updatedBooking!,
        oldSlotFreed: true,
        newSlotBooked: true,
        timeUntilNewBooking: rescheduleResult.timeUntilNewBooking
      };

    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      
      console.error('Error during booking reschedule:', error);
      throw new BadRequestException('Unable to reschedule booking. Please try again.');
    }
  }

  /**
   * Get booking by ID with detailed information
   * Time Complexity: O(1)
   */
  async getBookingById(bookingId: string, userId?: string): Promise<BookingResult> {
    const booking = await this.bookingModel
      .findById(bookingId)
      .populate('timeSlotId');

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (userId && booking.userId.toString() !== userId) {
      throw new BadRequestException('You can only view your own bookings');
    }

    const bookingDate = DateUtil.formatDate(booking.bookingDate);
    const bookingDateTime = DateUtil.parseDateTime(bookingDate, booking.bookingTime);
    
    const timeUntilBooking = DateUtil.getTimeUntilBooking(bookingDateTime);
    const canCancel = booking.status === BookingStatus.CONFIRMED && 
                    DateUtil.meetsAdvanceNotice(bookingDateTime, 1);

    return {
      ...booking.toObject(),
      timeUntilBooking,
      canCancel
    } as unknown as BookingResult;
  }

  /**
   * Get booking statistics for analytics
   * Time Complexity: O(1) - MongoDB aggregation
   */
  async getBookingStats(
    startDate: string,
    endDate: string,
    userId?: string
  ): Promise<{
    totalBookings: number;
    confirmedBookings: number;
    cancelledBookings: number;
    cancellationRate: number;
    avgReschedules: number;
  }> {
    const matchFilter: any = {
      bookingDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    if (userId) {
      matchFilter.userId = userId;
    }

    const stats = await this.bookingModel.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          confirmedBookings: {
            $sum: { $cond: [{ $eq: ['$status', BookingStatus.CONFIRMED] }, 1, 0] }
          },
          cancelledBookings: {
            $sum: { $cond: [{ $eq: ['$status', BookingStatus.CANCELLED] }, 1, 0] }
          },
          totalReschedules: { $sum: { $ifNull: ['$rescheduleCount', 0] } }
        }
      }
    ]);

    const result = stats[0] || { 
      totalBookings: 0, 
      confirmedBookings: 0, 
      cancelledBookings: 0, 
      totalReschedules: 0 
    };
    
    return {
      ...result,
      cancellationRate: result.totalBookings > 0 ? 
        (result.cancelledBookings / result.totalBookings) * 100 : 0,
      avgReschedules: result.totalBookings > 0 ? 
        result.totalReschedules / result.totalBookings : 0
    };
  }

  /**
   * Clean up old cancelled bookings
   * Time Complexity: O(1) - single delete operation
   */
  async cleanupOldBookings(daysOld: number = 90): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.bookingModel.deleteMany({
      status: BookingStatus.CANCELLED,
      cancelledAt: { $lt: cutoffDate }
    });

    return { deletedCount: result.deletedCount || 0 };
  }
}