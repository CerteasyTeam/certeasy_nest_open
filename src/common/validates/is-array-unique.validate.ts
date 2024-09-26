import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isArrayUnique', async: false })
export class IsArrayUniqueValidate implements ValidatorConstraintInterface {
  validate(array: any[], args: ValidationArguments) {
    if (!Array.isArray(array)) {
      return false;
    }
    const seen = new Set();
    for (const item of array) {
      if (seen.has(item)) {
        return false;
      }
      seen.add(item);
    }
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Array contains duplicate values';
  }
}
