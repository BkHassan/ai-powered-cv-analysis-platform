// import { Controller, Post, Body, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
// import { CvService } from './cv.service';
// import { CreateCvDto } from './dto/create-cv.dto';

// @Controller('cv')
// export class CvController {
//   constructor(private readonly cvService: CvService) {}

//   @Post('upload')
//   @HttpCode(HttpStatus.CREATED)
//   async uploadCv(@Body() createCvDto: CreateCvDto) {
//     if (!createCvDto.id || !createCvDto.name || !createCvDto.email || !createCvDto.skills) {
//       throw new BadRequestException('ID, name, email, and skills are required');
//     }
//     return this.cvService.uploadCv(createCvDto);
//   }
// }