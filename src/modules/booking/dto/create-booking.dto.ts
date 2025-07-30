/* eslint-disable prettier/prettier */

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsDateString, IsOptional, IsMongoId } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateBookingDto {
    @ApiProperty({ description: 'User ID' })
    @IsNotEmpty()
    @IsMongoId()
    userId: string;

    @ApiProperty({ description: 'Selected date', example: '2024-08-01' })
    @IsNotEmpty()
    @IsDateString()
    date: string;

    @ApiProperty({ description: 'Selected time', example: '14:30' })
    @IsNotEmpty()
    @IsString()
    time: string;

    @ApiProperty({ description: 'Additional notes', required: false })
    @IsOptional()
    @IsString()
    notes?: string;
}

export class CreateUserDto {
    @ApiProperty({ description: 'Full name' })
    @IsNotEmpty()
    @IsString()
    @Transform(({ value }) => value?.trim())
    name: string;

    @ApiProperty({ description: 'Email address' })
    @IsNotEmpty()
    @IsString()
    email: string;

    @ApiProperty({ description: 'Company name' })
    @IsNotEmpty()
    @IsString()
    @Transform(({ value }) => value?.trim())
    companyName: string;

    @ApiProperty({ description: 'Phone number' })
    @IsNotEmpty()
    @IsString()
    phoneNumber: string;

    @ApiProperty({ description: 'Project summary' })
    @IsNotEmpty()
    @IsString()
    projectSummary: string;
}