import { HttpException, HttpStatus } from '@nestjs/common';
export class AppException extends HttpException {
  constructor(errmsg: string) {
    super(errmsg, HttpStatus.BAD_REQUEST);
  }
}
