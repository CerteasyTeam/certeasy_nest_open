import { BadRequestException } from '@nestjs/common';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import * as psl from 'psl';
// @app/common
import { CERTIFICATE_TYPE } from '@app/common';

@ValidatorConstraint({ name: 'isVerifyDomain', async: false })
export class IsVerifyDomainValidate implements ValidatorConstraintInterface {
  validate(array: any[], args: ValidationArguments) {
    if (!Array.isArray(array)) {
      return false;
    }
    // 提取数据
    const { type } = args?.object as any;
    // 类型校验
    if (type == CERTIFICATE_TYPE.SINGLE && array?.length > 1) {
      throw new BadRequestException('单域名类型证书域名数量不能多于1个');
    }
    if (type == CERTIFICATE_TYPE.MULTI && array?.length <= 1) {
      throw new BadRequestException('多域名类型证书域名数量不能少于2个');
    }
    if (type == CERTIFICATE_TYPE.MULTI && array?.length > 100) {
      throw new BadRequestException('多域名类型证书域名数量不能多于100个');
    }

    // 是否泛域名
    const wildcard = array?.every((item: string) => item.startsWith('*.'));
    if (type != CERTIFICATE_TYPE.WILDCARD && wildcard) {
      throw new BadRequestException('单域名或多域名不能以*.开头');
    }
    if (type == CERTIFICATE_TYPE.WILDCARD && !wildcard) {
      throw new BadRequestException('泛域名必须以*.开头');
    }
    // 域名校验
    let mainDomain;
    for (const domain of array) {
      const tempDomain = domain.startsWith('*.')
        ? domain.replace('*.', '')
        : domain;
      if (!psl.isValid(tempDomain)) {
        throw new BadRequestException(`域名【${tempDomain}】不是合法域名`);
      }
      const tempMainDomain = psl.get(tempDomain);
      if (!mainDomain) {
        mainDomain = tempMainDomain;
      } else if (mainDomain !== tempMainDomain) {
        throw new BadRequestException(
          `顶级域名不一致，所有域名的顶级域名必须一致`,
        );
      }
    }
    return mainDomain;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Doamins array validation error';
  }
}
