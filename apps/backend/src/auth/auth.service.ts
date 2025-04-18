import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import * as chromadb from 'chromadb';
import { DefaultEmbeddingFunction } from "chromadb";

@Injectable()
export class AuthService {
  private client: chromadb.ChromaClient;
  private collection: chromadb.Collection;
  private logger = new Logger('AuthService');
  private defaultEF: DefaultEmbeddingFunction;
  
  constructor(){
    this.client = new chromadb.ChromaClient({path: 'http://localhost:8000'});
    this.defaultEF = new DefaultEmbeddingFunction();
  }

  async onModuleInit(){
    try {
      this.collection = await this.client.getOrCreateCollection({
        name: 'users',
        embeddingFunction: this.defaultEF,
      });
      this.logger.log('chromaDB collection initialized');
    }catch (error){
      this.logger.error('failed to initialized ChromaDB collection', error)
      throw new HttpException('ChromaDB initialized failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  //Generated CRUD methods 
  create(createAuthDto: CreateAuthDto) {
    return 'This action adds a new auth';
  }

  findAll() {
    return `This action returns all auth`;
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  update(id: number, updateAuthDto: UpdateAuthDto) {
    return `This action updates a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }

  //added signup method 
  async signup(createAuthDto: CreateAuthDto){
    try{
      const { email, password, role } = createAuthDto;
      const userId = email.toLowerCase();

      //check if user exists
      const existingUser = await this.collection.get({
      where: { email: userId },
      });

      if (existingUser.ids.length > 0) {
        throw new HttpException('Email already exists', HttpStatus.CONFLICT);
      }

      //store user
      await this.collection.add({
        ids: [userId, `${userId}-role`],
        documents: [JSON.stringify({ email, password, role})],
        metadatas: [{ email: userId, role }],
      });
      return { message: 'User created successfully'};
    }catch (error) {
      this.logger.error('Signup failed', error);
      throw error instanceof HttpException ? error : new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  //added login method
  async login(email: string, password: string) {
    try {
      const userId = email.toLowerCase();
      const result = await this.collection.get({
        where: { email: userId},
      });

      if (result.ids.length == 0){
        throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
      }

      const user = JSON.parse(result.documents[0] ?? 'null');
      if(user.password !== password ){
        throw new HttpException('Invalid credential', HttpStatus.UNAUTHORIZED)
      }

      return { message: 'Login successful', user: { email: user.email, role: user.role}};
    }catch (error){
      this.logger.error('Login failed', error);
      throw error instanceof HttpException ? error : new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
