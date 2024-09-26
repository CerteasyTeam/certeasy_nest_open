import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

// entities
import {
  NotificationEntity,
  NotificationChannelEntity,
  NotificationConfigEntity,
  NotificationProviderEntity,
} from './entities';
import {
  CreateChannelIDto,
  NotificationChannelDto,
  QueryNotificationChannelDto,
  UpdateConfigIDto,
} from '@app/modules/notification/dtos';
import { BaseQueryInput } from '@app/common';
import { plainToInstance } from 'class-transformer';
// dtos

// channels
import {
  DingTalkChannelService,
  EmailChannelService,
  QYApiChannelService,
} from './channels';

@Injectable()
export class NotificationService {
  // logger
  readonly logger = new Logger(NotificationService.name);
  constructor(
    @InjectQueue('notification')
    private notificationQueue: Queue,
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    @InjectRepository(NotificationChannelEntity)
    private readonly notificationChannelRepository: Repository<NotificationChannelEntity>,
    @InjectRepository(NotificationConfigEntity)
    private readonly notificationConfigRepository: Repository<NotificationConfigEntity>,
    @InjectRepository(NotificationProviderEntity)
    private readonly notificationProviderRepository: Repository<NotificationProviderEntity>,
    // channel
    private dingTalkChannelService: DingTalkChannelService,
    private emailChannelService: EmailChannelService,
    private qyApiChannelService: QYApiChannelService,
  ) {}

  /**
   * 获取用户通知配置
   * @param user
   */
  async config(user: IUserPayload) {
    // 以config为主表，关联和渠道表
    const list = await this.notificationConfigRepository
      .createQueryBuilder('c')
      .leftJoinAndSelect(NotificationEntity, 'n', 'n.id = c.notificationId')
      .where('c.userId = :userId', { userId: user.id })
      .select([
        'c.channel_ids as associatedChannels',
        'n.id as id',
        'n.name as name',
        'c.status as status',
        'c.create_time as createTime',
        'c.update_time as updateTime',
      ])
      .getRawMany();
    // 处理associatedChannels

    return await Promise.all(
      list.map(async (item: { associatedChannels: any }) => {
        // 处理关联数据
        let associatedChannels = [];
        if (item.associatedChannels) {
          const channelIds = item.associatedChannels
            ? JSON.parse(item.associatedChannels)
            : [];
          // 读取关联数据
          associatedChannels = await this.notificationChannelRepository
            .createQueryBuilder('nc')
            .leftJoinAndSelect('nc.provider', 'np')
            .where({
              id: In(channelIds),
            })
            .select(
              'nc.id,nc.name,np.name as providerName,np.logo as providerLogo',
            )
            // .orderBy('nc.createTime', 'DESC')
            .getRawMany();
        }
        return {
          ...item,
          associatedChannels,
        };
      }),
    );
  }

  /**
   * 更新通知配置
   * @param user
   * @param id
   * @param data
   */
  async updateConfig(user: IUserPayload, id: number, data: UpdateConfigIDto) {
    // 这里只修改一个内容，就是 associatedChannelIds
    const notificationConfig =
      await this.notificationConfigRepository.findOneBy({
        userId: user.id,
        notificationId: id,
      });
    if (notificationConfig) {
      // 直接更新
      if (data?.associatedChannelIds) {
        notificationConfig.channelIds = data?.associatedChannelIds;
      }
      // 特殊处理下
      if (data.notificationEnabled >= 0) {
        notificationConfig.status = data?.notificationEnabled ? 1 : 0;
      }
      return await this.notificationConfigRepository.save(notificationConfig);
    }
    throw new BadRequestException('配置数据不存在');
  }

  /**
   * 列取用户通知渠道列表
   * @param user
   * @param query
   */
  async listChannel(user: IUserPayload, query: QueryNotificationChannelDto) {
    // 提取参数
    const {
      keyword,
      pageNum = 1,
      pageSize = 10,
      sortBy = 'createTime',
      sortOrder = 'ASC',
    } = query;
    const queryBuilder = this.notificationChannelRepository
      .createQueryBuilder('nc')
      .leftJoinAndSelect('nc.provider', 'np')
      .where('nc.userId = :userId', { userId: user.id })
      .select('nc')
      .addSelect(['np.logo as nc_providerLogo', 'np.name as nc_providerName']);
    // 关键词筛选
    if (keyword) {
      queryBuilder.andWhere(
        `nc.name LIKE :keyword or nc.alias LIKE :keyword or np.name LIKE :keyword`,
        {
          keyword: `%${keyword}%`,
        },
      );
    }
    // 排序筛选
    if (sortBy && sortOrder) {
      queryBuilder.addOrderBy(`nc.${sortBy}`, sortOrder);
    }
    const [records, total] = await queryBuilder
      .offset((pageNum - 1) * pageSize)
      .limit(pageSize)
      .getManyAndCount();
    return {
      total,
      records,
    };
  }

  /**
   * 创建渠道数据
   * @param user
   * @param data
   */
  async createChannel(user: IUserPayload, data: CreateChannelIDto) {
    try {
      const channelRepo = this.notificationChannelRepository.create({
        userId: user.id,
        providerId: data.providerId,
        accessJson: data.accessJson,
      });
      return await this.notificationChannelRepository.save(channelRepo);
    } catch (err) {
      this.logger.error('create channel err: ' + err.message);
      throw new BadRequestException('新增通知渠道错误');
    }
  }

