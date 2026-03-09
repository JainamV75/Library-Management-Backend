import { IsEmail, IsNotEmpty } from 'class-validator';

export class RegisterRootDto {
  @IsNotEmpty()
  libraryName: string;

  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}