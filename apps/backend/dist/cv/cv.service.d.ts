import { CreateCvDto } from './dto/create-cv.dto';
import { UpdateCvDto } from './dto/update-cv.dto';
export declare class CvService {
    create(createCvDto: CreateCvDto): string;
    findAll(): string;
    findOne(id: number): string;
    update(id: number, updateCvDto: UpdateCvDto): string;
    remove(id: number): string;
}
