/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { 
  IsNotEmpty, 
  IsString, 
  IsEmail, 
  MinLength, 
  MaxLength,
  Matches,
  //IsPhoneNumber,
  //IsOptional 
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
    @ApiProperty({ 
        description: 'Full name of the user',
        example: 'John Doe',
        minLength: 2,
        maxLength: 100
    })
    @IsNotEmpty({ message: 'Name is required' })
    @IsString({ message: 'Name must be a string' })
    @MinLength(2, { message: 'Name must be at least 2 characters long' })
    @MaxLength(100, { message: 'Name must not exceed 100 characters' })
    @Transform(({ value }) => value?.trim())
    @Matches(/^[a-zA-Z\s'-]+$/, { 
        message: 'Name can only contain letters, spaces, hyphens, and apostrophes' 
    })
    name: string;

    @ApiProperty({ 
        description: 'Email address of the user',
        example: 'john.doe@example.com'
    })
    @IsNotEmpty({ message: 'Email is required' })
    @IsEmail({}, { message: 'Please provide a valid email address' })
    @MaxLength(255, { message: 'Email must not exceed 255 characters' })
    @Transform(({ value }) => value?.toLowerCase().trim())
    email: string;

    @ApiProperty({ 
        description: 'Company name',
        example: 'Tech Solutions Inc.',
        maxLength: 200
    })
    @IsNotEmpty({ message: 'Company name is required' })
    @IsString({ message: 'Company name must be a string' })
    @MaxLength(200, { message: 'Company name must not exceed 200 characters' })
    @Transform(({ value }) => value?.trim())
    companyName: string;

    @ApiProperty({ 
        description: 'Phone number with country code',
        example: '+1234567890'
    })
    @IsNotEmpty({ message: 'Phone number is required' })
    @IsString({ message: 'Phone number must be a string' })
    @Matches(/^[\+]?[1-9][\d]{0,15}$/, { 
        message: 'Please provide a valid phone number' 
    })
    phoneNumber: string;

    @ApiProperty({ 
        description: 'Brief summary of the project or consultation needs',
        example: 'Need consultation for implementing a new booking system for our healthcare facility.',
        minLength: 10,
        maxLength: 1000
    })
    @IsNotEmpty({ message: 'Project summary is required' })
    @IsString({ message: 'Project summary must be a string' })
    @MinLength(10, { message: 'Project summary must be at least 10 characters long' })
    @MaxLength(1000, { message: 'Project summary must not exceed 1000 characters' })
    @Transform(({ value }) => value?.trim())
    projectSummary: string;
}
