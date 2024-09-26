import { ConfigModuleOptions } from '@nestjs/config';

// dayjs 全局设置
import * as dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
dayjs.locale('zh-cn'); // 全局使用

// 读取配置
import configuration from './configuration';
// 加载配置
export const configModuleOptions: ConfigModuleOptions = {
  envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
  load: [configuration],
  isGlobal: true,
};
