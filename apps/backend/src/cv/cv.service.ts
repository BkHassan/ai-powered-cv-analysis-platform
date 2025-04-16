import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CvService {
  private baseUrl: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    const host = this.configService.get<string>('CHROMADB_HOST', 'chromadb');
    const port = this.configService.get<string>('CHROMADB_PORT', '8000');
    this.baseUrl = `http://${host}:${port}/api/v2`;
    console.log('ChromaDB URL:', this.baseUrl);
    this.initCollection().catch(err => console.error('Init CV collection error:', err.message));
  }

  async initCollection() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/collections`),
      );
      const collections = response.data;
      if (collections.some(c => c.name === 'cv')) {
        console.log('CV collection exists');
        return;
      }
      await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/collections`, { name: 'cv' }),
      );
      console.log('CV collection created');
    } catch (error) {
      console.error('Failed to initialize cvCollection:', error.message);
      throw new InternalServerErrorException(`Failed to connect to CV database: ${error.message}`);
    }
  }

  async uploadCv(cv: { id: string; name: string; email: string; skills: string[] }, user: any) {
    try {
      const id = `cv_${Date.now()}`;
      await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/collections/cv/add`, {
          documents: [JSON.stringify(cv)],
          metadatas: [{
            name: cv.name,
            email: cv.email,
            skills: cv.skills,
            createdAt: new Date().toISOString(),
            ownerId: user.sub,
          }],
          ids: [id],
        }),
      );
      const { id: _, ...cvWithoutId } = cv;
      return { id, ...cvWithoutId };
    } catch (error) {
      console.error('Upload CV error:', error.message);
      throw new InternalServerErrorException('Failed to upload CV');
    }
  }

  async assignCv(cvId: string, userId: string, user: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/collections/cv/get`, { params: { ids: [cvId] } }),
      );
      const cv = response.data;
      if (!cv.documents.length) {
        throw new InternalServerErrorException('CV not found');
      }

      const metadata = cv.metadatas[0];
      metadata.assignedTo = userId;
      metadata.assignedAt = new Date().toISOString();
      metadata.assignedBy = user.sub;

      await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/collections/cv/update`, {
          ids: [cvId],
          metadatas: [metadata],
        }),
      );

      return { message: 'CV assigned successfully' };
    } catch (error) {
      console.error('Assign CV error:', error.message);
      throw new InternalServerErrorException('Failed to assign CV');
    }
  }
}