import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as dayjs from 'dayjs';
// dtos
import {
  CreateUserDto,
  QueryUserInvitationDto,
  QueryUserTransactionDto,
  UpdateEmailDto,
  UpdatePasswdDto,
  UserInfoDto,
} from './dtos';
// entities
import {
  UserEntity,
  UserCoinEntity,
  UserCoinTransactionEntity,
  UserInvitationEntity,
  ThirdUserEntity,
} from './entities';
// @app/utils
import { bcryptCompare, bcryptHash } from '@app/utils';
// @app/common
import { DATE_FORMAT, USER_CACHE_PREFIX } from '@app/common';
import { UserCoinTransactionType } from '@app/modules/user/enums';
// notification
import { NotificationService } from '../notification/notification.service';
import { ConfigService } from '@nestjs/config';
// ValidationService
import { ValidationService } from '@app/share/validation/validation.service';

@Injectable()
export class UserService {
  // logger
  readonly logger = new Logger(UserService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
    private readonly validationService: ValidationService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserCoinEntity)
    private readonly userCoinRepository: Repository<UserCoinEntity>,
    @InjectRepository(UserCoinTransactionEntity)
    private readonly userCoinTransactionRepository: Repository<UserCoinTransactionEntity>,
    @InjectRepository(UserInvitationEntity)
    private readonly userInvitationEntityRepository: Repository<UserInvitationEntity>,
    @InjectRepository(ThirdUserEntity)
    private readonly thirdUserRepository: Repository<ThirdUserEntity>,
  ) {}

  /**
   * 邮箱是否已存在
   * @param email
   */
  async checkEmailExist(email: string) {
    const userInfo = await this.userRepository
      .createQueryBuilder()
      .where('email = :email', { email })
      .getOne();
    if (userInfo) throw new BadRequestException('当前邮箱已绑定用户数据！');
  }

  /**
   * 创建或者更新第三方用户信息
   * @param app
   * @param id
   * @param userId
   * @param accessToken
   * @param refreshToken
   */
  async createOrUpdateThirdUser(
    app: string,
    id: any,
    userId?: number,
    accessToken?: string,
    refreshToken?: string,
  ) {
    //
    const thirdUser = await this.thirdUserRepository.findOne({
      where: { thirdType: app, thirdUserId: id },
    });
    if (!thirdUser) {
      // 创建第三方用户
      const thirdUserRepo = this.thirdUserRepository.create({
        thirdUserId: id,
        thirdType: app,
      });
      return await this.thirdUserRepository.save(thirdUserRepo);
    }
    thirdUser.userId = userId || thirdUser.userId;
    thirdUser.thirdUserId = id;
    thirdUser.accessToken = accessToken || thirdUser.accessToken;
    thirdUser.refreshToken = refreshToken || thirdUser.refreshToken;
    await this.thirdUserRepository.save(thirdUser);
    return thirdUser;
  }

  /**
   * ID查找用户
   * @param userId
   * @returns
   */
  async getUserById(userId: any) {
    return await this.userRepository
      .createQueryBuilder()
      .where('id = :userId', { userId })
      .getOne();
  }

  /**
   * ID邮箱查找用户
   * @param userId
   * @param email
   * @returns
   */
  async getUserByIdOrMail(userId: any, email: any) {
    return await this.userRepository
      .createQueryBuilder()
      .where('id = :userId', { userId })
      .orWhere('email = :email', { email })
      .getOne();
  }

  /**
   * 邮箱查找用户
   * @param email
   * @returns
   */
  async getUserByMail(email: string = 'none') {
    return await this.userRepository.findOneBy({
      email,
    });
  }

  /**
   * 编码查找用户
   * @param userCode
   * @returns
   */
  async getUserByCode(userCode = 'none') {
    return await this.userRepository.findOneBy({
      userCode,
    });
  }

  /**
   * 获取用户简要信息
   * @param user
   * @returns
   */
  async userInfo(user: IUserPayload): Promise<UserInfoDto> {
    const userInfo = await this.userRepository.findOneBy({
      id: user.id,
    });
    if (!userInfo) {
      throw new UnauthorizedException('用户不存在');
    }
    return plainToInstance(UserInfoDto, userInfo, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * 查询用户费用记录
   * @param user
   * @param query
   */
  async userTransaction(user: IUserPayload, query: QueryUserTransactionDto) {
    // 提取参数
    const {
      startDate,
      endDate,
      type,
      pageNum = 1,
      pageSize = 10,
      sortBy = 'createTime',
      sortOrder = 'DESC',
    } = query;
    console.log('query', query);
    const queryBuilder = this.userCoinTransactionRepository
      .createQueryBuilder('uc')
      .where('uc.user_id = :userId', { userId: user.id })
      .select();
    // 类型筛选
    if (type && [0, 1].includes(parseInt(type))) {
      queryBuilder.andWhere(`uc.type = :type`, { type });
    }
    // 时间筛选
    if (startDate && endDate) {
      queryBuilder.andWhere(
        'create_time >= :startDate and create_time <= :endDate',
        {
          startDate: dayjs(startDate).startOf('day').format(DATE_FORMAT),
          endDate: dayjs(endDate).endOf('day').format(DATE_FORMAT),
        },
      );
    }
    // 排序筛选
    if (sortBy && sortOrder) {
      queryBuilder.addOrderBy(`uc.${sortBy}`, sortOrder);
    }
    const [list, total] = await queryBuilder
      .offset((pageNum - 1) * pageSize)
      .limit(pageSize)
      .getManyAndCount();
    return {
      total,
      records: list,
    };
  }

  /**
   * 查询用户邀请记录
   * @param user
   * @param query
   */
  async userInvitation(user: IUserPayload, query: QueryUserInvitationDto) {
    // 提取参数
    const {
      keyword,
      pageNum = 1,
      pageSize = 10,
      sortBy = 'createTime',
      sortOrder = 'DESC',
    } = query;
    const queryBuilder = this.userInvitationEntityRepository
      .createQueryBuilder('ui')
      .leftJoinAndSelect('ui.user', 'u')
      .leftJoinAndSelect('ui.signup', 'su')
      .where('ui.user_id = :userId', { userId: user.id })
      .select('ui')
      // .addSelect(['u.id', 'u.email'])
      .addSelect(['su.id', 'su.email', 'su.userCode']);

    // 关键词筛选
    if (keyword) {
      queryBuilder.andWhere(
        `su.email LIKE :keyword or su.nick_name LIKE :keyword`,
        {
          keyword: `%${keyword}%`,
        },
      );
    }
    // 排序筛选
    if (sortBy && sortOrder) {
      queryBuilder.addOrderBy(`ui.${sortBy}`, sortOrder);
    }
    const [list, total] = await queryBuilder
      .offset((pageNum - 1) * pageSize)
      .limit(pageSize)
      .getManyAndCount();
    return {
      total,
      records: list,
    };
  }

  /**
   * 获取用户余额
   * @param user
   * @returns
   */
  async userCoins(user: IUserPayload): Promise<any> {
    await this.userInfo(user);
    const userCoin = await this.userCoinRepository.findOneBy({
      userId: user.id,
    });
    return {
      coins: userCoin?.coin || 0,
    };
  }

  /**
   * 更新邮箱地址
   * @param user
   * @param data
   * @returns
   */
  async updateEmail(user: IUserPayload, data: UpdateEmailDto) {
    // 验证码校验
    await this.validationService.valid('email', data.email, data.code);
    return await this.userRepository.update(user.id, {
      email: data.email,
    });
  }

  /**
   * 更新密码
   * @param user
   * @param data
   * @param noCompare
   * @returns
   */
  async updatePasswd(
    user: IUserPayload,
    data: UpdatePasswdDto,
    noCompare?: boolean,
  ) {
    // 这里就直接是密码重置来源 - 直接覆盖密码
    if (noCompare) {
      // 2.新密码写入
      return await this.userRepository.update(user.id, {
        passwd: bcryptHash(data.newPasswd),
      });
    }
    const { passwd } = await this.userRepository.findOneBy({ id: user.id });
    // 1.密码比对
    if (bcryptCompare(data.passwd, passwd)) {
      // 2.新密码写入
      return await this.userRepository.update(user.id, {
        passwd: bcryptHash(data.newPasswd),
      });
    }
    throw new BadRequestException('原密码密码错误');
  }

  /**
   * 创建用户
   * @param userDto
   */
  async create(userDto: CreateUserDto) {
    // TODO startTransaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // 1.创建基本用户
      const userRepo = this.userRepository.create(userDto);
      const user = await queryRunner.manager.save(userRepo);
      this.logger.debug(`user completed => ${JSON.stringify(user)}`);
      // 2.创建用户金币
      const userCoinRepo = this.userCoinRepository.create({
        userId: user.id,
        coin: 0,
      });
      // 单纯写入
      await queryRunner.manager.save(userCoinRepo);
      // 读取锁
      const userCoin = await this.userCoinWithTransaction(queryRunner, user);
      this.logger.debug(`userCoin completed => ${JSON.stringify(userCoin)}`);
      // 3.下发注册奖励
      const invitationNormalCoins = this.configService.get<number>(
        'invitation.normal_coins',
        1000,
      );
      await this.userCoinTransaction(
        queryRunner,
        userCoin,
        invitationNormalCoins,
        UserCoinTransactionType.INCREASE,
        `新用户注册赠送${invitationNormalCoins}金币`,
      );
      // 用户通知配置
      await this.notificationService.createUserNotificationConfig(user);
      // commitTransaction
      await queryRunner.commitTransaction();
      // 4.记录userCode
      await this.cacheManager.set(
        USER_CACHE_PREFIX + `code:${user.userCode}`,
        {
          userId: user.id,
          nickName: user.nickName,
          userCode: user.userCode,
        },
        0,
      );
      return plainToInstance(UserInfoDto, user, {
        excludeExtraneousValues: true,
      });
    } catch (e) {
      // rollbackTransaction
      await queryRunner.rollbackTransaction();
      this.logger.error('create error:' + e.message);
      throw new BadRequestException('注册用户失败');
    } finally {
      // 释放
      await queryRunner.release();
    }
  }

  /**
   * 用户金币
   * @param user
   */
  async userCoin(user: IUserPayload) {
    // 构建查询实体
    return await this.userCoinRepository.findOneBy({
      userId: user.id,
    });
  }

  /**
   * 用户金币
   * @param queryRunner
   * @param user
   */
  async userCoinWithTransaction(queryRunner: QueryRunner, user: IUserPayload) {
    // 构建查询实体
    const queryRepo = this.userCoinRepository.create({
      userId: user.id,
    });

    return await queryRunner.manager.findOne(UserCoinEntity, {
      where: queryRepo,
      lock: {
        mode: 'pessimistic_write',
      },
    });
  }

  /**
   * 创建用户邀请记录
   * @param userId 邀请用户
   * @param signupId 注册用户
   * @returns
   */
  async createUserInvitation(userId: number, signupId: number) {
    const invitationActivateCoins = this.configService.get<number>(
      'invitation.activate_coins',
      500,
    );
    // TODO startTransaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const userInvitationRepo = this.userInvitationEntityRepository.create({
        userId,
        signupId,
        coin: invitationActivateCoins,
      });
      const userInvitation = await queryRunner.manager.save(userInvitationRepo);
      this.logger.debug(
        `userInvitation completed => ${JSON.stringify(userInvitation)}`,
      );
      // 下发邀请奖励
      const userCoin = await this.userCoinWithTransaction(queryRunner, {
        id: userId,
      });
      this.logger.debug(`userCoin info => ${JSON.stringify(userCoin)}`);
      await this.userCoinTransaction(
        queryRunner,
        userCoin,
        invitationActivateCoins,
        UserCoinTransactionType.INCREASE,
        `邀请新用户注册奖励${invitationActivateCoins}金币`,
      );
      // commitTransaction
      await queryRunner.commitTransaction();
      return userInvitation;
    } catch (e) {
      // rollbackTransaction
      await queryRunner.rollbackTransaction();
      this.logger.error('createUserInvitation error:' + e.message);
      throw new BadRequestException('注册用户失败');
    } finally {
      // 释放
      await queryRunner.release();
    }
  }

  /**
   * 用户金币操作
   * @param queryRunner
   * @param userCoin
   * @param coin
   * @param type
   * @param {string} remark
   */
  async userCoinTransaction(
    queryRunner: QueryRunner,
    userCoin: UserCoinEntity,
    coin: number,
    type: number,
    remark: string = '',
  ) {
    try {
      // 金币操作 补充parseFloat防止字符串+的错误
      const coinAfter = parseFloat(userCoin.coin + '') + parseFloat(coin + '');
      // 赋值coin更新
      userCoin.coin = coinAfter;
      // 1.操作用户coin - 直接用entity处理,不用update
      await queryRunner.manager.save(userCoin);
      this.logger.debug(
        `userCoinTransaction info => uid:${userCoin.userId},coin: ${coin}, type: ${type}, coinBefore: ${userCoin.coin}, coinAfter: ${coinAfter}`,
      );
      // 2.写入记录
      const userCoinTransactionRepo = this.userCoinTransactionRepository.create(
        {
          userId: userCoin.userId,
          type,
          coin,
          coinAfter,
          remark,
        },
      );
      const userCoinTransaction = await queryRunner.manager.save(
        userCoinTransactionRepo,
      );
      this.logger.debug(
        `userCoinTransaction completed => ${JSON.stringify(userCoinTransaction)}`,
      );
      return userCoinTransaction;
    } catch (e) {
      this.logger.error('userCoinTransaction error:' + e.message);
      throw new BadRequestException('用户金币操作失败');
    }
  }

  /**
   * 分发用户充值金币奖励给邀请者
   * @param user
   * @param coin
   */
  async rewardCoinToParent(user: IUserPayload, coin: number) {
    // 查找上级管理
    const invitation = await this.userInvitationEntityRepository.findOne({
      where: {
        signupId: user.id,
      },
      relations: ['user'],
    });
    // 没有上下级关系，忽略
    if (!invitation) return;
    // 比例计算奖励coin金额
    const rate = this.configService.get<number>(
      'invitation.recharge_reward_rate',
      10,
    );
    const rewardCoin = Math.floor(coin * (rate / 100));
    // 奖励金币不足1
    if (rewardCoin <= 0) return;
    // startTransaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // TODO 下发金币
      const userCoin = await this.userCoinWithTransaction(queryRunner, {
        id: invitation.userId,
      });
      this.logger.debug(`userCoin info => ${JSON.stringify(userCoin)}`);
      await this.userCoinTransaction(
        queryRunner,
        userCoin,
        rewardCoin,
        UserCoinTransactionType.INCREASE,
        `推荐用户金币充值奖励${rewardCoin}金币`,
      );
      this.logger.log('update user coin transaction done');
      // commitTransaction
      await queryRunner.commitTransaction();
      return invitation;
    } catch (err) {
      // rollbackTransaction
      await queryRunner.rollbackTransaction();
      this.logger.error('reward coin to parent err:' + err.message);
    } finally {
      // 释放
      await queryRunner.release();
    }
  }
}
