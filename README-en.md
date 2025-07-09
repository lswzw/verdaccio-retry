# verdaccio-retry

A Verdaccio middleware plugin that automatically retries failed package downloads by removing them from the cache.

## Description

This plugin functions as a middleware for the Verdaccio private npm proxy registry. Its primary purpose is to enhance the reliability of your package cache.

When a download for a package tarball (`.tgz` file) fails with an HTTP 4xx or 5xx error status, this plugin intercepts the failure. It then automatically removes that specific package from Verdaccio's cache.

This process ensures that the next time the same package is requested, Verdaccio is forced to re-fetch it from the upstream registry (e.g., npmjs.com) instead of serving a potentially corrupted or incomplete file from its cache.

## Installation

To use this plugin, you must have Verdaccio installed.

```bash
# Install the plugin in your Verdaccio environment
npm install verdaccio-retry
```

## Configuration

To enable the plugin, add `verdaccio-retry` to the `middlewares` section of your Verdaccio `config.yaml` file.

```yaml
# In your config.yaml
middlewares:
  verdaccio-retry:
    # To enable the plugin, set this to true
    enabled: true
```

After adding this to your configuration, restart your Verdaccio server.

## Usage

Once the plugin is installed and enabled, it operates automatically in the background. No manual intervention is required.

You can observe the plugin's activity by monitoring the Verdaccio server logs. When a package download fails and the plugin successfully removes it from the cache, you will see log entries similar to the following:

```log
warn: [verdaccio-retry] non-200 response for package '@scope/pkg', triggering cache removal.
info: [verdaccio-retry] successfully removed cached package '@scope/pkg'. It will be refetched on the next request.
```

## Development

See the [verdaccio contributing guide](https://github.com/verdaccio/verdaccio/blob/master/CONTRIBUTING.md) for instructions setting up your development environment.
Once you have completed that, use the following npm tasks.

- `npm run build`

  Build a distributable archive

- `npm run test`

  Run unit test

For more information about any of these commands run `npm run ${task} -- --help`.