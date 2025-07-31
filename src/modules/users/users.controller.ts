/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  //ApiQuery,
} from '@nestjs/swagger';
import { UserService } from '../users/users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto, UserListResponseDto } from './dto/user-response.dto';
import { QueryUserDto } from './dto/query-user.dto';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a new user',
    description: 'Creates a new user account with the provided information. Email must be unique.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'User created successfully',
    type: UserResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad Request - Invalid input data' 
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Conflict - Email already exists' 
  })
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    return this.userService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all users with filtering and pagination',
    description: 'Retrieves a paginated list of users with optional filtering by search term and active status.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Users retrieved successfully',
    type: UserListResponseDto
  })
  async findAll(@Query() queryDto: QueryUserDto): Promise<UserListResponseDto> {
    return this.userService.findAll(queryDto);
  }

  @Get('stats')
  @ApiOperation({ 
    summary: 'Get user statistics',
    description: 'Retrieves user statistics including total, active, inactive, and recent signups.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User statistics retrieved successfully'
  })
  async getStats() {
    return this.userService.getStats();
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get user by ID',
    description: 'Retrieves a specific user by their unique identifier.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'User ID',
    example: '64f8b2a1e8b9c123456789ab'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User retrieved successfully',
    type: UserResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad Request - Invalid ID format' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User not found' 
  })
  async findById(@Param('id') id: string): Promise<UserResponseDto> {
    return this.userService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Update user information',
    description: 'Updates user information. All fields are optional.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'User ID',
    example: '64f8b2a1e8b9c123456789ab'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User updated successfully',
    type: UserResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad Request - Invalid input data or ID format' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User not found' 
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Conflict - Email already exists' 
  })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.userService.update(id, updateUserDto);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ 
    summary: 'Deactivate user account',
    description: 'Sets the user account status to inactive.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'User ID',
    example: '64f8b2a1e8b9c123456789ab'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User deactivated successfully',
    type: UserResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad Request - Invalid ID format' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User not found' 
  })
  async deactivate(@Param('id') id: string): Promise<UserResponseDto> {
    return this.userService.deactivate(id);
  }

  @Patch(':id/activate')
  @ApiOperation({ 
    summary: 'Activate user account',
    description: 'Sets the user account status to active.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'User ID',
    example: '64f8b2a1e8b9c123456789ab'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User activated successfully',
    type: UserResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad Request - Invalid ID format' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User not found' 
  })
  async activate(@Param('id') id: string): Promise<UserResponseDto> {
    return this.userService.activate(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: 'Delete user account',
    description: 'Permanently deletes a user account. This action cannot be undone.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'User ID',
    example: '64f8b2a1e8b9c123456789ab'
  })
  @ApiResponse({ 
    status: 204, 
    description: 'User deleted successfully' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad Request - Invalid ID format' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User not found' 
  })
  async remove(@Param('id') id: string): Promise<void> {
    return this.userService.remove(id);
  }
}