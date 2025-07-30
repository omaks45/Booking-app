/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum SlotStatus {
    AVAILABLE = 'available',
    BOOKED = 'booked',
    BLOCKED = 'blocked'
}

@Schema({ timestamps: true })
export class TimeSlot extends Document {
    @Prop({ required: true })
    date: Date;

    @Prop({ required: true })
    startTime: string; // Format: "HH:mm"

    @Prop({ required: true })
    endTime: string; // Format: "HH:mm"

    @Prop({ 
        type: String, 
        enum: SlotStatus, 
        default: SlotStatus.AVAILABLE 
    })
    status: SlotStatus;

    @Prop({ default: 60 }) // Duration in minutes
    duration: number;

    @Prop({ default: true })
    isActive: boolean;
}

export const TimeSlotSchema = SchemaFactory.createForClass(TimeSlot);