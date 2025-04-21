// import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
// import { CreateCvDto } from './dto/create-cv.dto';
// import * as chromadb from 'chromadb';
// import { DefaultEmbeddingFunction } from 'chromadb';

// @Injectable()
// export class CvService {
//   private client: chromadb.ChromaClient;
//   private collection: chromadb.Collection;
//   private logger = new Logger('CvService');

//   constructor() {
//     this.client = new chromadb.ChromaClient({ path: 'http://chromadb:8000' });
//     console.log('ChromaClient initialized with path: http://chromadb:8000');
//   }

//   async onModuleInit() {
//     try {
//       console.log('Initializing ChromaDB collection...');
//       this.collection = await this.client.getOrCreateCollection({
//         name: 'cvs',
//         embeddingFunction: new DefaultEmbeddingFunction(),
//       });
//       console.log('ChromaDB collection initialized: cvs');
//       this.logger.log('ChromaDB collection initialized');
//     } catch (error) {
//       console.error('Failed to initialize ChromaDB collection:', error);
//       this.logger.error('Failed to initialize ChromaDB collection', error);
//       throw new HttpException('ChromaDB initialization failed', HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }

//   async uploadCv(createCvDto: CreateCvDto) {
//     try {
//       const { id, name, email, skills } = createCvDto;
//       console.log(`CV upload attempt for id: ${id}`);

//       console.log('Checking for existing CV...');
//       const existingCv = await this.collection.get({
//         where: { id },
//       });
//       console.log(`Existing CV check result: ${JSON.stringify(existingCv)}`);

//       if (existingCv.ids.length > 0) {
//         console.log('CV already exists');
//         throw new HttpException('CV ID already exists', HttpStatus.CONFLICT);
//       }

//       console.log('Adding CV to collection...');
//       const cvData = JSON.stringify({ name, email, skills });
//       await this.collection.add({
//         ids: [id],
//         documents: [cvData],
//         metadatas: [{ id, email }],
//       });
//       console.log('CV added successfully with embeddings');

//       return { message: 'CV uploaded successfully', id };
//     } catch (error) {
//       console.error('CV upload failed:', error);
//       this.logger.error('CV upload failed', error);
//       throw error instanceof HttpException ? error : new HttpException('Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }
// }