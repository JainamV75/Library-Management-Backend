import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AssignmentsService } from './assignments.service';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('assignments')
export class AssignmentsController {
  constructor(private assignmentsService: AssignmentsService) {}

  @Post()
  assignBook(@Request() req, @Body() body) {
    return this.assignmentsService.assignBook(
      req.user,
      body.userId,
      body.bookId,
    );
  }

  @Get('my')
  getMyAssignments(@Request() req) {
    return this.assignmentsService.getUserAssignments(req.user.userId);
  }

  @Get('history')
  getMyAssignmentHistory(@Request() req) {
    return this.assignmentsService.getUserAssignmentHistory(req.user.userId);
  }

  @Get('library')
  @Roles(Role.ROOT, Role.LIBRARIAN)
  getLibraryAssignments(@Request() req, @Query('copyCode') copyCode?: string) {
    return this.assignmentsService.getLibraryAssignments(req.user, copyCode);
  }

  @Post('library/cleanup-duplicates')
  @Roles(Role.ROOT)
  cleanupDuplicateAssignments(@Request() req) {
    return this.assignmentsService.cleanupDuplicateActiveAssignments(req.user);
  }

  @Post(':id/return')
  @Roles(Role.ROOT, Role.LIBRARIAN)
  returnBook(@Request() req, @Param('id') id: string) {
    return this.assignmentsService.returnBook(req.user, Number(id));
  }

  @Post(':id/renew')
  renewBook(@Request() req, @Param('id') id: string) {
    return this.assignmentsService.renewBook(req.user, Number(id));
  }
}
