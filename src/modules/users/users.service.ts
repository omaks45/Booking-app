/* eslint-disable prettier/prettier */
import { 
  Injectable, 
  ConflictException, 
  NotFoundException, 
  BadRequestException,
  Logger 
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto, UserListResponseDto } from './dto/user-response.dto';
import { QueryUserDto } from './dto/query-user.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    try {
      // Check if user with email already exists
      const existingUser = await this.userModel.findOne({ 
        email: createUserDto.email.toLowerCase() 
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      const user = new this.userModel({
        ...createUserDto,
        email: createUserDto.email.toLowerCase(),
      });

      const savedUser = await user.save();
      this.logger.log(`User created successfully: ${savedUser.email}`);

      return new UserResponseDto({
        id: savedUser._id.toString(),
        name: savedUser.name,
        email: savedUser.email,
        companyName: savedUser.companyName,
        phoneNumber: savedUser.phoneNumber,
        projectSummary: savedUser.projectSummary,
        isActive: savedUser.isActive,
        createdAt: savedUser.createdAt,
        updatedAt: savedUser.updatedAt,
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      
      if (error.code === 11000) {
        throw new ConflictException('User with this email already exists');
      }
      
      this.logger.error(`Error creating user: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to create user');
    }
  }

  async findAll(queryDto: QueryUserDto): Promise<UserListResponseDto> {
    try {
      const { 
        search, 
        isActive, 
        page = 1, 
        limit = 10, 
        sortBy = 'createdAt', 
        sortOrder = 'desc' 
      } = queryDto;

      // Build filter query
      const filter: any = {};

      if (isActive !== undefined) {
        filter.isActive = isActive;
      }

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { companyName: { $regex: search, $options: 'i' } },
        ];
      }

      // Build sort object
      const sort: any = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Execute queries
      const [users, total] = await Promise.all([
        this.userModel
          .find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .exec(),
        this.userModel.countDocuments(filter),
      ]);

      const userResponses = users.map(user => new UserResponseDto({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        companyName: user.companyName,
        phoneNumber: user.phoneNumber,
        projectSummary: user.projectSummary,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));

      return new UserListResponseDto({
        users: userResponses,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      this.logger.error(`Error fetching users: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to fetch users');
    }
  }

  async findById(id: string): Promise<UserResponseDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID format');
    }

    try {
      const user = await this.userModel.findById(id);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return new UserResponseDto({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        companyName: user.companyName,
        phoneNumber: user.phoneNumber,
        projectSummary: user.projectSummary,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      
      this.logger.error(`Error fetching user by ID: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to fetch user');
    }
  }

  async findByEmail(email: string): Promise<UserResponseDto | null> {
    try {
      const user = await this.userModel.findOne({ 
        email: email.toLowerCase() 
      });

      if (!user) {
        return null;
      }

      return new UserResponseDto({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        companyName: user.companyName,
        phoneNumber: user.phoneNumber,
        projectSummary: user.projectSummary,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    } catch (error) {
      this.logger.error(`Error fetching user by email: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to fetch user');
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID format');
    }

    try {
      // If email is being updated, check for conflicts
      if (updateUserDto.email) {
        const existingUser = await this.userModel.findOne({
          email: updateUserDto.email.toLowerCase(),
          _id: { $ne: id },
        });

        if (existingUser) {
          throw new ConflictException('User with this email already exists');
        }

        updateUserDto.email = updateUserDto.email.toLowerCase();
      }

      const user = await this.userModel.findByIdAndUpdate(
        id,
        { ...updateUserDto },
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new NotFoundException('User not found');
      }

      this.logger.log(`User updated successfully: ${user.email}`);

      return new UserResponseDto({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        companyName: user.companyName,
        phoneNumber: user.phoneNumber,
        projectSummary: user.projectSummary,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    } catch (error) {
      if (error instanceof NotFoundException || 
          error instanceof ConflictException || 
          error instanceof BadRequestException) {
        throw error;
      }

      if (error.code === 11000) {
        throw new ConflictException('User with this email already exists');
      }
      
      this.logger.error(`Error updating user: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to update user');
    }
  }

  async deactivate(id: string): Promise<UserResponseDto> {
    return this.update(id, { isActive: false });
  }

  async activate(id: string): Promise<UserResponseDto> {
    return this.update(id, { isActive: true });
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID format');
    }

    try {
      const user = await this.userModel.findByIdAndDelete(id);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      this.logger.log(`User deleted successfully: ${user.email}`);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      
      this.logger.error(`Error deleting user: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to delete user');
    }
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    recentSignups: number;
  }> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [total, active, inactive, recentSignups] = await Promise.all([
        this.userModel.countDocuments(),
        this.userModel.countDocuments({ isActive: true }),
        this.userModel.countDocuments({ isActive: false }),
        this.userModel.countDocuments({ 
          createdAt: { $gte: thirtyDaysAgo } 
        }),
      ]);

      return {
        total,
        active,
        inactive,
        recentSignups,
      };
    } catch (error) {
      this.logger.error(`Error fetching user stats: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to fetch user statistics');
    }
  }
}