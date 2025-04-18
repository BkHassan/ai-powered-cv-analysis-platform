import { CvService } from './cv.service';
import { CreateCvDto } from './dto/create-cv.dto';
import { UpdateCvDto } from './dto/update-cv.dto';
export declare class CvController {
    private readonly cvService;
    constructor(cvService: CvService);
    create(createCvDto: CreateCvDto): string;
    findAll(): string;
    findOne(id: string): string;
    update(id: string, updateCvDto: UpdateCvDto): string;
    remove(id: string): string;
}
