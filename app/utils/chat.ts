import { CACHE_URL_PREFIX, UPLOAD_URL } from "@/app/constant";
import { RequestMessage, UploadFile } from "@/app/client/api";
import {
  readFileContent,
  getMessageTextContentWithoutThinkingFromContent,
} from "@/app/utils";
import mammoth from "mammoth";

export function compressImage(file: Blob, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent: any) => {
      const image = new Image();
      image.onload = () => {
        let canvas = document.createElement("canvas");
        let ctx = canvas.getContext("2d");
        let width = image.width;
        let height = image.height;
        let quality = 0.9;
        let dataUrl;

        do {
          canvas.width = width;
          canvas.height = height;
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          ctx?.drawImage(image, 0, 0, width, height);
          dataUrl = canvas.toDataURL("image/jpeg", quality);

          if (dataUrl.length < maxSize) break;

          if (quality > 0.5) {
            // Prioritize quality reduction
            quality -= 0.1;
          } else {
            // Then reduce the size
            width *= 0.9;
            height *= 0.9;
          }
        } while (dataUrl.length > maxSize);

        resolve(dataUrl);
      };
      image.onerror = reject;
      image.src = readerEvent.target.result;
    };
    reader.onerror = reject;

    if (file.type.includes("heic")) {
      import("heic2any")
        .then((module) => {
          const heic2any = module.default;
          return heic2any({ blob: file, toType: "image/jpeg" });
        })
        .then((blob) => {
          reader.readAsDataURL(blob as Blob);
        })
        .catch((e: any) => {
          reject(e);
        });
      return;
    }

    reader.readAsDataURL(file);
  });
}
export async function preProcessMultimodalContent(
  message: RequestMessage,
  // content: RequestMessage["content"],
  retainReasoningDetails?: boolean,
) {
  const content = message.content;
  if (typeof content === "string") {
    return message.role === "assistant" && !retainReasoningDetails
      ? getMessageTextContentWithoutThinkingFromContent(content)
      : content;
  }
  let fileContent = "";
  let textContent = "";
  let hasOnlyTextAndFile = true;
  const otherParts: any[] = [];

  // 处理每个文件，按照模板格式构建内容
  // 遵循deepseek-ai推荐模板：https://github.com/deepseek-ai/DeepSeek-R1?tab=readme-ov-file#official-prompts
  for (const part of content) {
    if (part?.type === "file_url" && part?.file_url?.url) {
      let curFileContent = await readFileContent(part.file_url);
      if (curFileContent) {
        fileContent += `[file name]: ${part.file_url.name}\n`;
        fileContent += `[file content begin]\n`;
        fileContent += curFileContent;
        fileContent += `\n[file content end]\n`;
      }
    } else if (part?.type === "image_url" && part?.image_url?.url) {
      try {
        const url = await cacheImageToBase64Image(part?.image_url?.url);
        otherParts.push({ type: part.type, image_url: { url } });
        hasOnlyTextAndFile = false;
      } catch (error) {
        console.error("Error processing image URL:", error);
      }
    } else if (part?.type === "text" && part?.text) {
      textContent +=
        message.role === "assistant" && !retainReasoningDetails
          ? getMessageTextContentWithoutThinkingFromContent(part.text)
          : part.text;
    } else {
      hasOnlyTextAndFile = false;
      otherParts.push({ ...part });
    }
  }
  if (hasOnlyTextAndFile && (fileContent || textContent)) {
    return fileContent + textContent;
  }

  const result: any[] = [...otherParts]; // Start with the other parts

  if (fileContent || textContent) {
    result.push({ type: "text" as const, text: fileContent + textContent });
  }

  return result;
}
export async function preProcessImageContent(
  message: RequestMessage,
  // content: RequestMessage["content"],
) {
  const content = message.content;
  if (typeof content === "string") {
    return message.role == "assistant"
      ? getMessageTextContentWithoutThinkingFromContent(content)
      : content;
  }
  const result = [];
  for (const part of content) {
    if (part?.type == "image_url" && part?.image_url?.url) {
      try {
        const url = await cacheImageToBase64Image(part?.image_url?.url);
        result.push({ type: part.type, image_url: { url } });
      } catch (error) {
        console.error("Error processing image URL:", error);
      }
    } else if (part?.type === "text" && part?.text) {
      const filteredText =
        message.role == "assistant"
          ? getMessageTextContentWithoutThinkingFromContent(part.text)
          : part.text;
      result.push({ type: part.type, text: filteredText });
    } else {
      result.push({ ...part });
    }
  }
  return result;
}

