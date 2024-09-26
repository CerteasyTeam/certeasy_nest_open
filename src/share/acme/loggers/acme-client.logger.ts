import { Injectable, Logger, LoggerService } from '@nestjs/common';
import { Subject } from 'rxjs';
import * as dayjs from 'dayjs';
import { DATE_FORMAT } from '@app/common';

@Injectable()
export class AcmeClientLogger extends Logger implements LoggerService {
  /**
   * 存储内容
   * @private
   */
  private logSubjects = new Map<string, Subject<string>>();

  /**
   * 监听内容数据
   * @param key
   */
  getLogs(key: string) {
    if (!this.logSubjects.has(key)) {
      console.log(`Creating new Subject for ID ${key}`); // Debugging
      this.logSubjects.set(key, new Subject<string>());
    } else {
      console.log(`Subject already exists for ID ${key}`); // Debugging
    }
    return this.logSubjects.get(key)!.asObservable();
  }

  /**
   * 发送内容数据
   * @param key
   * @param message
   */
  emitLog(key: string, message: any) {
    const subject = this.logSubjects.get(key);
    if (subject) {
      // 处理message
      console.log(`Emitting log for ID ${key}: ${message}`); // Debugging
      subject.next(message);
    } else {
      console.warn(`No subject found for ID ${key}`);
    }
  }

  log(message: any, key?: string) {
    this.emitLog(key, message);
  }
  debug(message: any, key?: string) {
    this.emitLog(key, message);
  }
}
