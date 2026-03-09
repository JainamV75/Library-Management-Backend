import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { BooksService } from './books.service';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../common/enums/role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('books')
export class BooksController {
  constructor(private booksService: BooksService) {}

  @Post()
  createBook(@Request() req, @Body() body) {
    return this.booksService.createBook(req.user, body);
  }

  @Get()
  getBooks(
    @Request() req,
    @Query('q') q?: string,
    @Query('title') title?: string,
    @Query('author') author?: string,
    @Query('genre') genre?: string,
    @Query('copyCode') copyCode?: string,
  ) {
    return this.booksService.getBooks(req.user, {
      q,
      title,
      author,
      genre,
      copyCode,
    });
  }

  @Put(':id')
  @Roles(Role.ROOT, Role.LIBRARIAN)
  updateBook(@Request() req, @Param('id') id: string, @Body() body) {
    return this.booksService.updateBook(req.user, Number(id), body);
  }

  @Delete(':id')
  @Roles(Role.ROOT, Role.LIBRARIAN)
  deleteBook(@Request() req, @Param('id') id: string) {
    return this.booksService.deleteBook(req.user, Number(id));
  }
}
