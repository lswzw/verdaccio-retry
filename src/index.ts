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
    const logger = this.logger;

    app.use((req: Request, res: Response, next: NextFunction) => {
      const originalEnd = res.end;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (res as any).end = function (...args: any[]): Response {
        const statusCode = res.statusCode;

        // We call the original res.end() function to finish the response
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (originalEnd as any).apply(res, args);

        // After the response is sent, we check the status code
        if (statusCode >= 400 && statusCode < 600) {
          // This regex matches scoped and unscoped package tarball URLs
          // e.g., /@scope/pkg/-/pkg-1.0.0.tgz or /pkg/-/pkg-1.0.0.tgz
          const tarballUrlRegex = /^\/((?:@[^/]+\/)?[^/]+)\/-\/.*\.tgz$/;
          const match = req.path.match(tarballUrlRegex);

          if (match) {
            const packageName = match[1];
            logger.warn(
              {
                path: req.path,
                statusCode: statusCode,
                packageName,
              },
              `[verdaccio-retry] non-200 response for package '@{packageName}', triggering cache removal.`
            );

            // Verdaccio's storage manager has a 'removePackage' method.
            // It's asynchronous and takes a callback.
            storage.removePackage(packageName, (err) => {
              if (err) {
                logger.error(
                  { error: err.message, packageName },
                  `[verdaccio-retry] failed to remove cached package '@{packageName}'.`
                );
              } else {
                logger.info(
                  { packageName },
                  `[verdaccio-retry] successfully removed cached package '@{packageName}'. It will be refetched on the next request.`
                );
              }
            });
          }
        }
        return res;
      };

      next();
    });
  }
}
