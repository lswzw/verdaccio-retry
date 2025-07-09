import { Application, NextFunction, Request, Response } from 'express';

import {
  IBasicAuth,
  IPluginMiddleware,
  IStorageManager,
  Logger,
  PluginOptions,
} from '@verdaccio/types';

import { CustomConfig } from '../types/index';

export default class VerdaccioRetryMiddleware implements IPluginMiddleware<CustomConfig> {
  public logger: Logger;

  public constructor(config: CustomConfig, options: PluginOptions<CustomConfig>) {
    this.logger = options.logger;
  }

  public register_middlewares(
    app: Application,
    auth: IBasicAuth<CustomConfig>,
    storage: IStorageManager<CustomConfig>
  ): void {
    app.use((req: Request, res: Response, next: NextFunction) => {
      // 1. 只处理 tarball 请求
      const tarballUrlRegex = /^\/((?:@[^/]+\/)?[^/]+)\/-\/.*\.tgz$/;
      const match = req.path.match(tarballUrlRegex);

      // 2. 如果请求不是 tarball，或者已经重试过，则直接跳过
      if (!match || (req as any)._verdaccio_retry_attempted) {
        return next();
      }

      const packageName = match[1];
      const logger = this.logger;
      const originalEnd = res.end;

      // 3. 重写 res.end 方法以拦截响应
      (res as any).end = function (...args: any[]): Response {
        // 4. 检查是否是失败的响应 (4xx/5xx)
        if (res.statusCode >= 400 && res.statusCode < 600) {
          // 恢复原始的 res.end，避免在重试请求中再次触发此逻辑，导致死循环
          res.end = originalEnd;

          logger.warn(
            { path: req.path, statusCode: res.statusCode, packageName },
            `[verdaccio-retry] non-200 response for package '@{packageName}', triggering cache removal and retry.`
          );

          // 标记此请求已重试
          (req as any)._verdaccio_retry_attempted = true;

          // 5. 异步清理缓存
          storage.removePackage(packageName, (err) => {
            if (err) {
              logger.error(
                { error: err.message, packageName },
                `[verdaccio-retry] failed to remove cached package '@{packageName}'. Sending original response.`
              );
              // 如果清理缓存失败，无法重试，直接返回原始的错误响应
              return (originalEnd as any).apply(res, args);
            }

            logger.info(
              { packageName },
              `[verdaccio-retry] successfully removed cached package '@{packageName}'. Retrying request.`
            );

            // 6. 移除可能过时的响应头，为重试做准备
            res.removeHeader('Content-Length');
            res.removeHeader('Content-Encoding');
            res.removeHeader('ETag');

            // 7. 重新分发请求，实现自动重试
            app.handle(req, res, next);
          });

          // 返回 res 对象
          return res;
        }

        // 7. 如果响应成功，则直接返回
        return (originalEnd as any).apply(res, args);
      };

      next();
    });
  }
}
