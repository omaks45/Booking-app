/* eslint-disable prettier/prettier */
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
    @ApiProperty({ 
        description: 'Whether the user account is active',
        example: true,
        required: false
    })
    @IsOptional()
    @IsBoolean({ message: 'isActive must be a boolean value' })
    isActive?: boolean;
}