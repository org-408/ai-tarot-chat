fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios sync_certs

```sh
[bundle exec] fastlane ios sync_certs
```

証明書・Provisioning Profile を match で同期

### ios staging

```sh
[bundle exec] fastlane ios staging
```

ステージングビルド → TestFlight

### ios production

```sh
[bundle exec] fastlane ios production
```

本番ビルド → App Store 審査提出

### ios certs

```sh
[bundle exec] fastlane ios certs
```

証明書を match リポジトリに登録・更新

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
