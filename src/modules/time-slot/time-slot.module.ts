/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { TimeSlotService } from './time-slot.service';
import { TimeSlotController } from './time-slot.controller';
import { TimeSlot, TimeSlotSchema } from './schemas/time-slot.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TimeSlot.name, schema: TimeSlotSchema }
    ]),
    // Import ConfigModule since TimeSlotService uses ConfigService
    ConfigModule,
  ],
  controllers: [TimeSlotController],
  providers: [TimeSlotService],
  exports: [TimeSlotService], // Export so other modules can use it
})
export class TimeSlotModule {}