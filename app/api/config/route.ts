import { NextResponse } from "next/server";

import { getServerSideConfig, getSidebarConfig } from "../../config/server";

const serverConfig = getServerSideConfig();
const siderbarConfig = getSidebarConfig();

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
