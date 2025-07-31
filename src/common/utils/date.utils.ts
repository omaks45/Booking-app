/* eslint-disable prettier/prettier */

import { BadRequestException } from '@nestjs/common';

export class DateUtil {
    /**
     * Get current date and time
     */
    static now(): Date {
        return new Date();
    }

    /**
     * Get current date string in YYYY-MM-DD format
     */
    static today(): string {
        return this.formatDate(new Date());
    }

    /**
     * Format date to YYYY-MM-DD string
     */
    static formatDate(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    /**
     * Format time to HH:mm string
     */
    static formatTime(date: Date): string {
        return date.toTimeString().slice(0, 5);
    }

    /**
     * Format datetime to readable string
     */
    static formatDateTime(date: Date): string {
        return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        });
    }

    /**
     * Parse date string (YYYY-MM-DD) to Date object
     */
    static parseDate(dateString: string): Date {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
        throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
        }
        return date;
    }

    /**
     * Parse time string (HH:mm) and combine with date
     */
    static parseDateTime(dateString: string, timeString: string): Date {
        const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timePattern.test(timeString)) {
        throw new BadRequestException('Invalid time format. Use HH:mm (24-hour format)');
        }

        const date = this.parseDate(dateString);
        const [hours, minutes] = timeString.split(':').map(Number);
        
        date.setHours(hours, minutes, 0, 0);
        return date;
    }

    /**
     * Check if a date is in the past
     */
    static isPastDate(date: Date): boolean {
        return date < new Date();
    }

    /**
     * Check if a date string is in the past
     */
    static isPastDateString(dateString: string): boolean {
        const date = this.parseDate(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);
        return date < today;
    }

    /**
     * Check if booking meets minimum advance notice requirement
     */
    static meetsAdvanceNotice(
        bookingDateTime: Date, 
        minimumHours: number = 3
    ): boolean {
        const now = new Date();
        const minimumDateTime = new Date(now.getTime() + minimumHours * 60 * 60 * 1000);
        return bookingDateTime >= minimumDateTime;
    }

    /**
     * Check if booking date/time meets advance notice using strings
     */
    static meetsAdvanceNoticeString(
        dateString: string, 
        timeString: string, 
        minimumHours: number = 3
    ): boolean {
        const bookingDateTime = this.parseDateTime(dateString, timeString);
        return this.meetsAdvanceNotice(bookingDateTime, minimumHours);
    }

    /**
     * Get the minimum booking datetime (current time + advance hours)
     */
    static getMinimumBookingTime(advanceHours: number = 3): Date {
        const now = new Date();
        return new Date(now.getTime() + advanceHours * 60 * 60 * 1000);
    }

    /**
     * Check if a time is within working hours
     */
    static isWithinWorkingHours(
        timeString: string, 
        startTime: string = '09:00', 
        endTime: string = '17:00'
    ): boolean {
        const time = this.timeToMinutes(timeString);
        const start = this.timeToMinutes(startTime);
        const end = this.timeToMinutes(endTime);
        
        return time >= start && time < end;
    }

    /**
     * Convert time string to minutes since midnight
     */
    static timeToMinutes(timeString: string): number {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    }

    /**
     * Convert minutes since midnight to time string
     */
    static minutesToTime(minutes: number): string {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    /**
     * Generate time slots for a given day
     */
    static generateTimeSlots(
        startTime: string = '09:00',
        endTime: string = '17:00',
        slotDuration: number = 60
    ): string[] {
        const slots: string[] = [];
        const startMinutes = this.timeToMinutes(startTime);
        const endMinutes = this.timeToMinutes(endTime);

        for (let minutes = startMinutes; minutes < endMinutes; minutes += slotDuration) {
        slots.push(this.minutesToTime(minutes));
        }

        return slots;
    }

    /**
     * Get available time slots for a specific date considering advance notice
     */
    static getAvailableTimeSlotsForDate(
        dateString: string,
        startTime: string = '09:00',
        endTime: string = '17:00',
        slotDuration: number = 60,
        advanceHours: number = 3
    ): string[] {
        // Check if date is in the past
        if (this.isPastDateString(dateString)) {
        return [];
        }

        const allSlots = this.generateTimeSlots(startTime, endTime, slotDuration);
        const isToday = dateString === this.today();

        if (!isToday) {
        return allSlots;
        }

        // Filter slots for today based on advance notice
        const minimumTime = this.getMinimumBookingTime(advanceHours);
        const minimumTimeString = this.formatTime(minimumTime);

        return allSlots.filter(slot => {
        return this.timeToMinutes(slot) >= this.timeToMinutes(minimumTimeString);
        });
    }

    /**
     * Check if a date is a weekend
     */
    static isWeekend(date: Date): boolean {
        const day = date.getDay();
        return day === 0 || day === 6; // Sunday = 0, Saturday = 6
    }

    /**
     * Check if a date string represents a weekend
     */
    static isWeekendString(dateString: string): boolean {
        const date = this.parseDate(dateString);
        return this.isWeekend(date);
    }

    /**
     * Get next business day (skip weekends)
     */
    static getNextBusinessDay(date: Date = new Date()): Date {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        
        while (this.isWeekend(nextDay)) {
        nextDay.setDate(nextDay.getDate() + 1);
        }
        
        return nextDay;
    }

    /**
     * Add business days to a date (skip weekends)
     */
    static addBusinessDays(date: Date, days: number): Date {
        const result = new Date(date);
        let addedDays = 0;

        while (addedDays < days) {
        result.setDate(result.getDate() + 1);
        if (!this.isWeekend(result)) {
            addedDays++;
        }
        }

        return result;
    }

    /**
     * Get date range for a given number of days from today
     */
    static getDateRange(days: number, startDate: Date = new Date()): string[] {
        const dates: string[] = [];
        const currentDate = new Date(startDate);
        
        for (let i = 0; i < days; i++) {
        dates.push(this.formatDate(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return dates;
    }

    /**
     * Get business date range (excluding weekends)
     */
    static getBusinessDateRange(days: number, startDate: Date = new Date()): string[] {
        const dates: string[] = [];
        const currentDate = new Date(startDate);
        let addedDays = 0;
        
        while (addedDays < days) {
        if (!this.isWeekend(currentDate)) {
            dates.push(this.formatDate(currentDate));
            addedDays++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return dates;
    }

    /**
     * Calculate duration between two times in minutes
     */
    static getTimeDurationMinutes(startTime: string, endTime: string): number {
        const start = this.timeToMinutes(startTime);
        const end = this.timeToMinutes(endTime);
        return end - start;
    }

    /**
     * Add minutes to a time string
     */
    static addMinutesToTime(timeString: string, minutes: number): string {
        const totalMinutes = this.timeToMinutes(timeString) + minutes;
        return this.minutesToTime(totalMinutes);
    }

    /**
     * Validate date and time combination for booking
     */
    static validateBookingDateTime(
        dateString: string,
        timeString: string,
        config: {
        advanceHours?: number;
        startTime?: string;
        endTime?: string;
        allowWeekends?: boolean;
        } = {}
    ): { isValid: boolean; errors: string[] } {
        const {
        advanceHours = 3,
        startTime = '09:00',
        endTime = '17:00',
        allowWeekends = false,
        } = config;

        const errors: string[] = [];

        try {
        // Validate date format
        this.parseDate(dateString);

        // Check if date is in the past
        if (this.isPastDateString(dateString)) {
            errors.push('Cannot book appointments for past dates');
        }

        // Check if weekend (if not allowed)
        if (!allowWeekends && this.isWeekendString(dateString)) {
            errors.push('Weekend bookings are not allowed');
        }

        // Validate time format and working hours
        if (!this.isWithinWorkingHours(timeString, startTime, endTime)) {
            errors.push(`Time must be between ${startTime} and ${endTime}`);
        }

        // Check advance notice
        if (!this.meetsAdvanceNoticeString(dateString, timeString, advanceHours)) {
            errors.push(`Bookings must be made at least ${advanceHours} hours in advance`);
        }

        } catch (error) {
        errors.push(error.message);
        }

        return {
        isValid: errors.length === 0,
        errors,
        };
    }

    /**
     * Get time zone offset in hours
     */
    static getTimezoneOffset(): number {
        return new Date().getTimezoneOffset() / -60;
    }

    /**
     * Convert UTC date to local timezone
     */
    static utcToLocal(utcDate: Date): Date {
        return new Date(utcDate.getTime() - (utcDate.getTimezoneOffset() * 60000));
    }

    /**
     * Convert local date to UTC
     */
    static localToUtc(localDate: Date): Date {
        return new Date(localDate.getTime() + (localDate.getTimezoneOffset() * 60000));
    }

    /**
     * Get human-readable time until a booking
     */
    static getTimeUntilBooking(bookingDateTime: Date): string {
        const now = new Date();
        const diffMs = bookingDateTime.getTime() - now.getTime();
        
        if (diffMs <= 0) {
        return 'Booking time has passed';
        }

        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} and ${diffHours % 24} hour${diffHours % 24 !== 1 ? 's' : ''}`;
        } else if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} and ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
        } else {
        return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
        }
    }
}