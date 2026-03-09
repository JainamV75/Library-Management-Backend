import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
  ) {}

  async log(
    actor: { userId?: number; role?: string; libraryId?: number } | null,
    action: string,
    entityType: string,
    entityId?: number,
    details?: Record<string, unknown>,
  ) {
    const log = this.auditRepo.create({
      actorId: actor?.userId ? Number(actor.userId) : null,
      actorRole: actor?.role ?? null,
      libraryId: actor?.libraryId ?? null,
      action,
      entityType,
      entityId: entityId ?? null,
      details: details ?? null,
    });

    return this.auditRepo.save(log);
  }

  async getLibraryLogs(
    currentUser: { libraryId?: number },
    limit = 100,
  ) {
    return this.auditRepo.find({
      where: { libraryId: currentUser.libraryId },
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 500),
    });
  }
}
