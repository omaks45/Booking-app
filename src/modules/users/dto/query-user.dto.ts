/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class QueryUserDto {
    @ApiProperty({ 
        description: 'Search term for name, email, or company',
        required: false,
        example: 'john'
    })
    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    search?: string;

    @ApiProperty({ 
        description: 'Filter by active status',
        required: false,
        example: true
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean()
    isActive?: boolean;

    @ApiProperty({ 
        description: 'Page number for pagination',
        required: false,
        default: 1,
        minimum: 1
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: 'Page must be a number' })
    @Min(1, { message: 'Page must be at least 1' })
    page?: number = 1;

    @ApiProperty({ 
        description: 'Number of items per page',
        required: false,
        default: 10,
        minimum: 1,
        maximum: 100
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber({}, { message: 'Limit must be a number' })
    @Min(1, { message: 'Limit must be at least 1' })
    @Max(100, { message: 'Limit must not exceed 100' })
    limit?: number = 10;

    @ApiProperty({ 
        description: 'Sort field',
        required: false,
        enum: ['name', 'email', 'companyName', 'createdAt', 'updatedAt'],
        default: 'createdAt'
    })
    @IsOptional()
    @IsString()
    sortBy?: string = 'createdAt';

    @ApiProperty({ 
        description: 'Sort order',
        required: false,
        enum: ['asc', 'desc'],
        default: 'desc'
    })
    @IsOptional()
    @IsString()
    sortOrder?: 'asc' | 'desc' = 'desc';
}