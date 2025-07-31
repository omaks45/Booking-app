/* eslint-disable prettier/prettier */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SlotStatus } from '../schemas/time-slot.schema';

export class TimeSlotResponseDto {
    @ApiProperty({ description: 'Unique identifier of the time slot' })
    _id: string;

    @ApiProperty({ description: 'Date of the time slot', type: 'string', format: 'date-time' })
    date: Date;

    @ApiProperty({ description: 'Start time of the slot', example: '09:00' })
    startTime: string;

    @ApiProperty({ description: 'End time of the slot', example: '10:00' })
    endTime: string;

    @ApiProperty({ description: 'Current status of the slot', enum: SlotStatus })
    status: SlotStatus;

    @ApiProperty({ description: 'Duration of the slot in minutes', example: 60 })
    duration: number;

    @ApiPropertyOptional({ description: 'User who booked the slot' })
    bookedBy?: string;

    @ApiPropertyOptional({ description: 'When the slot was booked', type: 'string', format: 'date-time' })
    bookedAt?: Date;

    @ApiPropertyOptional({ description: 'When the slot was freed', type: 'string', format: 'date-time' })
    freedAt?: Date;

    @ApiPropertyOptional({ description: 'Additional metadata for the slot' })
    metadata?: Record<string, any>;

    @ApiProperty({ description: 'When the slot was created', type: 'string', format: 'date-time' })
    createdAt: Date;

    @ApiPropertyOptional({ description: 'Time remaining until the slot', example: '1 hour 45 minutes' })
    timeUntilSlot?: string;

    @ApiPropertyOptional({ description: 'Whether the slot can be cancelled' })
    canCancel?: boolean;

    @ApiPropertyOptional({ description: 'Whether the slot is available for booking' })
    isBookable?: boolean;
}