const imageCaches: Record<string, string> = {};
export function cacheImageToBase64Image(imageUrl: string) {
  if (imageUrl.includes(CACHE_URL_PREFIX)) {
    if (!imageCaches[imageUrl]) {
      const reader = new FileReader();
      return fetch(imageUrl, {
        method: "GET",
        mode: "cors",
        credentials: "include",
      })
        .then((res) => res.blob())
        .then(
          async (blob) =>
            (imageCaches[imageUrl] = await compressImage(blob, 256 * 1024)),
        ); // compressImage
    }
    return Promise.resolve(imageCaches[imageUrl]);
  }
  return Promise.resolve(imageUrl);
}

export function base64Image2Blob(base64Data: string, contentType: string) {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}

export function uploadImage(file: Blob): Promise<string> {
  if (!window._SW_ENABLED) {
    // if serviceWorker register error, using compressImage
    return compressImage(file, 256 * 1024);
  }
  const body = new FormData();
  body.append("file", file);
  return fetch(UPLOAD_URL, {
    method: "post",
    body,
    mode: "cors",
    credentials: "include",
  })
    .then((res) => res.json())
    .then((res) => {
      console.log("res", res);
      if (res?.code == 0 && res?.data) {
        return res?.data;
      }
      throw Error(`upload Error: ${res?.msg}`);
    })
    .catch((error) => {
      console.error("Fetch error:", error);
      throw new Error("Network error or server unavailable");
    });
}

export function removeImage(imageUrl: string) {
  return fetch(imageUrl, {
    method: "DELETE",
    mode: "cors",
    credentials: "include",
  });
}

/**
 * Handle Word documents (.docx, .doc)
 */
