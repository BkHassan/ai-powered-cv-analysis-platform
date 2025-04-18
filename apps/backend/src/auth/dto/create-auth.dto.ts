export class CreateAuthDto {
    email: string;
    password: string;
    role: 'admin' | 'user';
}
