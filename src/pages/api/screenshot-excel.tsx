import type { NextApiRequest, NextApiResponse } from "next";
import core, { Page, Viewport } from "puppeteer-core";
import os from "os";
import { renderToStaticMarkup } from "react-dom/server";
import Table from "@/components/Table";
import excelToJson from "convert-excel-to-json";
import { parseForm } from "@/lib/parseForm";
import formidable from "formidable";

export const config = {
  api: {
    bodyParser: false,
  },
};

const STRATEGY_OPTIONS = ["body", "query"] as const;
type StrategyOption = typeof STRATEGY_OPTIONS[number];

const ENV_MODES = ["development", "staging", "production", "testing"] as const;
type EnvMode = typeof ENV_MODES[number];

type ImageType = "png" | "jpeg" | "webp";

type ChromeOptions = {
  args?: string[];
  executable?: string;
};

type BrowserEnvironment = {
  envMode: EnvMode;
  executable: string;
  page: Page;
  createImage: (html: string) => Promise<Buffer> | Promise<string>;
};

export default async function screenshotExcelHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method?.toUpperCase() !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(403).send({
      status: "error",
      message: "Only POST method is allowed",
    });
  }

  let file: formidable.File;

  try {
    file = (await parseForm(req)).files.file as formidable.File;
  } catch (error) {
    return res.status(500).send({
      status: "error",
      message: "Parsing error",
    });
  }

  if (!file) {
    res.status(403).send({
      status: "error",
      message: "No file was provided",
    });
  }

  let result: ReturnType<typeof excelToJson>;

  try {
    result = excelToJson({
      sourceFile: file.filepath, // TODO: Change url
      columnToKey: {
        A: "date",
        B: "currency",
        C: "sender",
        D: "receiver",
        E: "sum",
        F: "purpose",
      },
    });
  } catch (error) {
    return res.status(500).send({
      status: "error",
      message: "Provided file is not xlsx",
    });
  }

  const inspectHtml = false;
  const imageType = "png";
  const envMode = process.env.NODE_ENV as EnvMode;
  const cacheControl = "max-age 3600, must-revalidate";
  const viewportWidth = 1140;
  const viewportHeight = 10; // minimal value to take full page screenshot

  const createBrowserEnvironment = pipe(
    getChromiumExecutable,
    prepareWebPageFactory(
      { width: viewportWidth, height: viewportHeight },
      {
        args: [
          "--hide-scrollbars",
          "--disable-web-security",
          "--no-sandbox",
          "--disable-setuid-sandbox",
        ],
      }
    ),
    createImageFactory({ inspectHtml, type: imageType, quality: 100 })
  );

  const browserEnvironment = await createBrowserEnvironment();
  const reactTemplate = (props: any) => <Table data={result?.["Sheet1"]} />;
  const params = {};

  const html = renderToStaticMarkup(await reactTemplate({ ...params } as any));

  const image = await browserEnvironment.createImage(html);

  res.setHeader(
    "Content-Type",
    !isProductionLikeMode(envMode) && inspectHtml
      ? "text/html"
      : imageType
      ? `image/${imageType}`
      : "image/png"
  );
  res.setHeader("Cache-Control", cacheControl);
  res.write(image);
  res.end();
}

const createBrowserEnvironment = pipe();

function pipe(
  ...functions: Array<Function>
): () => Promise<BrowserEnvironment> {
  return async function () {
    return await functions.reduce(
      async (acc, fn) => await fn(await acc),
      Promise.resolve({
        envMode: process.env.NODE_ENV as EnvMode,
      } as BrowserEnvironment)
    );
  };
}

function getChromiumExecutable(browserEnvironment: BrowserEnvironment) {
  let executable = null;

  if (process.platform === "win32") {
    if (["arm64", "ppc64", "x64", "s390x"].includes(os.arch())) {
      executable = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    } else {
      executable =
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
    }
  } else if (process.platform === "linux") {
    executable = "/usr/bin/google-chrome";
  } else {
    executable = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  }

  return { ...browserEnvironment, executable };
}

function prepareWebPageFactory(
  viewPort: Viewport,
  chromeOptions: ChromeOptions
) {
  return async function (browserEnvironment: BrowserEnvironment) {
    const { page, envMode, executable } = browserEnvironment;

    if (page) {
      return { ...browserEnvironment, page };
    }

    const chromiumOptions = await getChromiumOptions(
      envMode,
      executable,
      chromeOptions
    );

    const browser = await core.launch(chromiumOptions);
    const newPage = await browser.newPage();
    await newPage.setViewport(viewPort);

    return { ...browserEnvironment, page: newPage };
  };
}

async function getChromiumOptions(
  envMode: EnvMode,
  defaultExecutable: string,
  chromeOptions?: ChromeOptions
) {
  if (!isProductionLikeMode(envMode)) {
    return {
      args: chromeOptions?.args ?? [],
      executablePath: chromeOptions?.executable ?? defaultExecutable,
      headless: true,
    };
  }

  return {
    args: chromeOptions?.args ?? [],
    executablePath: chromeOptions?.executable ?? defaultExecutable,
    headless: true,
  };
}

function createImageFactory({
  inspectHtml,
  type,
  quality,
}: {
  inspectHtml: boolean;
  type: ImageType;
  quality: number;
}) {
  return function (browserEnvironment: BrowserEnvironment) {
    const { page, envMode } = browserEnvironment;

    return {
      ...browserEnvironment,
      createImage: async function (html: string) {
        await page.setContent(html);
        const file =
          !isProductionLikeMode(envMode) && inspectHtml
            ? await page.content()
            : await page.screenshot({
                type,
                encoding: "binary",
                omitBackground: true,
                fullPage: true,
                ...(type === "jpeg" ? { quality } : null),
              });
        return file;
      },
    };
  };
}

function isProductionLikeMode(envMode: EnvMode) {
  return envMode === "production" || envMode === "staging";
}
