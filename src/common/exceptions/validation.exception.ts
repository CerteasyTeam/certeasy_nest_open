import { BadRequestException, Logger, ValidationError } from '@nestjs/common';

export class ValidationException extends BadRequestException {
  private readonly logger = new Logger(ValidationException.name);
  constructor(errors: ValidationError[]) {
    const message: ValidationErrorType[] = errors.map(
      (e: ValidationError): ValidationErrorType => ({
        field: e.property,
        error: Object.values(e.constraints as EmptyObjectType).join(','),
      }),
    );
    super(message[message.length - 1] || '参数不正确');
    this.logger.log(errors, 'ValidationException');
    this.logger.log(message, 'ValidationException');
  }
}
