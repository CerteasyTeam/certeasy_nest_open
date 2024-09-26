import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
// dtos
import {
  SigninDto,
  SignupDto,
  ResetPasswdInputDto,
  SendResetPasswdInputDto,
  WechatAuthDto,
} from './dtos';
import { CreateUserDto, UserInfoDto } from '../user/dtos';
// service
import { UserService } from '../user/user.service';
// share
import { ValidationService, WechatService } from '@app/share';
// @app/utils
import { bcryptCompare, cryptoMd5, randomString } from '@app/utils';
// @app/common
import {
  AppException,
  DATE_FORMAT,
  GLOBAL_CACHE_PREFIX,
  USER_CACHE_PREFIX,
} from '@app/common';
import { HttpService } from '@nestjs/axios';
// tools
import * as dayjs from 'dayjs';
import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer';
import { AxiosRequestConfig } from 'axios';
import * as _ from 'lodash';

@Injectable()
export class AuthService {
  // logger
  readonly logger = new Logger(AuthService.name);
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
    private readonly userService: UserService,
    private readonly validationService: ValidationService,
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
    private readonly wechatService: WechatService,
  ) {}

  /**
   * 微信授权
   * @param prod
   * @param data
   */
  async wechat(prod: string, data: WechatAuthDto) {
    // 微信授权，传入code
    const { openid, session_key } = await this.wechatService.code2Session(
      data?.code,
    );
    // 1.得到用户数据，查询或者新增用户内容
    const thirdUser = await this.userService.createOrUpdateThirdUser(
      prod,
      openid,
    );
    // 查找关联用户
    let user: any = await this.userService.getUserById(thirdUser?.userId);
    // 没有用户数据，需要插入新的数据
    if (!user) {
      // 模拟验证码
      const mockCode = await this.validationService.send(
        'signup',
        openid,
        true,
      );
      user = await this.signup({
        email: openid,
        passwd: randomString(12),
        code: mockCode,
        invite: data?.invitation,
      });
    }
    // 更新third用户userId
    await this.userService.createOrUpdateThirdUser(
      prod,
      openid,
      user.id,
      session_key,
    );
    // 返回登录信息
    const userSignResult = await this.userSign(user);
    // TODO 如果存在scene，需要更新用户扫码状态，下发授权数据
    if (data?.scene) {
      // 写入授权数据
      await this.cacheManager.set(
        USER_CACHE_PREFIX + `wechat:${data?.scene}`,
        {
          time: Date.now(),
          data: {
            ...userSignResult,
          },
        },
        5 * 60 * 1e3,
      );
    }
    return userSignResult;
  }

  /**
   * // TODO 到时候添加其他方式再提出来
   * clientRequest
   */
  async clientRequest(config?: AxiosRequestConfig) {
    try {
      const response = await this.httpService
        .request(
          _.merge(
            {
              method: 'GET',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                UserAgent:
                  'Mozilla/5.0 (compatible; Certeasy server; +https://certeasy.cn)',
              },
            },
            config,
          ),
        )
        .toPromise();
      // 请求正常
      if (response && response?.status == 200) {
        console.log(' response.data', response.data);
        return response.data;
      }
      new Error('provider request failed.');
    } catch (err) {
      this.logger.error('request.err:', err.message);
      throw new AppException('provider request failed.');
    }
  }

  /**
   * 获取第三方授权信息
   */
  async oauthUrls() {
    const appDomain = this.configService.get('app.domain');
    const obj = {};
    for (const app of Object.values(['github', 'qq', 'wechat'])) {
      let url = '';
      const redirectUri = encodeURIComponent(
        `https://${appDomain}/oauth/${app}`,
      );
      if (app === 'github') {
        // 读取配置内容
        const clientId = this.configService.get('third.github_client_id');
        url = `https://github.com/login/oauth/authorize?client_id=${clientId}&sate=${Date.now()}&scope=user&redirect_uri=${redirectUri}`;
      } else if (app === 'qq') {
        // 读取配置内容
        const clientId = this.configService.get('third.qq_client_id');
        url = `https://graph.qq.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&state=${Date.now()}&scope=get_user_info&redirect_uri=${redirectUri}`;
      } else if (app === 'wechat') {
        // TODO 微信登录流程如下
        // 1.标记一个scene_key 到redis / 5分钟失效
        // 2.前端确认登录 传入 scene_key / 如果不存在，创建一个新的
        // 3.确认scene_key，创建scene_key对应的二维码信息，返回前台展示
        // 4.前端用户扫码 - > 打开小程序确认 -> 接口通知成功 -> 设置scene_key 登录成功
        // 5.写入用户授权信息一起返回
        // 6.前端轮询得到确认信息，写入token等信息

        // scene 标记，需要处理的
        const scene = `${randomString(16)}`;
        await this.cacheManager.set(
          USER_CACHE_PREFIX + `wechat:${scene}`,
          {
            time: Date.now(),
            data: {},
          },
          60 * 1e3,
        );
        url = scene;
      }
      obj[app] = url;
    }
    return obj;
  }

  /**
   * 获取二维码信息
   * @param scene
   * @param query
   */
  async qrcode(scene: any, query: any) {
    // query 里面有两个action 1.create 2.check
    if (!['create', 'check'].includes(query?.action)) {
      throw new BadRequestException('参数错误!');
    }
    // 查询扫码结果数据
    if (query?.action === 'check') {
      // 读取缓存数据, 里面结果有data : { token, user }
      let cacheData = await this.cacheManager.get(
        USER_CACHE_PREFIX + `wechat:${scene}`,
      );
      if (!cacheData) {
        cacheData = {
          time: Date.now(),
          data: {},
        };
        await this.cacheManager.set(
          USER_CACHE_PREFIX + `wechat:${scene}`,
          cacheData,
          5 * 60 * 1e3,
        );
      }
      return cacheData;
    }
    // 构建二维码数据
    const qrcode = await this.wechatService.getQrcodeUrl(scene);
    return { qrcode };
  }

  /**
   * github 授权
   * @param code
   * @param state
   * @param app
   * @private
   */
  private async githubOAuth(code: string, state?: string, app = 'github') {
    // 读取配置内容
    const clientId = this.configService.get('third.github_client_id');
    const clientSecret = this.configService.get('third.github_client_secret');
    // 1. 通过code 获取access_token
    const tokenResult = await this.clientRequest({
      url: 'https://github.com/login/oauth/access_token',
      method: 'POST',
      data: {
        client_id: clientId, // 申请应用后会有，必填
        client_secret: clientSecret, // 申请应用后会有，必填
        code: code || Date.now(),
      },
    });
    if (tokenResult && tokenResult?.access_token) {
      // 2.通过 access_token取得用户信息
      const { email, id } = await this.clientRequest({
        url: 'https://api.github.com/user',
        method: 'POST',
        data: {
          ...tokenResult,
        },
        headers: {
          Authorization: `Bearer ${tokenResult.access_token}`,
        },
      });
      // 3.得到用户数据，查询或者新增用户内容
      const thirdUser = await this.userService.createOrUpdateThirdUser(app, id);
      // 查找关联用户
      let user: any = await this.userService.getUserByIdOrMail(
        thirdUser?.userId,
        email,
      );
      // 没有用户数据，需要插入新的数据
      if (!user) {
        user = await this.prepareUser(email);
      }
      // 更新third用户userId
      await this.userService.createOrUpdateThirdUser(
        app,
        id,
        user.id,
        tokenResult.access_token,
      );
      // 返回数据
      return user;
    } else {
      throw new BadRequestException(
        `${tokenResult?.error}${tokenResult?.error_description}` ||
          '授权信息获取错误，请重新尝试登录',
      );
    }
  }

  /**
   * QQ 授权
   * @param code
   * @param state
   * @param app
   * @private
   */
  private async qqOAuth(code: string, state?: string, app = 'qq') {
    // 读取配置内容
    const clientId = this.configService.get('third.qq_client_id');
    const clientSecret = this.configService.get('third.qq_client_secret');
    const appDomain = this.configService.get('app.domain');
    // 1. 通过code 获取access_token
    // 读取缓存，
    const tokenResult = await this.clientRequest({
      url: 'https://graph.qq.com/oauth2.0/token',
      method: 'GET',
      params: {
        grant_type: 'authorization_code',
        client_id: clientId, // 申请应用后会有，必填
        client_secret: clientSecret, // 申请应用后会有，必填
        code: code || Date.now(),
        redirect_uri: encodeURIComponent(`https://${appDomain}/oauth/${app}`),
        fmt: 'json',
      },
    });
    if (tokenResult && tokenResult?.access_token) {
      // 2.获取openid
      const openidResult = await this.clientRequest({
        url: 'https://graph.qq.com/oauth2.0/me',
        method: 'GET',
        params: {
          access_token: tokenResult.access_token,
          fmt: 'json',
        },
      });
      if (openidResult && openidResult?.openid) {
        // 3.获取用户信息
        const userInfo = await this.clientRequest({
          url: 'https://graph.qq.com/user/get_user_info',
          method: 'GET',
          params: {
            access_token: tokenResult.access_token,
            oauth_consumer_key: clientId,
            openid: openidResult.openid,
            fmt: 'json',
          },
        });
        if (userInfo && userInfo?.ret == 0) {
          // 3.得到用户数据，查询或者新增用户内容
          const thirdUser = await this.userService.createOrUpdateThirdUser(
            app,
            openidResult?.openid,
          );
          // 查找关联用户
          let user: any = await this.userService.getUserByIdOrMail(
            thirdUser?.userId,
            openidResult?.openid,
          );
          // 没有用户数据，需要插入新的数据
          if (!user) {
            user = await this.prepareUser(openidResult?.openid);
          }
          // 更新third用户userId
          await this.userService.createOrUpdateThirdUser(
            app,
            openidResult?.openid,
            user.id,
            tokenResult.access_token,
          );
          // 返回数据
          return user;
        }
        throw new BadRequestException(
          userInfo?.msg || '授权信息获取错误，请重新尝试登录',
        );
      } else {
        throw new BadRequestException(
          `[${openidResult?.error}] ${openidResult?.error_description}` ||
            '授权信息获取错误，请重新尝试登录',
        );
      }
    } else {
      throw new BadRequestException(
        `[${tokenResult?.error}] ${tokenResult?.error_description}` ||
          '授权信息获取错误，请重新尝试登录',
      );
    }
  }

  /**
   * 前置用户处理
   * @param email
   * @private
   */
  private async prepareUser(email: any) {
    // 模拟验证码
    const mockCode = await this.validationService.send('signup', email, true);
    return await this.signup({
      email,
      passwd: randomString(12),
      code: mockCode,
    });
  }

  /**
   * 用户第三方授权处理
   * @param app  github google qq wechat
   * @param data
   */
  async oauth(app: string, data: any) {
    if (!['github', 'qq', 'wechat'].includes(app)) {
      throw new BadRequestException('app not allowed');
    }
    // 用户数据
    let user: any;
    // 按应用处理
    if (app === 'github') {
      user = await this.githubOAuth(data?.code, data?.state, app);
    } else if (app === 'qq') {
      user = await this.qqOAuth(data?.code, data?.state, app);
    } else {
      throw new BadRequestException('授权信息获取错误，请重新尝试登录');
    }

    // 返回登录信息
    return await this.userSign(user);
  }

  /**
   * 用户sign
   * @param user
   * @private
   */
  private async userSign(user: any) {
    // 检查下userCode是否写入
    // 4.记录userCode
    const userCode = await this.cacheManager.get(
      USER_CACHE_PREFIX + `code:${user.userCode}`,
    );
    if (!userCode) {
      await this.cacheManager.set(USER_CACHE_PREFIX + `code:${user.userCode}`, {
        userId: user.id,
        nickName: user.nickName,
        userCode: user.userCode,
      });
    }
    // 3.生成token
    const subject = {
      sub: user.id,
      username: user.nickName,
      userCode: user.userCode,
      email: user.email,
    };
    return {
      user: plainToInstance(UserInfoDto, user, {
        excludeExtraneousValues: true,
      }),
      token: this.jwtService.sign(subject, {
        expiresIn: '7d',
      }),
    };
  }

  /**
   * 用户登录
   * @param signinDto
   */
  async signin(@Body() signinDto: SigninDto) {
    // 1.校验用户信息 & 校验密码
    const user = await this.userService.getUserByMail(signinDto.email);
    if (user && bcryptCompare(signinDto.passwd, user.passwd)) {
      return await this.userSign(user);
    }
    throw new BadRequestException('邮箱或密码输入错误');
  }

  /**
   * 用户注册
   * @param signupDto
   */
  async signup(signupDto: SignupDto) {
    // 1.验证码校验
    await this.validationService.valid(
      'signup',
      signupDto.email,
      signupDto.code,
    );
    // 2.邮箱存在性校验
    const existUser = await this.userService.getUserByMail(signupDto.email);
    if (existUser) {
      throw new BadRequestException('账户邮箱已存在');
    }
    // 3.数据补全
    // 注册用户数据合并
    const createUserDto = plainToInstance(
      CreateUserDto,
      {
        nickName: signupDto.email,
        ...signupDto,
      },
      {
        excludeExtraneousValues: true,
      },
    );
    try {
      this.logger.debug(`createUserDto => ${JSON.stringify(createUserDto)}`);
      // 4.数据入库
      const userInfo = await this.userService.create(createUserDto);
      // 5.存在推荐者，进行推荐奖励下发
      if (signupDto.invite) {
        const inviteUser = await this.userService.getUserByCode(
          signupDto.invite,
        );
        if (inviteUser) {
          this.logger.debug(`inviteUser => ${JSON.stringify(inviteUser)}`);
          await this.userService.createUserInvitation(
            inviteUser.id,
            userInfo.id,
          );
        }
      }
      return userInfo;
    } catch (e) {
      this.logger.error('signup error:' + e.message);
      throw new BadRequestException('注册失败');
    }
  }

  /**
   * 发送重置密码邮件
   * @param data
   */
  async sendResetEMail(data: SendResetPasswdInputDto) {
    const user = await this.userService.getUserByMail(data?.email);
    if (user?.id) {
      // 下发重置链接
      const appDomain = this.configService.get('app.domain');
      // 构建token记录
      const token = cryptoMd5(Date.now() + cryptoMd5(user.email));
      // 重置链接
      const resetLink = `https://${appDomain}/reset-passwd?token=${token}&email=${user.email}`;

      try {
        const date = dayjs().format('YYYY年MM月DD日');
        const sendMailOptions: ISendMailOptions = {
          to: user?.email,
          subject: `CERTEASY 重置密码通知`,
          template: 'notification.tmpl.ejs',
          //内容部分都是自定义的
          context: {
            content: `<tr>
    <td style="padding: 20px 7.5% 0;">
      您的账号 ${user.email} 正在进行找回密码，请您在<b style="font-size: 16px; line-height:32px;color: #e54545;"> 30 </b>分钟内点击下发链接设置您的新密码：
    </td>
  </tr>
  <tr>
    <td style="padding: 20px 7.5% 0;">
      <a href="${resetLink}" target="_blank" style="line-height: 34px; background-color: #006eff; padding: 1px 30px; color: #fff; display: inline-block;" target="_blank">重置密码</a>
    </td>
  </tr>
  <tr>
  <td style="padding: 20px 7.5% 0;">
    如您上面的链接点击无效，请您复制以下链接至浏览器直接打开。
  </td>
  </tr>
  <td style="padding: 20px 7.5% 0;">
    <a href="${resetLink}" target="_blank">${resetLink}</a>
  </td>
  <tr>
  <td style="padding: 20px 7.5% 0;">
    感谢您的支持，如有疑问请联系客服。
  </td>
  </tr>`,
            date,
          },
        };
        await this.mailerService.sendMail(sendMailOptions);
        // 发送成功，标记token
        await this.cacheManager.set(
          USER_CACHE_PREFIX + `reset:${token}`,
          user,
          30 * 60 * 1e3,
        );
        return '';
      } catch (error) {
        Logger.error(error, 'commSendEmail');
        throw new BadRequestException('邮件发送错误，请稍后再试');
      }
    }
    throw new BadRequestException('邮箱账号信息不存在');
  }

  /**
   * 执行重置密码
   * @param data
   */
  async resetPasswd(data: ResetPasswdInputDto) {
    // 读取token数据
    const resetUser: UserInfoDto = await this.cacheManager.get(
      USER_CACHE_PREFIX + `reset:${data.token}`,
    );
    if (resetUser) {
      // 查询用户并更改
      const user = await this.userService.getUserByIdOrMail(
        resetUser.id,
        resetUser.email,
      );
      if (user && user.status === 1) {
        const updateResult = await this.userService.updatePasswd(
          user,
          { passwd: data.passwd, newPasswd: data.passwd },
          true,
        );
        // 删除记录
        await this.cacheManager.del(USER_CACHE_PREFIX + `reset:${data.token}`);
        // 下发重置链接
        const appDomain = this.configService.get('app.domain');
        // 重置链接
        const signinLink = `https://${appDomain}/signin?resetPasswd=true`;
        try {
          const sendMailOptions: ISendMailOptions = {
            to: user?.email,
            subject: `CERTEASY 密码修改通知`,
            template: 'notification.tmpl.ejs',
            //内容部分都是自定义的
            context: {
              content: `<tr>
    <td style="padding: 20px 7.5% 0;">
      您的账号 ${user.email} 与<b style="color: #333;"> ${dayjs().format(DATE_FORMAT)} </b> 成功修改密码。
    </td>
  </tr>
  <tr>
  <td style="padding: 20px 7.5% 0;">
    如非您本人操作，请尽快 <a href="${signinLink}" style="color:#006eff;" target="_blank">找回密码</a>。
  </td>
  </tr>`,
            },
          };
          await this.mailerService.sendMail(sendMailOptions);
        } catch (err) {
          this.logger.error('sendMailOptions error:' + err.message);
        }
        // TODO 下发修改成功通知
        return updateResult;
      }
      throw new BadRequestException('用户异常，请联系客服进行处理');
    }
    throw new BadRequestException('校验数据失效，请重新获取重置邮件');
  }
}
