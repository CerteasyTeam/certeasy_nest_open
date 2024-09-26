import { Expose } from 'class-transformer';

export class CreateUserDto {
  @Expose()
  public userCode: string;
  @Expose()
  public nickName: string;
  @Expose()
  public email: string;
  @Expose()
  public passwd: string;
}
