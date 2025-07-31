/* eslint-disable prettier/prettier */
import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsDateString, IsMongoId, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateBookingDto {
    @ApiProperty({ description: 'User ID' })
    @IsNotEmpty()
    @IsMongoId()
    userId: string;

    @ApiProperty({ description: 'Selected date', example: '2025-07-31' })
    @IsNotEmpty()
    @IsDateString()
    @Transform(({ value }) => {
        // Normalize date format
        const date = new Date(value);
        return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
    })
    date: string;

    @ApiProperty({ description: 'Selected time', example: '15:00' })
    @IsNotEmpty()
    @IsString()
    @Transform(({ value }) => value?.trim())
    time: string;

    @ApiProperty({ description: 'Additional notes', required: false })
    @IsOptional()
    @IsString()
    notes?: string;
}