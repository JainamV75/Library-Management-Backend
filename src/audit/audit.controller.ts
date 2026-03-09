import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AuditService } from './audit.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get('logs')
  @Roles(Role.ROOT)
  getLogs(
    @Request() req,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getLibraryLogs(req.user, limit ? Number(limit) : 100);
  }
}