async function handleWordFile(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;

        // Handle old .doc format
        if (file.name.endsWith(".doc")) {
          // Simplified warning for .doc files
          console.warn(
            "Old .doc format detected, extraction may be incomplete",
          );

          try {
            // Simple binary extraction for .doc
            const uint8Array = new Uint8Array(arrayBuffer);
            let text = "";
            let inText = false;

            for (let i = 0; i < uint8Array.length; i++) {
              const byte = uint8Array[i];
              if (byte >= 32 && byte <= 126) {
                if (!inText) inText = true;
                text += String.fromCharCode(byte);
              } else if (byte === 0 || byte === 13 || byte === 10) {
                if (inText) {
                  text += " ";
                  inText = false;
                }
              }
            }

            text = text.replace(/\s+/g, " ").trim();

            if (text.length > 100) {
              resolve(
                text +
                  "\n\n【注意】此文件为旧版 .doc 格式，文本提取可能不完整。",
              );
            } else {
              resolve(
                "【无法读取】此文件为旧版 .doc 格式，无法完全解析其内容。",
              );
            }
            return;
          } catch (error) {
            resolve("【无法读取】此文件为旧版 .doc 格式，无法解析其内容。");
            return;
          }
        }

        // Process .docx with mammoth
        const result = await mammoth.extractRawText({ arrayBuffer });
        resolve(result.value);
      } catch (error: any) {
        reject(error);
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Handle PowerPoint presentations (.pptx, .ppt)
 */
async function handlePowerPointFile(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;

        // Handle old .ppt format
        if (file.name.endsWith(".ppt")) {
          console.warn(
            "Old .ppt format detected, extraction may be incomplete",
          );

          try {
            // Simple binary extraction for .ppt
            const uint8Array = new Uint8Array(arrayBuffer);
            let text = "";
            let inText = false;

            for (let i = 0; i < uint8Array.length; i++) {
              const byte = uint8Array[i];
              if (byte >= 32 && byte <= 126) {
                if (!inText) inText = true;
                text += String.fromCharCode(byte);
              } else if (byte === 0 || byte === 13 || byte === 10) {
                if (inText) {
                  text += " ";
                  inText = false;
                }
              }
            }

            text = text.replace(/\s+/g, " ").trim();

            if (text.length > 100) {
              resolve(
                text +
                  "\n\n【注意】此文件为旧版 .ppt 格式，文本提取可能不完整。",
              );
            } else {
              resolve(
                "【无法读取】此文件为旧版 .ppt 格式，无法完全解析其内容。",
              );
            }
            return;
          } catch (error) {
            resolve("【无法读取】此文件为旧版 .ppt 格式，无法解析其内容。");
            return;
          }
        }

        // Process .pptx with JSZip
        try {
          const JSZip = (await import("jszip")).default;
          const zip = new JSZip();
          const zipContent = await zip.loadAsync(arrayBuffer);

          let slideTexts: string[] = [];
          const slideRegex = /ppt\/slides\/slide(\d+)\.xml/;
          const slidePromises: Promise<void>[] = [];

          zipContent.forEach((path, file) => {
            if (slideRegex.test(path)) {
              const slidePromise = file.async("string").then((content) => {
                const textMatches = content.match(/<a:t>([^<]*)<\/a:t>/g);
                if (textMatches) {
                  const slideNumber = parseInt(path.match(slideRegex)![1]);
                  const slideText = textMatches
                    .map((match) => match.replace(/<a:t>|<\/a:t>/g, ""))
                    .filter((text) => text.trim().length > 0)
                    .join("\n");

                  if (slideText.trim()) {
                    slideTexts.push(
                      `--- 幻灯片 ${slideNumber} ---\n${slideText}`,
                    );
                  }
                }
              });
              slidePromises.push(slidePromise);
            }
          });

          await Promise.all(slidePromises);

          // Sort slides by number
          slideTexts.sort((a, b) => {
            const numA = parseInt(a.match(/幻灯片 (\d+)/)![1]);
            const numB = parseInt(b.match(/幻灯片 (\d+)/)![1]);
            return numA - numB;
          });

          if (slideTexts.length > 0) {
            resolve(`PowerPoint 演示文稿内容：\n\n${slideTexts.join("\n\n")}`);
          } else {
            resolve("【提取失败】无法从 PowerPoint 文件中提取文本内容。");
          }
        } catch (error) {
          console.error("解析 PPTX 失败:", error);
          resolve("【提取失败】无法解析 PowerPoint 文件内容。");
        }
      } catch (error: any) {
        reject(error);
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Handle PDF files (.pdf)
 */
async function handlePdfFile(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;

        try {
          // Dynamically import pdf.js
          const pdfjsLib = await import("pdfjs-dist");

          // Set worker path
          if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            try {
              const pdfjsWorker = await import(
                "pdfjs-dist/build/pdf.worker.mjs"
              );
              pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;
            } catch (workerError) {
              pdfjsLib.GlobalWorkerOptions.workerSrc =
                "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.js";
            }
          }

          // Load PDF document
          const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;

          let textContent = `PDF 文档内容 (共 ${pdf.numPages} 页):\n\n`;
          let hasContent = false;

          // Limit pages for large files
          const isLargeFile = file.size > 10 * 1024 * 1024; // 10MB
          const maxPagesToProcess = isLargeFile ? 15 : pdf.numPages;

          // Process pages
          for (let i = 1; i <= Math.min(maxPagesToProcess, pdf.numPages); i++) {
            try {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              const pageText = content.items
                .map((item: any) => item.str)
                .join(" ");

              if (pageText.trim().length > 0) {
                hasContent = true;
                textContent += `--- 第 ${i} 页 ---\n${pageText}\n\n`;
              } else {
                textContent += `--- 第 ${i} 页 ---\n[图像内容或空白页]\n\n`;
              }
            } catch (pageError) {
              textContent += `--- 第 ${i} 页 ---\n[无法解析此页]\n\n`;
            }
          }

          if (maxPagesToProcess < pdf.numPages) {
            textContent += `\n[文件过大，仅处理了前 ${maxPagesToProcess} 页。总页数: ${pdf.numPages}]\n`;
          }

          if (!hasContent) {
            resolve(
              `【PDF 内容提取受限】\n\n此 PDF 文件可能是扫描版或受保护的 PDF。\n\n文件信息：\n- 大小：${(
                file.size /
                (1024 * 1024)
              ).toFixed(2)} MB\n- 页数：${pdf.numPages} 页`,
            );
          } else {
            resolve(textContent);
          }
        } catch (pdfError: any) {
          console.error("解析 PDF 失败:", pdfError);
          resolve("【PDF 解析失败】无法提取 PDF 文件内容。");
        }
      } catch (error: any) {
        reject(error);
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Handle ZIP files (.zip)
 */
async function handleZipFile(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;

        try {
          // Use JSZip to extract ZIP contents
          const JSZip = (await import("jszip")).default;
          const zip = new JSZip();
          const zipContent = await zip.loadAsync(arrayBuffer);

          let fileContents: string[] = [];
          let fileCount = 0;
          let processedCount = 0;
          let textFileCount = 0;

          // Count files
          zipContent.forEach(() => {
            fileCount++;
          });

          // Limit files to process
          const maxFilesToProcess = 25;
          const isLargeZip = fileCount > maxFilesToProcess;

          const filePromises: Promise<void>[] = [];

          zipContent.forEach((path, zipEntry) => {
            if (zipEntry.dir) return;
            if (processedCount >= maxFilesToProcess) return;
            processedCount++;

            const filePromise = (async () => {
              try {
                const ext = path.split(".").pop()?.toLowerCase();

                // Only process text files
                const textExtensions = [
                  "txt",
                  "md",
                  "js",
                  "py",
                  "html",
                  "css",
                  "json",
                  "csv",
                  "xml",
                  "log",
                  "sh",
                  "sql",
                  "yml",
                  "yaml",
                  "toml",
                  "c",
                  "cpp",
                  "java",
                  "cs",
                  "go",
                  "rs",
                  "php",
                  "rb",
                  "py",
                ];

                if (ext && textExtensions.includes(ext)) {
                  const content = await zipEntry.async("string");
                  const maxContentLength = 5000;
                  const truncatedContent =
                    content.length > maxContentLength
                      ? content.substring(0, maxContentLength) +
                        `\n\n[文件过大，已截断。原文件大小: ${content.length} 字符]`
                      : content;

                  fileContents.push(
                    `=== ${path} ===\n\n${truncatedContent}\n\n`,
                  );
                  textFileCount++;
                } else {
                  const metadata = await zipEntry.async("uint8array");
                  fileContents.push(
                    `=== ${path} ===\n[二进制文件，大小: ${metadata.length} 字节]\n\n`,
                  );
                }
              } catch (fileError) {
                fileContents.push(`=== ${path} ===\n[无法读取此文件]\n\n`);
              }
            })();

            filePromises.push(filePromise);
          });

          await Promise.all(filePromises);

          // Build result
          let result = `ZIP 文件内容 (${file.name}):\n`;
          result += `总文件数: ${fileCount}`;

          if (isLargeZip) {
            result += ` (仅显示前 ${maxFilesToProcess} 个文件)`;
          }

          result += `\n文本文件数: ${textFileCount}\n\n`;
          result += fileContents.join("");

          if (isLargeZip) {
            result += `\n[ZIP 文件过大，仅处理了前 ${maxFilesToProcess} 个文件。总文件数: ${fileCount}]\n`;
          }

          resolve(result);
        } catch (zipError: any) {
          console.error("解析 ZIP 失败:", zipError);
          resolve("【ZIP 解析失败】无法提取 ZIP 文件内容。");
        }
      } catch (error: any) {
        reject(error);
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Handle Excel files (.xlsx, .xls)
 */
async function handleExcelFile(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;

        if (file.name.endsWith(".xls")) {
          console.warn(
            "Old .xls format detected, extraction may be incomplete",
          );
        }

        try {
          // Import xlsx library
          const XLSX = await import("xlsx");

          // Read Excel file
          const workbook = XLSX.read(new Uint8Array(arrayBuffer), {
            type: "array",
          });

          let result = `Excel 表格内容 (${file.name}):\n\n`;

          // Get all sheet names
          const sheetNames = workbook.SheetNames;
          result += `工作表数量: ${sheetNames.length}\n\n`;

          // Process each sheet
          for (let i = 0; i < sheetNames.length; i++) {
            const sheetName = sheetNames[i];
            result += `=== 工作表: ${sheetName} ===\n\n`;

            // Get worksheet
            const worksheet = workbook.Sheets[sheetName];

            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            // Check if there's data
            if (jsonData.length === 0) {
              result += "[空工作表]\n\n";
              continue;
            }

            // Get column widths
            const columnWidths: number[] = [];
            for (const row of jsonData) {
              if (Array.isArray(row)) {
                for (let j = 0; j < row.length; j++) {
                  const cellValue = String(row[j] || "");
                  columnWidths[j] = Math.max(
                    columnWidths[j] || 0,
                    cellValue.length,
                  );
                }
              }
            }

            // Limit column width
            columnWidths.forEach((width, index) => {
              columnWidths[index] = Math.min(width, 20);
            });

            // Generate table text
            for (const row of jsonData) {
              if (Array.isArray(row)) {
                let rowText = "";
                for (let j = 0; j < row.length; j++) {
                  const cellValue = String(row[j] || "");
                  const truncatedValue =
                    cellValue.length > columnWidths[j]
                      ? cellValue.substring(0, columnWidths[j] - 3) + "..."
                      : cellValue;
                  rowText += truncatedValue.padEnd(columnWidths[j] + 2);
                }
                result += rowText.trim() + "\n";
              }
            }

            result += "\n";
          }

          resolve(result);
        } catch (excelError: any) {
          console.error("解析 Excel 失败:", excelError);
          resolve("【Excel 解析失败】无法提取 Excel 文件内容。");
        }
      } catch (error: any) {
        reject(error);
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * 上传文件到远程服务器或在本地处理文件
 * @param file 要上传的文件对象
 * @returns 返回上传后的文件URL或文件内容
 */
export function uploadFileRemote(
  file: File,
): Promise<{ type: "text" | "dataUrl" | "url"; content: string }> {
  if (!window._SW_ENABLED) {
    // 先尝试以文本方式读取
    return new Promise((resolve, reject) => {
      const fileExtension = file.name.split(".").pop()?.toLowerCase();
      // Handle special file types
      if (fileExtension === "docx" || fileExtension === "doc") {
        handleWordFile(file)
          .then((content) => resolve({ type: "text", content }))
          .catch(reject);
      } else if (fileExtension === "pptx" || fileExtension === "ppt") {
        handlePowerPointFile(file)
          .then((content) => resolve({ type: "text", content }))
          .catch(reject);
      } else if (fileExtension === "pdf") {
        handlePdfFile(file)
          .then((content) => resolve({ type: "text", content }))
          .catch(reject);
      } else if (fileExtension === "xlsx" || fileExtension === "xls") {
        handleExcelFile(file)
          .then((content) => resolve({ type: "text", content }))
          .catch(reject);
      } else if (fileExtension === "zip") {
        handleZipFile(file)
          .then((content) => resolve({ type: "text", content }))
          .catch(reject);
      } else {
        const reader = new FileReader();

        reader.onload = (event) => {
          if (event.target?.result) {
            resolve({
              type: "text",
              content: event.target.result as string,
            });
          } else {
            reject(new Error("Failed to read file as text"));
          }
        };

        reader.onerror = () => {
          console.log("Failed to read as text, falling back to DataURL");
          // 文本读取失败，回退到 DataURL 模式
          readFileAsDataURL(file)
            .then((dataUrl) => resolve({ type: "dataUrl", content: dataUrl }))
            .catch(reject);
        };

        // 尝试以文本方式读取
        reader.readAsText(file);
      }
    });
  }

  const body = new FormData();
  body.append("file", file);

  return fetch(UPLOAD_URL, {
    method: "post",
    body,
    mode: "cors",
    credentials: "include",
  })
    .then((res) => {
      return res.json();
    })
    .then((res) => {
      console.log("File upload response:", res);
      if (res?.code == 0 && res?.data) {
        return { type: "url" as const, content: res?.data || "" };
      }
      throw Error(`Upload Error: ${res?.msg}`);
    })
    .catch((error) => {
      console.error("File upload error:", error);
      throw new Error("Network error or server unavailable during file upload");
    });
}

/**
 * Reads a file as plain text without base64 encoding
 * @param file - The file to read
 * @returns Promise resolving to the file content as string
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = (error) => {
      reject(error);
    };
    // 使用 readAsText 而非 readAsDataURL
    reader.readAsText(file);
  });
}

/**
 * 将文件读取为 DataURL
 * @param file 要读取的文件
 * @returns 返回文件的 DataURL
 */
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * 处理文件内容，用于消息发送前的预处理
 * @param message 请求消息对象
 * @returns 处理后的内容
 */
export async function preProcessFileContent(message: RequestMessage) {
  const content = message.content;
  if (typeof content === "string") {
    return content;
  }

  const result = [];
  for (const part of content) {
    if (part?.type === "file_url" && part?.file_url?.url) {
      try {
        // 这里可以添加文件缓存逻辑，类似于图片缓存
        result.push({
          type: part.type,
          file_url: {
            url: part.file_url.url,
            name: part.file_url.name,
            contentType: part.file_url.contentType,
            size: part.file_url.size,
            tokenCount: part.file_url.tokenCount,
          },
        });
      } catch (error) {
        console.error("Error processing file URL:", error);
      }
    } else {
      // 保留其他类型的内容
      result.push({ ...part });
    }
  }
  return result;
}

/**
 * 从远程服务器删除文件
 * @param fileUrl 要删除的文件URL
 * @returns 删除操作的响应
 */
export function removeFile(fileUrl: string) {
  return fetch(fileUrl, {
    method: "DELETE",
    mode: "cors",
    credentials: "include",
  });
}
