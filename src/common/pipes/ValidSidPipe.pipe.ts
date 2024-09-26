import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class ValidSidPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (/^.{16,19}/.test(value)) return value;
    throw new BadRequestException('传入ID值错误');
  }
}
