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
with Nextcloud `stable34`, PHP 8.4, SQLite, Node 24 and npm 11.
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

Startup also copies [dummy.kdbx](dummy.kdbx) into the `admin` user's Files root
if no file with that name exists. Open it in Nextcloud and use the database
master password `admin`. It contains one sample entry, `Nextcloud`, with username
`admin` and password `password`. This is disposable test data, not a real vault.
Existing copies are never overwritten on restart, so your test edits are kept.
To restore the sample, delete it from Nextcloud's Files and restart the container.

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
entrypoint running, builds both frontends, and installs Playwright's Chromium
browser and Linux dependencies on container creation.
Open <http://localhost:8080> once initialization and the build finish.
Inside the devcontainer, run commands directly rather than using `bin/dev`:

```sh
bash bin/dev-build
occ status
cd keeweb && npm run build
```

The Playwright extension is included for running the browser tests from VS Code's
Testing view. The devcontainer sets `PLAYWRIGHT_BASE_URL=http://localhost` because
Nextcloud listens on port 80 inside the container, regardless of the published
host port. Rebuild the devcontainer after pulling these setup changes.

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

The file-viewer integration uses `@nextcloud/files` v4 for Nextcloud 34.
Version 3 registers actions in the old registry, which Nextcloud 34 no longer
uses: Keeweb itself loads, but "Open With Keeweb" is missing from Files.
The v4 library requires Node 24; use the same Node version for local and release
builds. Rebuild the devcontainer after changing its Node image.
Run `cd keeweb && npm test` to build and test the actual viewer bundle's v4
registration, file eligibility, and database-opening URL.

### Playwright browser tests

The [end-to-end tests](keeweb/tests/e2e/open-database.spec.js) sign in as
`admin` / `admin`, open `dummy.kdbx` using both Files actions, and unlock it with
the password `admin`. Run them only against the disposable development instance.
Nextcloud must be ready, both frontends must be built, and the original sample
database must be present (restore it as described above if you changed it).
The tests do not start or build the server.

Inside the devcontainer:

```sh
npm --prefix keeweb run test:e2e
# Run only one scenario:
npm --prefix keeweb run test:e2e -- --grep "context menu"
# View the HTML report after a run:
npm --prefix keeweb run test:e2e:report -- --host 0.0.0.0
```

Forward port 9323 in VS Code's Ports view to open the report from your host.
Reports, failure screenshots, and failure traces are saved under the ignored
`keeweb/playwright-report` and `keeweb/test-results` directories. Traces can be
opened from the HTML report. Keep these artifacts private: they can include
session details and page contents.

To run from the host instead, use Node 24/npm 11 and start and build the Compose
instance with `bin/dev up` and `bin/dev build`, then:

```sh
cd keeweb
npm ci
npm run test:e2e:install
npm run test:e2e
```

On Linux, the browser-dependency installation may ask for sudo. On other
Playwright-supported platforms, it installs Chromium without Linux packages.
If using a different published port, override the default URL for the test run:

```sh
PLAYWRIGHT_BASE_URL=http://localhost:8081 npm run test:e2e
```

If running in an existing container without rebuilding it, run
`npm --prefix keeweb ci` and `npm --prefix keeweb run test:e2e:install` once,
then set `PLAYWRIGHT_BASE_URL=http://localhost` when running the tests.
Rerun the browser installation after updating Playwright. Browser tests are
separate from `npm test`, which does not require a running Nextcloud instance.

### Build workflow and PHP tests

[bin/dev-build](bin/dev-build) runs both. Treat the ignored `keeweb-source`
directory as disposable: the existing upstream build script resets tracked
files and removes untracked files there. Do not keep your own work in that clone.
If the directory exists without valid Git metadata, `bin/dev-build` preserves it
under an ignored `keeweb-source.backup.*` directory (printing the exact path)
and clones a fresh checkout. A clone failure stops the build; the backup remains
available and you can retry `bash bin/dev-build`.
The legacy upstream build uses `npm install` only: following it with `npm ci`
can fail on Linux because the updated lockfile omits the optional macOS-only
`grunt-appdmg` dependency. The file-viewer integration still uses `npm ci` with
its maintained lockfile.
Run `node --test bin/tests/*.test.js` to test checkout setup, recovery, and the
upstream install/build sequence without downloading dependencies or building
the frontends.
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

