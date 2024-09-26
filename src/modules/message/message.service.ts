import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

// entities
import { MessageEntity } from './entities';
// dtos
import { ReadAllDto } from './dtos';

@Injectable()
export class MessageService {
  // logger
  readonly logger = new Logger(MessageService.name);
  constructor(
    @InjectRepository(MessageEntity)
    private readonly messageEntity: Repository<MessageEntity>,
  ) {}

  /**
   * 获取消息列表
   * @param user
   * @param query
   * @returns
   */
  async list(user: IUserPayload, query: any) {
    // 提取参数
    const { pageNum = 1, pageSize = 10 } = query;
    // createQueryBuilder
    const queryBuilder = this.messageEntity
      .createQueryBuilder()
      .where('user_id = :id', { id: user.id })
      .select();
    const total = await queryBuilder.getCount();
    const list = await queryBuilder
      .orderBy('create_time', 'DESC')
      .offset((pageNum - 1) * pageSize)
      .limit(pageSize)
      .getMany();
    return {
      total,
      records: list,
    };
  }

  /**
   * 获取消息信息
   * @param user
   * @param id
   * @returns
   */
  async info(user: IUserPayload, id: number) {
    const info = await this.messageEntity.findOneBy({
      id,
      userId: user.id,
    });
    if (info) {
      return info;
    }
    throw new BadRequestException('消息不存在');
  }

  /**
   * 消息已读
   * @param user
   * @param data
   * @returns
   */
  async readIds(user: IUserPayload, data: ReadAllDto) {
    return await this.messageEntity
      .createQueryBuilder()
      .update({ status: 1 })
      .where({ userId: user.id })
      .andWhereInIds(data.ids)
      .execute();
  }

  /**
   * 删除消息
   * @param user
   * @param data
   * @returns
   */
  async deleteIds(user: IUserPayload, data: ReadAllDto) {
    return await this.messageEntity
      .createQueryBuilder()
      .delete()
      .where({ userId: user.id })
      .andWhereInIds(data.ids)
      .execute();
  }
}
