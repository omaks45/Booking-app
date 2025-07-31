/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';

export class UserResponseDto {
    @ApiProperty({ description: 'User ID' })
    @Expose()
    @Transform(({ obj }) => obj._id.toString())
    id: string;

    @ApiProperty({ description: 'Full name' })
    @Expose()
    name: string;

    @ApiProperty({ description: 'Email address' })
    @Expose()
    email: string;

    @ApiProperty({ description: 'Company name' })
    @Expose()
    companyName: string;

    @ApiProperty({ description: 'Phone number' })
    @Expose()
    phoneNumber: string;

    @ApiProperty({ description: 'Project summary' })
    @Expose()
    projectSummary: string;

    @ApiProperty({ description: 'Account status' })
    @Expose()
    isActive: boolean;

    @ApiProperty({ description: 'Account created date' })
    @Expose()
    createdAt: Date;

    @ApiProperty({ description: 'Last updated date' })
    @Expose()
    updatedAt: Date;

    constructor(partial: Partial<UserResponseDto>) {
        Object.assign(this, partial);
    }
}

export class UserListResponseDto {
    @ApiProperty({ type: [UserResponseDto] })
    users: UserResponseDto[];

    @ApiProperty({ description: 'Total number of users' })
    total: number;

    @ApiProperty({ description: 'Current page number' })
    page: number;

    @ApiProperty({ description: 'Number of items per page' })
    limit: number;

    @ApiProperty({ description: 'Total number of pages' })
    totalPages: number;

    constructor(partial: Partial<UserListResponseDto>) {
        Object.assign(this, partial);
    }
}