import { NextRequest, NextResponse } from "next/server";
import { getServerSideConfig } from "../../config/server";

// Route segment config
export const runtime = "edge";
// Required for static export (Tauri build)
export const dynamic = "force-static";

const serverConfig = getServerSideConfig();

// 处理OPTIONS请求
export async function OPTIONS() {
  return NextResponse.json({ body: "OK" }, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    // 获取access store的配置
    const {
      imgUploadApiUrl,
      imgUploadAuthCode,
      imgUploadChannel,
      imgUploadFolder,
      imgUploadNameType,
      imgUploadReturnFormat,
    } = serverConfig;

    if (!imgUploadApiUrl) {
      console.error("[Upload] 图片上传服务未配置");
      return NextResponse.json(
        { error: "图片上传服务未配置" },
        { status: 400 },
      );
    }

    // 获取上传的文件
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      console.error("[Upload] 未找到上传文件");
      return NextResponse.json({ error: "未找到上传文件" }, { status: 400 });
    }

    console.log("[Upload] 收到文件:", file.name, file.type, file.size);

    // 构建目标URL
    const url = new URL("/upload", imgUploadApiUrl);

    // 添加查询参数 - 只添加有值的参数
    if (imgUploadAuthCode) {
      url.searchParams.set("authCode", imgUploadAuthCode);
    }
    if (imgUploadChannel) {
      url.searchParams.set("uploadChannel", imgUploadChannel);
    }
    if (imgUploadFolder) {
      url.searchParams.set("uploadFolder", imgUploadFolder);
    }
    if (imgUploadNameType) {
      url.searchParams.set("uploadNameType", imgUploadNameType);
    }
    if (imgUploadReturnFormat) {
      url.searchParams.set("returnFormat", imgUploadReturnFormat);
    }

    console.log("[Upload] 目标URL:", url.toString());

    // 创建新的FormData转发到目标服务
    const forwardFormData = new FormData();
    forwardFormData.append("file", file);

    // 转发请求到图床服务
    const response = await fetch(url.toString(), {
      method: "POST",
      body: forwardFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Upload] 图床服务返回错误:", response.status, errorText);
      return NextResponse.json(
        { error: `上传失败: ${response.status}` },
        { status: response.status },
      );
    }

    const result = await response.json();
    console.log("[Upload] 图床服务返回结果:", result);

    // 验证响应格式并提取图片URL
    if (!Array.isArray(result) || !result[0]?.src) {
      return NextResponse.json(
        { error: "图床服务返回格式错误" },
        { status: 500 },
      );
    }

    // 根据 returnFormat 处理图片URL
    let imageUrl: string;
    const src = result[0].src;

    if (imgUploadReturnFormat === "full" || src.startsWith("http")) {
      // 如果设置了full格式或src已经是完整URL，直接使用
      imageUrl = src;
    } else {
      // 否则拼接完整URL
      imageUrl = imgUploadApiUrl.replace(/\/$/, "") + src;
    }

    console.log("[Upload] 成功，图片URL:", imageUrl);

    return NextResponse.json({
      success: true,
      url: imageUrl,
      originalResponse: result,
    });
  } catch (error) {
    console.error("[Upload] 上传过程出错:", error);
    return NextResponse.json({ error: "上传过程出错" }, { status: 500 });
  }
}
