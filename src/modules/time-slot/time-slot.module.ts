import { Module } from '@nestjs/common';
import { TimeSlotService } from './time-slot.service';
import { TimeSlotController } from './time-slot.controller';

@Module({
  controllers: [TimeSlotController],
  providers: [TimeSlotService],
})
export class TimeSlotModule {}
