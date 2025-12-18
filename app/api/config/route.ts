import { NextResponse } from "next/server";

import { getServerSideConfig, getSidebarConfig } from "../../config/server";
import { getBuildConfig } from "../../config/build";

const serverConfig = getServerSideConfig();
const siderbarConfig = getSidebarConfig();
const buildConfig = getBuildConfig();

// Danger! Do not hard code any secret value here!
// 警告！不要在这里写入任何敏感信息！
const DANGER_CONFIG = {
  needCode: serverConfig.needCode,
  hideUserApiKey: serverConfig.hideUserApiKey,
  disableGPT4: serverConfig.disableGPT4,
  hideBalanceQuery: serverConfig.hideBalanceQuery,
  disableFastLink: serverConfig.disableFastLink,
  customModels: serverConfig.customModels,
  defaultModel: serverConfig.defaultModel,
  visionModels: serverConfig.visionModels,
  compressModel: serverConfig.compressModel,
  customHello: serverConfig.customHello,
  UnauthorizedInfo: serverConfig.UnauthorizedInfo,
  iconPosition: serverConfig.iconPosition,
  // translateModel: serverConfig.translateModel,
  textProcessModel: serverConfig.textProcessModel,
  ocrModel: serverConfig.ocrModel,
  sidebarTitle: siderbarConfig.title,
  sidebarSubTitle: siderbarConfig.subTitle,
  siteTitle: siderbarConfig.siteTitle,
  selectLabels: serverConfig.selectLabels,
  modelParams: serverConfig.modelParams,
  // imageBed config
  imgUploadApiUrl: serverConfig.imgUploadApiUrl,
  // 用于版本检测
  buildId: buildConfig.buildId,
};

declare global {
  type DangerConfig = typeof DANGER_CONFIG;
}

async function handle() {
  return NextResponse.json(DANGER_CONFIG);
}

export const GET = handle;
export const POST = handle;

export const runtime = "edge";