  /**
   * 通知检查
   * @param user
   * @param data
   */
  async checkChannel(user: IUserPayload, data: CreateChannelIDto) {
    const { providerId, accessJson } = data;
    try {
      const error = '';
      const validation = await this.notificationToChannel(
        providerId,
        { user, accessJson },
        true,
      );
      return {
        validation,
        error,
      };
    } catch (err) {
      this.logger.error(err);
      throw new BadRequestException('校验错误，请检查配置参数');
    }
  }

  /**
   * 渠道详情
   * @param user
   * @param id
   */
  async channelInfo(user: IUserPayload, id: number) {
    const queryBuilder = this.notificationChannelRepository
      .createQueryBuilder('nc')
      .leftJoinAndSelect('nc.provider', 'np')
      .where('nc.userId = :userId and nc.id = :id', { userId: user.id, id })
      .select('nc')
      .addSelect(['np.logo as nc_providerLogo', 'np.name as nc_providerName']);
    const info = await queryBuilder.getOne();
    if (info) return info;
    throw new BadRequestException('未找到渠道信息数据');
  }

  /**
   * 更新渠道数据
   * @param user
   * @param id
   * @param data
   */
  async updateChannelInfo(
    user: IUserPayload,
    id: number,
    data: NotificationChannelDto,
  ) {
    console.log('data', data);
    const info = await this.notificationChannelRepository.findOneBy({
      id,
      userId: user.id,
    });
    if (info) {
      const updateEntity = plainToInstance(NotificationChannelEntity, data, {
        excludeExtraneousValues: true,
      });
      console.log('updateEntity', updateEntity);
      return await this.notificationChannelRepository.update(id, updateEntity);
    }
    throw new BadRequestException('未找到渠道信息数据');
  }

  /**
   * 删除渠道
   * @param user
   * @param id
   */
  async deleteChannelInfo(user: IUserPayload, id: number) {
    // 查找是否关联，有关联把关联也处理掉
    const info = await this.notificationChannelRepository.findOneBy({
      id,
      userId: user.id,
    });
    if (info) {
      // TODO 删除关联数据
      return await this.notificationChannelRepository.delete(info.id);
    }
    throw new BadRequestException('未找到渠道信息数据');
  }

  /**
   * 获取通知供应商
   * @param query
   */
  async listProvider(query: BaseQueryInput) {
    return await this.notificationProviderRepository.find({
      skip: query.pageNum,
      take: query.pageSize,
    });
  }

  /**
   * 创建用户通知配置
   * @param user
   */
  async createUserNotificationConfig(user: IUserPayload) {
    const configList = await this.notificationRepository.find({
      select: ['id'],
    });
    // 写入关联表
    const notificationConfig = configList.map((config) => {
      return this.notificationConfigRepository.create({
        userId: user.id,
        notificationId: config.id,
      });
    });
    return await this.notificationConfigRepository.save(notificationConfig);
  }

  /**
   * 触发消息通知
   * @param user
   * @param type 这里就是 notificationId
   * @param content 消息内容，配合ejs的变量
   */
  async triggerNotification(user: IUserPayload, type: number, content: any) {
    // 查找用户在这个类型的通知渠道
    const notificationConfig = await this.notificationConfigRepository.findOne({
      where: {
        userId: user.id,
        notificationId: type,
      },
      relations: ['notification'],
    });
    // 检查是否开启
    if (notificationConfig?.status === 0) return;
    // 默认邮件推送
    const defaultChannel = new NotificationChannelEntity();
    defaultChannel.id = Date.now();
    defaultChannel.userId = user.id;
    defaultChannel.providerId = 1; // 邮件推送
    defaultChannel.accessJson = {
      email: user.email,
    };

    // 推送合计
    let pushNotificationChannelList = [defaultChannel];

    // 是否有配置channel
    if (notificationConfig?.channelIds?.length) {
      // 追加提取发送列
      pushNotificationChannelList = pushNotificationChannelList.concat(
        await this.notificationChannelRepository.findBy({
          id: In(notificationConfig.channelIds),
        }),
      );
    }

    // TODO 丢入发送队列 - 每个渠道一个队列
    pushNotificationChannelList.map(async (channel) => {
      await this.notificationQueue.add(
        'notification-send',
        {
          user,
          notification: notificationConfig?.notification,
          channel,
          template: type,
          content,
        },
        {
          delay: 3e3,
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    });

    return pushNotificationChannelList;
  }

  /**
   *
   * @param channel
   * @param options
   * @param check
   */
  async notificationToChannel(
    channel: number | string,
    options: any,
    check = false,
  ) {
    switch (channel) {
      case 3:
      case 'qyapi':
        return this.qyApiChannelService.sendNotification(options, check);
      case 2:
      case 'dingtalk':
        return this.dingTalkChannelService.sendNotification(options, check);
      case 1:
      case 'email':
        return this.emailChannelService.sendNotification(options, check);
      default:
        throw new Error(`Unknown notification channel: ${channel}`);
    }
  }
}
