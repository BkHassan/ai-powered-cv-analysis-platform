import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChromaClient, Collection } from 'chromadb';

@Injectable()
export class ChromaService implements OnModuleInit {
  private client: ChromaClient;
  private collection: Collection | null = null;

  constructor(private configService: ConfigService) {
    const chromaUrl = this.configService.get<string>('CHROMADB_URL', 'http://localhost:8000');
    const authToken = this.configService.get<string>('CHROMADB_AUTH_TOKEN', '');
    console.log('ChromaService initialized with URL:', chromaUrl);
    this.client = new ChromaClient({
      path: chromaUrl,
      auth: authToken ? { provider: 'token', credentials: authToken } : undefined,
    });
  }

  async onModuleInit() {
    try {
      const heartbeat = await this.client.heartbeat();
      console.log('ChromaDB Heartbeat:', heartbeat);
      this.collection = await this.client.getOrCreateCollection({
        name: 'users',
      });
      console.log('Users collection initialized');
    } catch (error) {
      console.error('Error initializing ChromaDB:', error.message);
    }
  }

  async createUser(user: { id: string; email: string; password: string; role: string }) {
    if (!this.collection) throw new Error('Collection not initialized');
    try {
      await this.collection.add({
        documents: [JSON.stringify(user)],
        ids: [user.id],
        metadatas: [{ email: user.email }],
      });
      console.log('User created in ChromaDB:', user.email);
    } catch (error) {
      throw new Error(`Failed to create user in ChromaDB: ${error.message}`);
    }
  }

  async findUserByEmail(email: string) {
    if (!this.collection) throw new Error('Collection not initialized');
    try {
      const results = await this.collection.get({
        where: { email },
      });
      const document = results.documents[0];
      console.log('User fetch result:', document ? 'Found' : 'Not found', email);
      return document && typeof document === 'string' ? JSON.parse(document) : null;
    } catch (error) {
      throw new Error(`Failed to fetch user from ChromaDB: ${error.message}`);
    }
  }
}