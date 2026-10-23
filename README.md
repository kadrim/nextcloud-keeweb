# Keeweb for Nextcloud

**WARNING: KeeWeb itself is not maintained any longer (see note about NC 28 and newer below) and future versions of Nextcloud may not be supported any longer!**

**Clarification about the KeeWeb upstream for August 2026: eventhough there was some activity in the upstream project, the issue
https://github.com/keeweb/keeweb/issues/2022 is still not closed and there is also no new release of KeeWeb yet
(see https://github.com/keeweb/keeweb/releases).**

**Also keep in mind that KeeWeb only supports files in KDBX 3 format. Files in KDBX 4 format will get corrupted when opening and editing them in KeeWeb,
see [https://github.com/keeweb/keeweb/issues/2001](https://github.com/keeweb/keeweb/issues/2001)! So keep your files in KDBX 3 format if you want to
use them in KeeWeb as well!**

**Since the situation did not change in October 2026, this application is considered obsolete and will no longer be maintained and there will not be any updates for Nextcloud 35 or newer since no one is maintaining the upstream application. Also see the announcement at [https://help.nextcloud.com/t/future-of-keeweb-for-nextcloud/246223](https://help.nextcloud.com/t/future-of-keeweb-for-nextcloud/246223).**

----

[Nextcloud](https://nextcloud.com/) is an open source, self-hosted file sync and share and communication app platform.
[Keeweb](https://keeweb.info/) is a web application for working with databases of the Keepass password manager.

This integrates the two with each other. Just click on a \*.kdbx file in Your Nextcloud to open it.

![demo](https://arnowelzel.de/download/nextcloud-keeweb.gif)

**Note about Nextcloud 28 and newer:**

Thanks to the help by @florian-forestier, in January 2024 a new release was published which supports Nextcloud 28.

However as of July 2024 the upstream project "KeeWeb" did not get any official new release since
July 2021 (also see https://github.com/keeweb/keeweb/releases).

You may have a look at https://github.com/jhass/nextcloud-keeweb/issues/204 (KeeWeb upstream maintenance) and/or
https://github.com/jhass/nextcloud-keeweb/issues/221 (Maintainers for KeeWeb for Nextcloud).

Any help is appreciated!

## Install

1. Go to the releases page, download the latest version.
1. Extract it to `your_nextcloud/custom_apps`, for example with `tar xvf keeweb-0.6.29.tar.gz -C /path/to/your/nextcloud/custom_apps`.
1. Go to "Apps" and then "Not enabled", scroll down to "Experimental" and enable it.

To update to a new version, simply repeat these steps.

## Development setup

The container setup uses the official
[Nextcloud development image](https://github.com/nextcloud/nextcloud-docker-dev)
with Nextcloud `stable34`, PHP 8.4, SQLite, Node 20 and npm 9.
It is for local development only: debug mode is enabled and the upstream image
creates the `admin` user with password `admin`, plus additional test users.
Use synthetic KDBX 3 databases only, never real password vaults.

### Docker Compose

Install Docker Engine (or Docker Desktop) with the Compose plugin, then run:

```sh
bin/dev up
bin/dev build
```

Open <http://localhost:8080> and sign in with `admin` / `admin`.
The first startup downloads Nextcloud's source and dependencies; the first build
also clones and builds upstream KeeWeb. Both can take several minutes and require
internet access. `up` waits for Nextcloud to be installed and Keeweb enabled;
`build` must finish before opening the Keeweb app.

The repository is mounted at `/workspace` and [keeweb](keeweb) is also mounted
directly into Nextcloud's `apps-extra/keeweb`. PHP edits take effect immediately;
JavaScript changes require a rebuild. Build outputs stay in the working tree.
Commands run through `bin/dev build` and `bin/dev shell` use your host UID/GID
so generated files are not owned by root on Linux.

```sh
bin/dev occ status
bin/dev occ app:list
bin/dev shell
bin/dev logs
bin/dev down
```

`down` removes the containers but preserves the named volumes holding Nextcloud's
source, configuration, database, uploaded files, and installed apps. Running
`bin/dev up` again reuses them and reapplies the app initialization.
To delete **all development instance data**, run `docker compose down --volumes`.
This does not delete your repository or the ignored build outputs.

Set `NEXTCLOUD_PORT=8081` in a root `.env` file if port 8080 is occupied.
The published port binds only to `127.0.0.1`. Do not expose this development
instance to the internet. The `stable34` branch follows its maintenance updates
on a fresh installation; existing volumes are not automatically upgraded.

### VS Code devcontainer

Install the **Dev Containers** extension and select **Dev Containers: Reopen in
Container**. It uses the same Compose service and volumes, keeps the server
entrypoint running, and builds both frontends on container creation.
Open <http://localhost:8080> once initialization and the build finish.
Inside the devcontainer, run commands directly rather than using `bin/dev`:

```sh
bash bin/dev-build
occ status
cd keeweb && npm run build
```

The container includes PHP, Composer, PHPUnit, Git, Node, npm, and build tools.
VS Code uses a non-root development user. Xdebug is available but off by default;
set `PHP_XDEBUG_MODE=debug` in `.env` and recreate the container to enable it.
Inside the devcontainer, start **Listen for Xdebug (devcontainer)** in VS Code's
Run and Debug view and enable an Xdebug browser trigger (for example, append
`?XDEBUG_TRIGGER=1` to the app URL). The debugger connects within the container;
no debugger port is published on the host.

### Build details and tests

There are two frontend builds:

- [bin/build](bin/build) applies the repository's patches to the version in
  [keeweb-version](keeweb-version) and generates the embedded KeeWeb templates.
- `cd keeweb && npm install && npm run build` builds the Nextcloud file-viewer
  integration.

[bin/dev-build](bin/dev-build) runs both. Treat the ignored `keeweb-source`
directory as disposable: the existing upstream build script resets tracked
files and removes untracked files there. Do not keep your own work in that clone.
To change the upstream KeeWeb version, update the version file and review all
three patch files.

The Nextcloud source (including its test bootstrap) is available at
`/var/www/html`. The existing PHP tests are legacy tests using obsolete PHPUnit
APIs and an outdated controller constructor; they need updating before they can
validate the current app. The container does not silently skip or rewrite them.
For now, verify changes with the frontend builds and browser checks of the app
and opening/saving a disposable KDBX 3 file.

The legacy dependencies also produce npm audit findings. A successful build does
not mean they are safe for production. The current app still reports
`jQuery is not defined` in its outer-frame script on Nextcloud 34, even though the
embedded KeeWeb UI loads. These existing application/dependency issues are not
fixed by the development environment.

To build an app-store package inside the container:

```sh
cd /workspace/keeweb
make dist
```

The package is written to `keeweb/build/artifacts/appstore/keeweb.tar.gz`.

## Contributing

1. Fork the repository and clone your fork.
1. Create a new branch.
1. Commit your patch.
1. Push the branch and open a pull request.
