import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Get } from '@nestjs/common';
import { Delete, Param, Put } from '@nestjs/common';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  getAllUsers(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('name') name?: string,
    @Query('email') email?: string,
    @Query('role') role?: string,
  ) {
    return this.usersService.getVisibleUsers(
      req.user,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      { q, name, email, role },
    );
  }

  @Get('me')
  getMyProfile(@Request() req) {
    return this.usersService.getMyProfile(req.user);
  }

  @Put('me')
  updateMyProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateMyProfile(req.user, dto);
  }

  @Post('create-librarian')
  @Roles(Role.ROOT)
  createLibrarian(@Request() req, @Body() body) {
    return this.usersService.createLibrarian(req.user, body);
  }

  @Post('create-user')
  createUser(@Request() req, @Body() dto: CreateUserDto) {
    return this.usersService.createUser(req.user, dto);
  }

  @Delete(':id')
  @Roles(Role.ROOT, Role.LIBRARIAN)
  deleteUser(@Request() req, @Param('id') id: string) {
    return this.usersService.deleteUser(req.user, Number(id));
  }
}
