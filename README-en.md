# verdaccio-retry

A Verdaccio middleware plugin that automatically retries failed package downloads by removing them from the cache.

## Description

This plugin functions as a middleware for the Verdaccio private npm proxy registry. Its primary purpose is to enhance the reliability of your package cache.

When a download for a package tarball (`.tgz` file) fails with an HTTP 4xx or 5xx error status, this plugin intercepts the failure. It then automatically removes that specific package from Verdaccio's cache.

**After clearing the cache, the plugin will immediately retry the request once. If the retry succeeds, the user will get the correct package on the first attempt, without needing to retry manually. Only if the retry also fails will an error be returned.**

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

**When a package download fails (such as with a 4xx/5xx error), the plugin will clear the cache and immediately retry the request, maximizing user experience.**

You can observe the plugin's activity by monitoring the Verdaccio server logs. When a package download fails and the plugin successfully removes it from the cache, you will see log entries similar to the following:

```log
warn --- [verdaccio-retry] non-200 response for package 'xlsx', triggering cache removal and retry.
info --- [verdaccio-retry] successfully removed cached package 'xlsx'. Retrying request.
```

## Docker Example

You can find a `compose.yml` file in the `examples` directory to run Verdaccio with this plugin.

### Directory Structure

```
examples
├── compose.yml
└── config
    └── config.yaml
```

### `compose.yml`

```yaml
services:
  verdaccio:
    image: verdaccio/verdaccio
    container_name: 'verdaccio'
    restart: always
    network_mode: host
    user: root
    environment:
      - VERDACCIO_PORT=80
    #ports:
    #  - '4873:4873'
    volumes:
      - './config:/verdaccio/conf'
      - './plugins:/verdaccio/plugins'
```

### Usage

1.  **Build and install the plugin.** This step builds the plugin and copies the necessary files (`package.json` and the compiled `lib` directory) into the `plugins` directory for the Docker container to use.
    ```bash
    # Build the plugin
    npm run build

    # Create a dedicated directory for the plugin
    mkdir -p examples/plugins/verdaccio-retry

    # Copy the built code and package.json
    cp -r lib/ examples/plugins/verdaccio-retry/
    cp package.json examples/plugins/verdaccio-retry/
    ```

2.  **Create an `htpasswd` file for authentication.** Verdaccio is configured to use this file to protect publishing. Replace `your_username` with your desired username. You will be prompted for a password.
    ```bash
    # Navigate to the config directory
    cd examples/config

    # Create the htpasswd file (you must have apache2-utils or httpd-tools installed)
    htpasswd -c htpasswd your_username
    ```
    After creation, navigate back to the `examples` directory.

3.  **Start the Verdaccio container.** From the `examples` directory:
    ```bash
    docker-compose up -d
    ```
4.  Verdaccio will be running on port 80.

## Development

See the [verdaccio contributing guide](https://github.com/verdaccio/verdaccio/blob/master/CONTRIBUTING.md) for instructions setting up your development environment.
Once you have completed that, use the following npm tasks.

- `npm run build`

  Build a distributable archive

- `npm run test`

  Run unit test

For more information about any of these commands run `npm run ${task} -- --help`.