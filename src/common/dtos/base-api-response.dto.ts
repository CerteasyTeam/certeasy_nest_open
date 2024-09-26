import { ApiProperty } from '@nestjs/swagger';
import { Type } from '@nestjs/common';

// 空内容
export class EmptyResponseType {}

export class BaseApiResponse<T> {
  // Response Code
  @ApiProperty()
  public code?: number;
  // Response Data
  @ApiProperty()
  public data: T;
  // Response Message
  @ApiProperty()
  public message: string;
}

export function SwaggerBaseApiResponse<T>(
  dataType: Type<T>,
): typeof BaseApiResponse {
  class ExtendedBaseApiResponse<T> extends BaseApiResponse<T> {
    @ApiProperty({ type: Number })
    public code: number;
    @ApiProperty({ type: dataType })
    public data: T;
    @ApiProperty({ type: String })
    public message: string;
  }
  // NOTE : Overwrite the returned class name, otherwise whichever type calls this function in the last,
  // will overwrite all previous definitions. i.e., Swagger will have all response types as the same one.
  const isAnArray = Array.isArray(dataType) ? ' [ ] ' : '';
  Object.defineProperty(ExtendedBaseApiResponse, 'name', {
    value: `SwaggerBaseApiResponseFor ${dataType} ${isAnArray}`,
  });

  return ExtendedBaseApiResponse;
}

export class BaseApiErrorResponse {
  @ApiProperty({ type: Number })
  public code: number;

  @ApiProperty({ type: String })
  public message: string;

  @ApiProperty({ type: String })
  public path: string;

  @ApiProperty({ type: String })
  public timestamp: string;
}

export class PaginationData<T> {
  @ApiProperty({ type: Number })
  total: number;

  @ApiProperty()
  records: T;
}
