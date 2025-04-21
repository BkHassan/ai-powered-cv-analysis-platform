export class CreateAuthDto {
  email: string;
  password: string;
  role?: string;
}

export class LoginAuthDto {
  email: string;
  password: string;
}