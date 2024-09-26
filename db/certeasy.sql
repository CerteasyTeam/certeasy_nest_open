/*
 Navicat Premium Data Transfer

 Source Server         : 47.76.170.139（certeasy）
 Source Server Type    : MySQL
 Source Server Version : 50743
 Source Host           : 10.147.20.244:3306
 Source Schema         : certeasy

 Target Server Type    : MySQL
 Target Server Version : 50743
 File Encoding         : 65001

 Date: 26/09/2024 16:02:51
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for ce_certificate
-- ----------------------------
DROP TABLE IF EXISTS `ce_certificate`;
CREATE TABLE `ce_certificate`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NULL DEFAULT NULL COMMENT '所属用户',
  `dns_server_id` int(11) NULL DEFAULT NULL COMMENT '关联dns',
  `cert_agency` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '证书机构',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '证书名称',
  `domains` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '域名组',
  `alias` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '别名',
  `type` tinyint(1) NULL DEFAULT 1 COMMENT '申请类型 1 单域名 2 多域名 3 泛域名',
  `auth_mode` tinyint(1) NULL DEFAULT 1 COMMENT ' 1 文件验证 2 文件代理 3 DNS验证 4 代理DNS  ',
  `auto_notify` tinyint(1) NULL DEFAULT 1 COMMENT '自动通知',
  `notify_days_in_advance` int(10) NULL DEFAULT 15 COMMENT '提前n天通知',
  `auto_update` tinyint(1) NULL DEFAULT 1 COMMENT '自动更新',
  `update_days_in_advance` int(10) NULL DEFAULT 7 COMMENT '提前n天更新',
  `auto_push` tinyint(1) NULL DEFAULT 1 COMMENT '自动推送',
  `latest_version_id` int(11) NULL DEFAULT NULL COMMENT '最新版本',
  `latest_valid_version_id` int(11) NULL DEFAULT NULL COMMENT '最新激活版本',
  `status` tinyint(1) NULL DEFAULT 1 COMMENT '状态 0 失败 1 申请中  2 已颁发 3 已过期 4吊销',
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of ce_certificate
-- ----------------------------

-- ----------------------------
-- Table structure for ce_certificate_account
-- ----------------------------
DROP TABLE IF EXISTS `ce_certificate_account`;
CREATE TABLE `ce_certificate_account`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `certificate_id` int(11) NULL DEFAULT NULL COMMENT '所属证书',
  `contact` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '邮箱',
  `key` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '密钥',
  `url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '账户url',
  `directory` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'directory',
  `status` tinyint(1) NULL DEFAULT 1 COMMENT '状态',
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of ce_certificate_account
-- ----------------------------

-- ----------------------------
-- Table structure for ce_certificate_detail
-- ----------------------------
DROP TABLE IF EXISTS `ce_certificate_detail`;
CREATE TABLE `ce_certificate_detail`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `certificate_version_id` int(11) NULL DEFAULT NULL COMMENT '所属版本',
  `subject` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '主题信息',
  `subjectaltname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '别名',
  `bits` int(10) NULL DEFAULT 2048 COMMENT 'bits长度',
  `serial_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '序列号',
  `issuer` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '签发信息',
  `fingerprint` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'SHA1指纹',
  `fingerprint256` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'SHA256指纹',
  `valid_from` datetime NULL DEFAULT NULL COMMENT '颁发日期',
  `valid_to` datetime NULL DEFAULT NULL COMMENT '截至日期',
  `key` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '私钥',
  `certificate` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '证书',
  `issuer_certificate` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '签发证书',
  `status` tinyint(1) NULL DEFAULT 1 COMMENT '状态',
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of ce_certificate_detail
-- ----------------------------

-- ----------------------------
-- Table structure for ce_certificate_version
-- ----------------------------
DROP TABLE IF EXISTS `ce_certificate_version`;
CREATE TABLE `ce_certificate_version`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `certificate_id` int(11) NULL DEFAULT NULL COMMENT '关联证书',
  `error` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '错误信息',
  `retry_times` tinyint(1) NULL DEFAULT 1 COMMENT '重试次数',
  `expired_time` datetime NULL DEFAULT NULL COMMENT '过期时间',
  `revoked_time` datetime NULL DEFAULT NULL COMMENT '吊销时间',
  `status` tinyint(1) NULL DEFAULT NULL COMMENT '状态 0 失败 1 申请中  2 已颁发 3 已过期 4 吊销',
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of ce_certificate_version
-- ----------------------------

-- ----------------------------
-- Table structure for ce_cloud
-- ----------------------------
DROP TABLE IF EXISTS `ce_cloud`;
CREATE TABLE `ce_cloud`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NULL DEFAULT NULL COMMENT '所属用户',
  `provider_id` int(11) NULL DEFAULT NULL COMMENT '云资源id',
  `provider_product_id` int(11) NULL DEFAULT NULL COMMENT '资源产品id',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '名称',
  `alias` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '别名',
  `accessJson` json NULL COMMENT '云资源配置',
  `status` tinyint(1) NULL DEFAULT 1 COMMENT '状态 0 失败 1 部署中',
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of ce_cloud
-- ----------------------------

-- ----------------------------
-- Table structure for ce_cloud_certificate
-- ----------------------------
DROP TABLE IF EXISTS `ce_cloud_certificate`;
CREATE TABLE `ce_cloud_certificate`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cloud_id` int(11) NULL DEFAULT NULL COMMENT '资源id',
  `certificate_id` int(11) NULL DEFAULT NULL COMMENT '证书id',
  `status` tinyint(1) NULL DEFAULT 1,
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of ce_cloud_certificate
-- ----------------------------

-- ----------------------------
-- Table structure for ce_cloud_deploy
-- ----------------------------
DROP TABLE IF EXISTS `ce_cloud_deploy`;
CREATE TABLE `ce_cloud_deploy`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `cloud_certificate_id` int(11) NULL DEFAULT NULL COMMENT '云资源证书id',
  `error` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '错误信息',
  `status` tinyint(1) NULL DEFAULT 1 COMMENT '状态 0 失败 1 部署中 2 部署成功',
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of ce_cloud_deploy
-- ----------------------------

-- ----------------------------
-- Table structure for ce_cloud_provider
-- ----------------------------
DROP TABLE IF EXISTS `ce_cloud_provider`;
CREATE TABLE `ce_cloud_provider`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '名称',
  `alias` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '别称',
  `logo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'logo',
  `status` tinyint(1) NULL DEFAULT 1,
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 7 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of ce_cloud_provider
-- ----------------------------
INSERT INTO `ce_cloud_provider` VALUES (1, 'aliyun', '阿里云', 'https://cdn.certeasy.cn/provider/aliyun.png', 1, '2024-07-17 18:10:41', '2024-09-07 19:19:23');
INSERT INTO `ce_cloud_provider` VALUES (2, 'qcloud', '腾讯云', 'https://cdn.certeasy.cn/provider/qcloud.png', 1, '2024-08-13 16:27:46', '2024-09-07 19:19:25');
INSERT INTO `ce_cloud_provider` VALUES (3, 'qiniu', '七牛云', 'https://cdn.certeasy.cn/provider/qiniu.png', 1, '2024-08-13 16:27:58', '2024-09-07 19:19:28');
INSERT INTO `ce_cloud_provider` VALUES (4, 'bt', '宝塔面板', 'https://cdn.certeasy.cn/provider/bt.png', 1, '2024-08-13 16:28:10', '2024-09-07 19:19:30');
INSERT INTO `ce_cloud_provider` VALUES (5, 'webhook', 'Webhook', 'https://cdn.certeasy.cn/provider/webhook.png', 1, '2024-08-13 16:28:21', '2024-09-07 19:19:32');
INSERT INTO `ce_cloud_provider` VALUES (6, 'api', 'API', 'https://pub-oss.certeasy.cn/provider/api.png', 0, '2024-08-13 16:40:15', '2024-09-02 16:44:08');

-- ----------------------------
-- Table structure for ce_cloud_provider_product
-- ----------------------------
DROP TABLE IF EXISTS `ce_cloud_provider_product`;
CREATE TABLE `ce_cloud_provider_product`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `provider_id` int(11) NULL DEFAULT NULL COMMENT '供应商ID',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '名称',
  `alias` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '别称',
  `configJson` json NULL COMMENT '配置数据',
  `pushable` tinyint(1) NULL DEFAULT 1 COMMENT '允许同步',
  `status` tinyint(1) NULL DEFAULT 1 COMMENT '状态',
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 13 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of ce_cloud_provider_product
-- ----------------------------
INSERT INTO `ce_cloud_provider_product` VALUES (1, 1, 'SSL', 'SSL(证书管理)', '{\"name\": \"aliyun\", \"fields\": [{\"name\": \"Access Key ID\", \"type\": \"text\", \"field\": \"accessKeyId\"}, {\"name\": \"Access Key Secret\", \"type\": \"password\", \"field\": \"accessKeySecret\"}], \"helpUrl\": \"https:///docs.certeasy.cn/cloud/aliyun/ssl\"}', 1, 1, '2024-07-17 18:10:41', '2024-09-09 09:51:31');
INSERT INTO `ce_cloud_provider_product` VALUES (2, 1, 'CDN', 'CDN', '{\"name\": \"aliyun\", \"fields\": [{\"name\": \"Access Key ID\", \"type\": \"text\", \"field\": \"accessKeyId\"}, {\"name\": \"Access Key Secret\", \"type\": \"password\", \"field\": \"accessKeySecret\"}, {\"name\": \"CDN 域名\", \"type\": \"INPUT\", \"field\": \"domain\"}], \"helpUrl\": \"https:///docs.certeasy.cn/cloud/aliyun/cdn\"}', 1, 1, '2024-08-05 23:40:00', '2024-09-02 15:04:30');
INSERT INTO `ce_cloud_provider_product` VALUES (3, 1, 'DCDN', 'DCDN（全站加速）', '{\"name\": \"aliyun\", \"fields\": [{\"name\": \"Access Key ID\", \"type\": \"text\", \"field\": \"accessKeyId\"}, {\"name\": \"Access Key Secret\", \"type\": \"password\", \"field\": \"accessKeySecret\"}, {\"name\": \"DCDN 域名\", \"type\": \"text\", \"field\": \"domain\"}], \"helpUrl\": \"https://docs.certeasy.cn/cloud/aliyun/dcdn\"}', 1, 1, '2024-08-26 10:31:22', '2024-09-02 15:04:35');
INSERT INTO `ce_cloud_provider_product` VALUES (4, 2, 'SSL', 'SSL', '{\"name\": \"qcloud\", \"fields\": [{\"name\": \"Secret ID\", \"type\": \"text\", \"field\": \"secretId\"}, {\"name\": \"Secret Key\", \"type\": \"password\", \"field\": \"secretKey\"}], \"helpUrl\": \"https://docs.certeasy.cn/cloud/qcloud/ssl\"}', 1, 1, '2024-07-17 18:10:41', '2024-09-09 09:51:36');
INSERT INTO `ce_cloud_provider_product` VALUES (5, 2, 'CDN', 'CDN', '{\"name\": \"qcloud\", \"fields\": [{\"name\": \"Secret ID\", \"type\": \"text\", \"field\": \"secretId\"}, {\"name\": \"Secret Key\", \"type\": \"password\", \"field\": \"secretKey\"}, {\"name\": \"CDN 域名\", \"type\": \"text\", \"field\": \"domain\"}], \"helpUrl\": \"https://docs.certeasy.cn/cloud/qcloud/cdn\"}', 1, 1, '2024-07-17 18:10:41', '2024-09-02 15:04:47');
INSERT INTO `ce_cloud_provider_product` VALUES (6, 3, 'SSL', 'SSL', '{\"name\": \"qnssl\", \"fields\": [{\"name\": \"AK（AccessKey）\", \"type\": \"text\", \"field\": \"accessKey\"}, {\"name\": \"SK（SecretKey）\", \"type\": \"password\", \"field\": \"secretKey\"}], \"helpUrl\": \"https:///docs.certeasy.cn/cloud/qiniu/ssl\"}', 1, 1, '2024-08-05 23:40:00', '2024-09-02 15:04:52');
INSERT INTO `ce_cloud_provider_product` VALUES (7, 3, 'CDN', 'CDN', '{\"name\": \"qncdn\", \"fields\": [{\"name\": \"AK（AccessKey）\", \"type\": \"text\", \"field\": \"accessKey\"}, {\"name\": \"SK（SecretKey）\", \"type\": \"password\", \"field\": \"secretKey\"}, {\"name\": \"CDN 域名\", \"type\": \"text\", \"field\": \"domain\"}], \"helpUrl\": \"https:///docs.certeasy.cn/cloud/qiniu/cdn\"}', 1, 1, '2024-08-13 16:36:06', '2024-09-02 15:04:57');
INSERT INTO `ce_cloud_provider_product` VALUES (8, 4, 'WEB', '网站SSL', '{\"name\": \"btssl\", \"tips\": [\"请将Certeasy服务器IP地址加入白名单: 47.76.170.139\"], \"fields\": [{\"name\": \"宝塔面板地址\", \"type\": \"text\", \"field\": \"panel\", \"placeholder\": \"请输入面板地址，示例：https://192.168.1.1:12580/ ，仅包含协议、域名或IP、端口号部分\"}, {\"name\": \"接口密钥\", \"type\": \"password\", \"field\": \"token\"}, {\"name\": \"网站项目类型\", \"type\": \"select\", \"field\": \"projectType\", \"options\": [{\"label\": \"PHP项目\", \"value\": \"php\"}, {\"label\": \"Java项目\", \"value\": \"java\"}, {\"label\": \"Node项目\", \"value\": \"nodejs\"}, {\"label\": \"Go项目\", \"value\": \"go\"}, {\"label\": \"Python项目\", \"value\": \"python\"}, {\"label\": \"其他项目\", \"value\": \"other\"}]}, {\"name\": \"网站名或项目名称\", \"type\": \"text\", \"field\": \"siteName\"}], \"default\": {\"ProjectType\": \"php\"}, \"helpUrl\": \"https://docs.certeasy.cn/cloud/bt/web\"}', 1, 1, '2024-08-13 16:36:20', '2024-09-07 19:19:43');
INSERT INTO `ce_cloud_provider_product` VALUES (9, 4, 'PANEL', '面板SSL', '{\"name\": \"bt\", \"tips\": [\"请将Certeasy服务器IP地址加入白名单: 47.76.170.139\"], \"fields\": [{\"name\": \"宝塔面板地址\", \"type\": \"text\", \"field\": \"panel\", \"placeholder\": \"请输入面板地址，示例：https://192.168.1.1:12580/ ，仅包含协议、域名或IP、端口号部分\"}, {\"name\": \"接口密钥\", \"type\": \"password\", \"field\": \"token\"}], \"helpUrl\": \"https://docs.certeasy.cn/cloud/bt/panel\"}', 1, 1, '2024-08-13 16:36:33', '2024-09-07 19:19:49');
INSERT INTO `ce_cloud_provider_product` VALUES (10, 5, 'WEBHOOK', 'WEBHOOK', '{\"name\": \"webhook\", \"fields\": [{\"name\": \"回调地址\", \"type\": \"text\", \"field\": \"url\"}, {\"name\": \"回调令牌\", \"type\": \"random\", \"field\": \"token\"}], \"helpUrl\": \"https://docs.certeasy.cn/cloud/webhook.html\"}', 1, 1, '2024-08-13 16:36:49', '2024-09-13 21:46:11');
INSERT INTO `ce_cloud_provider_product` VALUES (11, 6, 'API', 'API密钥', '{\"name\": \"api\", \"fields\": [{\"name\": \"API密钥\", \"type\": \"random\", \"field\": \"key\"}], \"helpUrl\": \"https://docs.certeasy.cn/cloud/api/api\"}', 1, 1, '2024-08-13 16:40:02', '2024-09-02 15:05:18');
INSERT INTO `ce_cloud_provider_product` VALUES (12, 1, 'OSS', 'OSS（对象存储）', '{\"name\": \"aliyun\", \"fields\": [{\"name\": \"accessKeyId\", \"type\": \"password\", \"field\": \"AccessKey Id\"}, {\"name\": \"AccessKey Secret\", \"type\": \"password\", \"field\": \"accessKeySecret\"}, {\"name\": \"OSS Bucket Name\", \"type\": \"text\", \"field\": \"bucketName\"}, {\"name\": \"OSS Bucket Domain\", \"type\": \"text\", \"field\": \"bucketDomain\"}, {\"name\": \"OSS Bucket Region\", \"type\": \"select\", \"field\": \"bucketRegionId\", \"options\": [{\"label\": \"华东1（杭州）\", \"value\": \"cn-hangzhou\"}, {\"label\": \"华东2（上海）\", \"value\": \"cn-shanghai\"}, {\"label\": \"华东5（南京-本地地域）\", \"value\": \"cn-nanjing\"}, {\"label\": \"华东6（福州-本地地域）\", \"value\": \"cn-fuzhou\"}, {\"label\": \"华中1（武汉-本地地域）\", \"value\": \"cn-wuhan\"}, {\"label\": \"华北1（青岛）\", \"value\": \"cn-qingdao\"}, {\"label\": \"华北2（北京）\", \"value\": \"cn-beijing\"}, {\"label\": \"华北3（张家口）\", \"value\": \"cn-zhangjiakou\"}, {\"label\": \"华北5（呼和浩特）\", \"value\": \"cn-huhehaote\"}, {\"label\": \"华北6（乌兰察布）\", \"value\": \"cn-wulanchabu\"}, {\"label\": \"华南1（深圳）\", \"value\": \"cn-shenzhen\"}, {\"label\": \"华南2（河源）\", \"value\": \"cn-heyuan\"}, {\"label\": \"华南3（广州）\", \"value\": \"cn-guangzhou\"}, {\"label\": \"西南1（成都）\", \"value\": \"cn-chengdu\"}, {\"label\": \"中国（香港）\", \"value\": \"cn-hongkong\"}, {\"label\": \"美国（硅谷）\", \"value\": \"us-west-1\"}, {\"label\": \"美国（弗吉尼亚）\", \"value\": \"us-east-1\"}, {\"label\": \"日本（东京）\", \"value\": \"ap-northeast-1\"}, {\"label\": \"韩国（首尔）\", \"value\": \"ap-northeast-2\"}, {\"label\": \"新加坡\", \"value\": \"ap-southeast-1\"}, {\"label\": \"澳大利亚（悉尼）\", \"value\": \"ap-southeast-2\"}, {\"label\": \"马来西亚（吉隆坡）\", \"value\": \"ap-southeast-3\"}, {\"label\": \"印度尼西亚（雅加达）\", \"value\": \"ap-southeast-5\"}, {\"label\": \"菲律宾（马尼拉）\", \"value\": \"ap-southeast-6\"}, {\"label\": \"泰国（曼谷）\", \"value\": \"ap-southeast-7\"}, {\"label\": \"印度（孟买）\", \"value\": \"ap-south-1\"}, {\"label\": \"德国（法兰克福）\", \"value\": \"eu-central-1\"}, {\"label\": \"英国（伦敦）\", \"value\": \"eu-west-1\"}, {\"label\": \"阿联酋（迪拜）\", \"value\": \"me-east-1\"}, {\"label\": \"无地域属性（中国内地）\", \"value\": \"rg-china-mainland\"}]}], \"helpUrl\": \"https://docs.certeasy.cn/cloud/aliyun/oss\"}', 1, 1, '2024-08-05 23:40:00', '2024-09-07 19:42:08');

-- ----------------------------
-- Table structure for ce_coin
-- ----------------------------
DROP TABLE IF EXISTS `ce_coin`;
CREATE TABLE `ce_coin`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '产品名称',
  `coin` decimal(10, 0) NOT NULL COMMENT '金币',
  `price` decimal(10, 2) NOT NULL DEFAULT 0.00 COMMENT '单价',
  `gift_coin` decimal(10, 0) NOT NULL DEFAULT 0 COMMENT '赠送',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '状态 0 不可用 1 可用',
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 8 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of ce_coin
-- ----------------------------
INSERT INTO `ce_coin` VALUES (1, '500金币', 500, 5.00, 0, 1, '2024-07-31 11:55:20', '2024-07-31 11:55:20');
INSERT INTO `ce_coin` VALUES (2, '1000金币', 1000, 10.00, 0, 1, '2024-07-31 11:55:29', '2024-07-31 11:55:29');
INSERT INTO `ce_coin` VALUES (3, '2000金币', 2000, 20.00, 50, 1, '2024-07-31 11:57:23', '2024-07-31 11:58:30');
INSERT INTO `ce_coin` VALUES (4, '5000金币', 5000, 50.00, 100, 1, '2024-07-31 11:57:35', '2024-07-31 11:58:24');
INSERT INTO `ce_coin` VALUES (5, '10000金币', 10000, 100.00, 500, 1, '2024-07-31 11:58:09', '2024-07-31 11:58:21');
INSERT INTO `ce_coin` VALUES (6, '200000金币', 200000, 2000.00, 1000, 1, '2024-07-31 11:58:49', '2024-07-31 11:58:57');
INSERT INTO `ce_coin` VALUES (7, '10金币', 10, 0.10, 0, 1, '2024-09-06 10:03:59', '2024-09-06 10:04:04');

-- ----------------------------
-- Table structure for ce_coin_transaction
-- ----------------------------
DROP TABLE IF EXISTS `ce_coin_transaction`;
CREATE TABLE `ce_coin_transaction`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT '用户id',
  `coin_id` int(11) NOT NULL COMMENT '产品id',
  `out_trade_no` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '交易订单号',
  `subject` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '交易主题',
  `body` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '交易内容',
  `price` decimal(10, 2) NOT NULL DEFAULT 0.00 COMMENT '单价',
  `amount` decimal(10, 2) NOT NULL DEFAULT 0.00 COMMENT '金额',
  `coin` decimal(10, 0) NOT NULL DEFAULT 0 COMMENT '购买金币',
  `paid_time` datetime NULL DEFAULT NULL COMMENT '支付时间',
  `status` tinyint(1) NOT NULL DEFAULT 0 COMMENT '状态 -1 关闭 0 待支付 1 已支付',
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of ce_coin_transaction
-- ----------------------------

-- ----------------------------
-- Table structure for ce_config
-- ----------------------------
DROP TABLE IF EXISTS `ce_config`;
CREATE TABLE `ce_config`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '配置名称',
  `kay` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '配置键',
  `value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '配置值',
  `status` tinyint(1) NULL DEFAULT 1 COMMENT '状态',
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of ce_config
-- ----------------------------

-- ----------------------------
-- Table structure for ce_dns
-- ----------------------------
DROP TABLE IF EXISTS `ce_dns`;
CREATE TABLE `ce_dns`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NULL DEFAULT NULL COMMENT '关联用户',
  `provider_id` int(11) NULL DEFAULT NULL COMMENT '所属供应商',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '名称',
  `alias` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '别名',
  `accessJson` json NULL COMMENT '配置信息',
  `status` tinyint(1) NULL DEFAULT 1 COMMENT '状态',
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of ce_dns
-- ----------------------------

-- ----------------------------
-- Table structure for ce_dns_provider
-- ----------------------------
DROP TABLE IF EXISTS `ce_dns_provider`;
CREATE TABLE `ce_dns_provider`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '名称',
  `logo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'logo',
  `configJson` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '配置数据',
  `status` tinyint(1) NULL DEFAULT 1,
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of ce_dns_provider
-- ----------------------------
INSERT INTO `ce_dns_provider` VALUES (1, '阿里云', 'https://cdn.certeasy.cn/provider/aliyun.png', '{\"name\":\"aliyun\",\"fields\":[{\"name\":\"Access Key ID\",\"type\":\"text\",\"field\":\"accessKeyId\"},{\"name\":\"Access Key Secret\",\"type\":\"password\",\"field\":\"accessKeySecret\"}],\"helpUrl\":\"https://docs.certeasy.cn/dns/aliyun\"}', 1, '2024-07-17 18:10:41', '2024-09-07 19:20:02');
INSERT INTO `ce_dns_provider` VALUES (2, 'DnsPod.cn（腾讯云）', 'https://cdn.certeasy.cn/provider/dnspod.png', '{\"name\": \"qcloud\", \"fields\": [{\"name\": \"Secret ID\", \"type\": \"text\", \"field\": \"secretId\"}, {\"name\": \"Secret Key\", \"type\": \"password\", \"field\": \"secretKey\"}], \"helpUrl\": \"https://docs.certeasy.cn/dns/qcloud\"}', 1, '2024-07-17 18:10:41', '2024-09-07 19:20:04');

-- ----------------------------
-- Table structure for ce_message
-- ----------------------------
DROP TABLE IF EXISTS `ce_message`;
CREATE TABLE `ce_message`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT '接收用户',
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '标题',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '内容',
  `status` tinyint(1) NOT NULL DEFAULT 0 COMMENT '0 未读 1 已读',
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of ce_message
-- ----------------------------

-- ----------------------------
-- Table structure for ce_notification
-- ----------------------------
DROP TABLE IF EXISTS `ce_notification`;
CREATE TABLE `ce_notification`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '名称',
  `status` tinyint(1) NULL DEFAULT 1 COMMENT '状态',
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 7 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of ce_notification
-- ----------------------------
INSERT INTO `ce_notification` VALUES (1, '证书即将到期通知', 1, '2024-07-26 10:02:02', '2024-08-30 10:53:16');
INSERT INTO `ce_notification` VALUES (2, '证书更新结果通知', 1, '2024-08-30 10:53:21', '2024-08-30 10:53:21');
INSERT INTO `ce_notification` VALUES (3, '证书监控异常通知', 1, '2024-08-30 10:53:26', '2024-08-30 10:53:26');
INSERT INTO `ce_notification` VALUES (4, '余额不足通知', 1, '2024-08-30 10:53:37', '2024-08-30 10:53:37');
INSERT INTO `ce_notification` VALUES (5, '云资源部署结果通知', 1, '2024-08-30 10:53:50', '2024-08-30 10:53:57');
INSERT INTO `ce_notification` VALUES (6, '金币充值结果通知', 1, '2024-08-30 10:53:54', '2024-08-30 10:54:14');

-- ----------------------------
-- Table structure for ce_notification_channel
-- ----------------------------
DROP TABLE IF EXISTS `ce_notification_channel`;
CREATE TABLE `ce_notification_channel`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NULL DEFAULT NULL COMMENT '关联用户',
  `provider_id` int(11) NULL DEFAULT NULL COMMENT '所属供应商',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '名称',
  `alias` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '别名',
  `accessJson` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '配置信息',
  `status` tinyint(1) NULL DEFAULT 1 COMMENT '状态',
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of ce_notification_channel
-- ----------------------------

-- ----------------------------
-- Table structure for ce_notification_config
-- ----------------------------
DROP TABLE IF EXISTS `ce_notification_config`;
CREATE TABLE `ce_notification_config`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NULL DEFAULT NULL COMMENT '关联用户',
  `notification_id` int(11) NULL DEFAULT NULL COMMENT '通知',
  `channel_ids` json NULL COMMENT '通知渠道列表',
  `status` tinyint(1) NULL DEFAULT 1 COMMENT '状态',
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of ce_notification_config
-- ----------------------------

-- ----------------------------
-- Table structure for ce_notification_provider
-- ----------------------------
DROP TABLE IF EXISTS `ce_notification_provider`;
CREATE TABLE `ce_notification_provider`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '名称',
  `logo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'logo',
  `configJson` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '配置数据',
  `status` tinyint(1) NULL DEFAULT 1,
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of ce_notification_provider
-- ----------------------------
INSERT INTO `ce_notification_provider` VALUES (1, '邮箱', 'https://cdn.certeasy.cn/provider/mail.png', '{\"name\":\"email\",\"fields\":[{\"name\":\"邮箱\",\"type\":\"text\",\"field\":\"email\"}]}', 1, '2024-07-26 09:55:45', '2024-09-09 09:53:19');
INSERT INTO `ce_notification_provider` VALUES (2, '钉钉机器人', 'https://cdn.certeasy.cn/provider/dingtalk.png', '{\"name\":\"dingding\",\"fields\":[{\"name\":\"Webhook地址\",\"type\":\"text\",\"field\":\"url\"},{\"name\":\"加签密钥\",\"type\":\"password\",\"field\":\"secretKey\"}],\"helpUrl\":\"https://developers.dingtalk.com/document/robots/custom-robot-access\"}', 1, '2024-07-26 09:56:24', '2024-09-09 09:53:21');
INSERT INTO `ce_notification_provider` VALUES (3, '企业微信机器人', 'https://cdn.certeasy.cn/provider/qyapi.png', '{\"name\":\"wecom\",\"fields\":[{\"name\":\"Webhook地址\",\"type\":\"text\",\"field\":\"url\"}],\"helpUrl\":\"https://open.work.weixin.qq.com/help2/pc/14931\"}', 1, '2024-07-26 09:56:55', '2024-09-09 09:53:23');
INSERT INTO `ce_notification_provider` VALUES (4, 'Webhook', 'https://cdn.certeasy.cn/provider/webhook.png', '{\"name\": \"webhook\", \"fields\": [{\"name\": \"回调地址\", \"type\": \"text\", \"field\": \"url\"}, {\"name\": \"回调令牌\", \"type\": \"random\", \"field\": \"token\"}], \"helpUrl\": \"https://docs.sslpool.cn/cloud/webhook/webhook\"}', 1, '2024-08-30 10:47:51', '2024-09-09 09:53:26');

-- ----------------------------
-- Table structure for ce_third_user
-- ----------------------------
DROP TABLE IF EXISTS `ce_third_user`;
CREATE TABLE `ce_third_user`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int(10) NULL DEFAULT NULL COMMENT '关联用户',
  `third_user_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'third_user_id',
  `third_type` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'third_type‌',
  `access_token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'access_token',
  `refresh_token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'refresh_token',
  `expired_time` datetime NULL DEFAULT NULL COMMENT 'expired_time',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '0 1 2',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `unique_third_user_id`(`third_user_id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of ce_third_user
-- ----------------------------

-- ----------------------------
-- Table structure for ce_user
-- ----------------------------
DROP TABLE IF EXISTS `ce_user`;
CREATE TABLE `ce_user`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '编码',
  `nick_name` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '昵称',
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '邮箱',
  `passwd` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '密码',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '0 1 2',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `unique_email`(`email`) USING BTREE,
  UNIQUE INDEX `unique_user_code`(`user_code`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of ce_user
-- ----------------------------

-- ----------------------------
-- Table structure for ce_user_coin
-- ----------------------------
DROP TABLE IF EXISTS `ce_user_coin`;
CREATE TABLE `ce_user_coin`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT '所属用户',
  `coin` decimal(10, 0) NOT NULL COMMENT '用户金币',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '状态',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of ce_user_coin
-- ----------------------------

-- ----------------------------
-- Table structure for ce_user_coin_transaction
-- ----------------------------
DROP TABLE IF EXISTS `ce_user_coin_transaction`;
CREATE TABLE `ce_user_coin_transaction`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT '所属用户',
  `type` tinyint(1) NOT NULL COMMENT '类型',
  `coin` decimal(10, 0) NOT NULL COMMENT '金币',
  `coin_after` decimal(10, 0) NOT NULL COMMENT '交易之后',
  `remark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '备注',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '状态',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of ce_user_coin_transaction
-- ----------------------------

-- ----------------------------
-- Table structure for ce_user_invitation
-- ----------------------------
DROP TABLE IF EXISTS `ce_user_invitation`;
CREATE TABLE `ce_user_invitation`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL COMMENT '所属用户',
  `signup_id` int(11) NOT NULL COMMENT '注册用户',
  `coin` decimal(10, 0) NOT NULL DEFAULT 0 COMMENT '金币奖励',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT '状态',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of ce_user_invitation
-- ----------------------------

-- ----------------------------
-- Table structure for ce_watch
-- ----------------------------
DROP TABLE IF EXISTS `ce_watch`;
CREATE TABLE `ce_watch`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NULL DEFAULT NULL COMMENT '所属用户',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '名称',
  `alias` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '别名',
  `error` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '错误信息',
  `domain` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '域名',
  `ip` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'IP',
  `port` int(6) NULL DEFAULT 443 COMMENT '监听端口',
  `auto_notify` tinyint(1) NULL DEFAULT 1 COMMENT '自动通知',
  `notify_days_in_advance` int(10) NULL DEFAULT 20 COMMENT '提前n天通知',
  `latest_record_id` int(11) NULL DEFAULT NULL COMMENT '最新记录',
  `status` tinyint(1) NULL DEFAULT 1 COMMENT '状态',
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of ce_watch
-- ----------------------------

-- ----------------------------
-- Table structure for ce_watch_certificate
-- ----------------------------
DROP TABLE IF EXISTS `ce_watch_certificate`;
CREATE TABLE `ce_watch_certificate`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `subject` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '主题信息',
  `subjectaltname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '别名',
  `bits` int(10) NULL DEFAULT 2048 COMMENT 'bits长度',
  `serial_number` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '序列号',
  `issuer` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '签发信息',
  `modulus` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT 'modules',
  `pubkey` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '公钥',
  `exponent` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'exponent',
  `fingerprint` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'SHA1指纹',
  `fingerprint256` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'SHA256指纹',
  `valid_from` datetime NULL DEFAULT NULL COMMENT '颁发日期',
  `valid_to` datetime NULL DEFAULT NULL COMMENT '截至日期',
  `revoked_time` datetime NULL DEFAULT NULL COMMENT '吊销时间',
  `certificate_in_pem` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '证书pem',
  `issuer_certificate_in_pem` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '签发证书pem',
  `status` tinyint(1) NULL DEFAULT 1 COMMENT '状态',
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of ce_watch_certificate
-- ----------------------------

-- ----------------------------
-- Table structure for ce_watch_record
-- ----------------------------
DROP TABLE IF EXISTS `ce_watch_record`;
CREATE TABLE `ce_watch_record`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `watch_id` int(11) NULL DEFAULT NULL COMMENT '监听id',
  `watch_certificate_id` int(11) NULL DEFAULT NULL COMMENT '监听证书id',
  `ocsp_status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'ocspStatus',
  `error` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '错误信息',
  `retry_times` int(11) NULL DEFAULT 0 COMMENT '重试次数',
  `status` tinyint(1) NULL DEFAULT 1 COMMENT '状态 0 错误 1 进行中 2 监听中 ',
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of ce_watch_record
-- ----------------------------

SET FOREIGN_KEY_CHECKS = 1;
