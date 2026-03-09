import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Not, Repository } from 'typeorm';
import { User } from './user.entity';
import { Role } from '../common/enums/role.enum';
import * as bcrypt from 'bcrypt';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuditService } from '../audit/audit.service';


@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,

    private auditService: AuditService,
  ) {}

  async createLibrarian(currentUser, body) {
    if (currentUser.role !== Role.ROOT) {
      throw new ForbiddenException('Only ROOT can create Librarian');
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);

    const librarian = this.userRepository.create({
      name: body.name,
      email: body.email,
      password: hashedPassword,
      role: Role.LIBRARIAN,
      library: { id: currentUser.libraryId },
      parent: { id: currentUser.userId },
    });

    const saved = await this.userRepository.save(librarian);
    await this.auditService.log(
      currentUser,
      'LIBRARIAN_CREATED',
      'USER',
      saved.id,
      { email: saved.email, role: saved.role },
    );
    return saved;
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      libraryId: user.library?.id,
      libraryName: user.library?.name ?? '',
      parentId: user.parent?.id ?? null,
      phone: user.phone ?? '',
      address: user.address ?? '',
      bio: user.bio ?? '',
      photoUrl: user.photoUrl ?? '',
      createdAt: user.createdAt,
    };
  }

  async getMyProfile(currentUser) {
    const user = await this.userRepository.findOne({
      where: { id: currentUser.userId },
      relations: ['library', 'parent'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async updateMyProfile(currentUser, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({
      where: { id: currentUser.userId },
      relations: ['library', 'parent'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.name !== undefined) user.name = dto.name.trim();
    if (dto.phone !== undefined) user.phone = dto.phone.trim();
    if (dto.address !== undefined) user.address = dto.address.trim();
    if (dto.bio !== undefined) user.bio = dto.bio.trim();
    if (dto.photoUrl !== undefined) user.photoUrl = dto.photoUrl;

    const saved = await this.userRepository.save(user);
    await this.auditService.log(
      currentUser,
      'PROFILE_UPDATED',
      'USER',
      saved.id,
      {
        name: saved.name,
        phone: saved.phone,
        address: saved.address,
        photoUpdated: dto.photoUrl !== undefined,
      },
    );
    return this.sanitizeUser(saved);
  }

    async createUser(currentUser, dto) {
        // ❌ USER cannot create anyone
        if (currentUser.role === Role.USER) {
            throw new ForbiddenException('Users cannot create other users');
        }

        if (dto.role === Role.ROOT) {
            throw new ForbiddenException('Cannot create ROOT user');
        }

        // ❌ Librarian cannot create Librarian or Root
        if (
            currentUser.role === Role.LIBRARIAN &&
            dto.role !== Role.USER
        ) {
            throw new ForbiddenException(
            'Librarian can only create USER role',
            );
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const newUser = this.userRepository.create({
            name: dto.name,
            email: dto.email,
            password: hashedPassword,
            role: dto.role,
            library: { id: currentUser.libraryId },
            parent: { id: currentUser.userId },
        });

        const saved = await this.userRepository.save(newUser);
        await this.auditService.log(
          currentUser,
          'USER_CREATED',
          'USER',
          saved.id,
          { email: saved.email, role: saved.role },
        );
        return saved;
    }

  async getVisibleUsers(
    currentUser,
    page?: number,
    limit?: number,
    filters?: { q?: string; name?: string; email?: string; role?: string },
  ) {
    const paginationEnabled =
      Number.isInteger(page) &&
      Number.isInteger(limit) &&
      Number(page) > 0 &&
      Number(limit) > 0;

    const take = paginationEnabled ? Number(limit) : undefined;
    const skip = paginationEnabled ? (Number(page) - 1) * Number(limit) : undefined;

    const q = filters?.q?.trim();
    const name = filters?.name?.trim();
    const email = filters?.email?.trim();
    const role = filters?.role?.trim();

    const withTextSearch = (baseWhere: any) => {
      if (!q) return baseWhere;
      const whereList: any[] = [
        { ...baseWhere, name: ILike(`%${q}%`) },
        { ...baseWhere, email: ILike(`%${q}%`) },
      ];

      const qAsId = Number(q);
      if (Number.isInteger(qAsId) && qAsId > 0) {
        whereList.push({ ...baseWhere, id: qAsId });
      }

      return whereList;
    };

    const withFieldFilters = (baseWhere: any) => ({
      ...baseWhere,
      ...(name ? { name: ILike(`%${name}%`) } : {}),
      ...(email ? { email: ILike(`%${email}%`) } : {}),
      ...(role ? { role } : {}),
    });

    if (currentUser.role === Role.ROOT) {
      const baseWhere = { library: { id: currentUser.libraryId } };
      const where = q ? withTextSearch(baseWhere) : withFieldFilters(baseWhere);
      const [items, total] = await this.userRepository.findAndCount({
        where,
        relations: ['parent'],
        take,
        skip,
      });

      if (!paginationEnabled) return items;
      return { items, total, page: Number(page), limit: Number(limit) };
    }

    if (currentUser.role === Role.LIBRARIAN) {
      const baseWhere = {
        library: { id: currentUser.libraryId },
        role: Not(Role.ROOT),
      };
      const where = q ? withTextSearch(baseWhere) : withFieldFilters(baseWhere);
      const [items, total] = await this.userRepository.findAndCount({
        where,
        relations: ['parent'],
        take,
        skip,
      });

      if (!paginationEnabled) return items;
      return { items, total, page: Number(page), limit: Number(limit) };
    }

  // USER
    const [items, total] = await this.userRepository.findAndCount({
      where: { id: currentUser.userId },
      take,
      skip,
    });

    if (!paginationEnabled) return items;
    return { items, total, page: Number(page), limit: Number(limit) };
  }

  async deleteUser(currentUser, userId: number) {
    const targetUser = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['parent', 'library'],
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (targetUser.library.id !== currentUser.libraryId) {
      throw new ForbiddenException('Cannot delete outside library');
    }

    if (targetUser.id === currentUser.userId) {
      throw new BadRequestException('Cannot delete yourself');
    }

    if (targetUser.role === Role.ROOT) {
      throw new ForbiddenException('Cannot delete ROOT user');
    }

    if (currentUser.role === Role.USER) {
      throw new ForbiddenException('Users cannot delete anyone');
    } 

    await this.auditService.log(
      currentUser,
      'USER_DELETED',
      'USER',
      targetUser.id,
      { email: targetUser.email, role: targetUser.role },
    );

    return this.userRepository.remove(targetUser);
  }
}
