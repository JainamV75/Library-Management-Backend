import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Library } from '../libraries/library.entity';
import { User } from '../users/user.entity';
import { JwtService } from '@nestjs/jwt';
import { RegisterRootDto } from './dto/register-root.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '../common/enums/role.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(Library)
    private libraryRepository: Repository<Library>,

    private jwtService: JwtService,
  ) {}

  async registerRoot(dto: RegisterRootDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    // 1️⃣ Create Library
    const library = this.libraryRepository.create({
      name: dto.libraryName,
    });

    await this.libraryRepository.save(library);

    // 2️⃣ Hash Password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 3️⃣ Create Root User
    const rootUser = this.userRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      role: Role.ROOT,
      library,
    });

    await this.userRepository.save(rootUser);

    // 4️⃣ Generate JWT
    const token = this.jwtService.sign({
      userId: rootUser.id,
      role: rootUser.role,
      libraryId: library.id,
    });

    return {
      message: 'Root user registered successfully',
      access_token: token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      relations: ['library'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({
      userId: user.id,
      role: user.role,
      libraryId: user.library.id,
    });

    return {
      message: 'Login successful',
      access_token: token,
    };
  }
}