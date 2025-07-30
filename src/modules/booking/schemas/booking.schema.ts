/* eslint-disable prettier/prettier */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed'
}

@Schema({ timestamps: true })
export class Booking extends Document {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'TimeSlot', required: true })
    timeSlotId: Types.ObjectId;

    @Prop({ required: true })
    bookingDate: Date;

    @Prop({ required: true })
    bookingTime: string;

    @Prop({ 
        type: String, 
        enum: BookingStatus, 
        default: BookingStatus.PENDING 
    })
    status: BookingStatus;

    @Prop()
    notes?: string;

    @Prop()
    cancelledAt?: Date;

    @Prop()
    cancelReason?: string;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);