### GitHub release workflow

The manually triggered [Release workflow](.github/workflows/release.yml) builds
the app, pushes a release commit and tag to `master`, creates a GitHub release,
and publishes it to the Nextcloud App Store. It is not a dry run. Update
`keeweb/CHANGELOG.md` and `keeweb-version` before running it, and enter the
release version without a `v` prefix. Repository rules must allow the workflow
to push its release commit and tag.

The workflow requests `contents: write` and uses GitHub's automatically
provided `GITHUB_TOKEN`; do not create a personal access token for it.
Configure these two repository secrets under **Settings > Secrets and
variables > Actions > New repository secret**:

| Secret | Value |
| --- | --- |
| `APPSTORE_KEY` | The complete PEM private key for the Nextcloud app id `keeweb`, including its BEGIN/END lines and line breaks. |
| `NC_AUTH_TOKEN` | The Nextcloud App Store API token for the account authorized to publish `keeweb`. |

Keep both values out of commits, issues, workflow logs, and chat. The workflow
writes the signing key to a private temporary file and removes it when the
publishing step exits.

#### Obtaining App Store credentials

A repository move does not transfer Nextcloud App Store ownership. Before
creating replacement credentials, coordinate with the current `keeweb` App Store
owner and Nextcloud maintainers about ownership transfer and certificate
replacement. The current owner can unlock a transfer in the
[App Store transfer settings](https://apps.nextcloud.com/account/transfer-apps).
Do not register an unrelated app id or assume a new API token grants access to
the existing app.

For a new signing key, run the following on your own trusted machine, outside
the repository:

```sh
(
  umask 077
  mkdir -p ~/.nextcloud/certificates
  cd ~/.nextcloud/certificates
  if [ -e keeweb.key ] || [ -e keeweb.csr ]; then
    printf '%s\n' 'Existing keeweb key or CSR found; do not overwrite it.' >&2
    exit 1
  fi
  openssl req -nodes -newkey rsa:4096 \
    -keyout keeweb.key -out keeweb.csr -subj "/CN=keeweb"
)
```

Back up the private key securely. Submit only the public CSR to
[Nextcloud's certificate request repository](https://github.com/nextcloud/app-certificate-requests),
following its instructions for the existing `keeweb` app and linking to
<https://github.com/kadrim/nextcloud-keeweb>. Explain the maintainer change and coordinate
replacement of the existing certificate; never submit the private key.

After approval, save the signed public certificate locally and follow
[Nextcloud's registration and transfer instructions](https://nextcloudappstore.readthedocs.io/en/latest/developer.html)
to authorize your account and register the appropriate certificate. Registration
requires the public certificate and a signature over the app id:

```sh
printf '%s' keeweb | openssl dgst -sha512 \
  -sign ~/.nextcloud/certificates/keeweb.key | openssl base64
```

**Stop before replacing an existing registered certificate:** Nextcloud's
documentation says doing so deletes previous App Store releases because their
signatures become invalid. Agree on the migration with the existing owner and
Nextcloud maintainers first.

Sign in to the authorized account on <https://apps.nextcloud.com> and obtain its
API token from [account settings](https://apps.nextcloud.com/account/token).
Store that token as `NC_AUTH_TOKEN`, and the full private key as `APPSTORE_KEY`.
The public certificate and CSR are not secrets, and this workflow does not
require a certificate secret: it signs the release archive with the private key,
and the App Store verifies it against the registered certificate.

Once ownership, certificate registration, and both secrets are ready, open
**Actions > Release > Run workflow**, select `master`, and enter an unused
release version. The default release commit email is
`8304331+kadrim@users.noreply.github.com`.

## Contributing

1. Fork the repository and clone your fork.
1. Create a new branch.
1. Commit your patch.
1. Push the branch and open a pull request.
