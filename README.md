# MacKO Manager

[日本語](#日本語) &nbsp;|&nbsp; [English](#english)

> ⚠️ **α版 / Alpha release** — 実機動作は限定的に確認済みですが、サーボを破損する可能性がゼロではありません。**自己責任でご使用ください**。
> Limited field-tested alpha. Use at your own risk — servo damage is possible.

---

## 日本語

近藤科学 KRS サーボを Mac / Linux の Chrome ブラウザから設定するツールです。公式の Windows 専用 `ICS 3.5/3.6 Manager` と同等の機能を、WebUSB 経由で提供します。

### 特徴

- **ドライバインストール不要** — WebUSB で `ICS USB Adapter HS` に直接アクセス
- **macOS (Apple Silicon / Intel) + Ubuntu / Debian / Fedora / Arch** 対応
- 位置指示（連続送信 / 中央 / 脱力）
- ストレッチ・スピード・電流・温度の READ/WRITE
- ID 読取・書換
- EEPROM 64バイト 読取・書込（名前付きパラメータ編集 + フラグビット分解）
- 通信速度 自動判別（1.25M / 625k / 115.2k × ID 0-31 スキャン）
- 機種別ファクトリーリセット（.sdt プリセット）
- `.sdt` 読込・保存（公式 Manager 互換）
- 日本語 / English UI 切替

### 動作要件

- **ブラウザ**: Chrome 89+ / Edge 89+ / Chromium 89+ / Brave（Safari / Firefox は WebUSB 非対応）
- **ハードウェア**: 近藤科学 ICS USB Adapter HS (VID 0x165c / PID 0x0006) + KRS シリーズサーボ

### インストール

```sh
git clone https://github.com/Ninagawa123/MacKO_manager.git
cd MacKO_manager
```

### 起動

**macOS**:
`launch.command` をダブルクリック（初回は右クリック→開く）。

**Linux**:
```sh
./linux/install-udev.sh   # 初回のみ、udev ルール導入
./launch.sh
```

### 使い方

1. ICS USB Adapter HS を挿し、サーボを接続して電源 ON
2. 「接続」→ Chrome のダイアログで `ICS USB ADAPTER HS` を選択
3. 「自動判別」で通信速度と ID を自動検出
4. 位置指示・パラメータ変更・EEPROM 編集が可能

### ファクトリーリセット

`presets/` フォルダに機種別の `.sdt` ファイルを入れると、UI からワンクリックで工場出荷状態に戻せます。詳細は [presets/README.md](presets/README.md) 参照。

### 免責事項

本ソフトウェアはα版です。EEPROM への誤った書き込みによりサーボが通信不能になる場合があります。特に **フラグの「シリアル専用」チェックを外すと PWM モードに切り替わり、ICS 応答が停止** します。復旧には電源 OFF/ON のタイミングを合わせた再起動が必要です。

使用により生じたいかなる損害についても作者は責任を負いません。**自己責任でご使用ください**。

### ライセンス

[MIT License](LICENSE) © 2026 Ninagawa Izumi

本ソフトウェアは近藤科学株式会社とは無関係の独立したオープンソースプロジェクトです。
This is an unaffiliated open-source project, not endorsed by Kondo Kagaku.

---

## English

A Mac / Linux Chrome-based configuration tool for Kondo Kagaku KRS servos. Provides functionality equivalent to the official Windows-only `ICS 3.5/3.6 Manager` via WebUSB.

### Features

- **No driver install required** — direct WebUSB access to the `ICS USB Adapter HS`
- **macOS (Apple Silicon / Intel) + Ubuntu / Debian / Fedora / Arch** support
- Position command (continuous / center / free)
- Stretch / speed / current / temperature READ/WRITE
- ID read / write
- EEPROM 64-byte read / write (named parameter editing + flag bit breakdown)
- Baud rate auto-detect (1.25M / 625k / 115.2k × ID 0-31 scan)
- Per-model factory reset (bring-your-own `.sdt` presets)
- `.sdt` load / save (compatible with official Manager)
- Japanese / English UI toggle

### Requirements

- **Browser**: Chrome 89+ / Edge 89+ / Chromium 89+ / Brave (Safari / Firefox do NOT support WebUSB)
- **Hardware**: Kondo ICS USB Adapter HS (VID 0x165c / PID 0x0006) + any KRS-series servo

### Install

```sh
git clone https://github.com/Ninagawa123/MacKO_manager.git
cd MacKO_manager
```

### Launch

**macOS**:
Double-click `launch.command` (first time: right-click → Open).

**Linux**:
```sh
./linux/install-udev.sh   # first time only, installs udev rule
./launch.sh
```

### Usage

1. Plug in the ICS USB Adapter HS, connect a servo, and power it on
2. Click **Connect** → pick `ICS USB ADAPTER HS` in Chrome's dialog
3. Click **Auto** to auto-detect baud rate and ID
4. Edit positions / parameters / EEPROM as needed

### Factory Reset

Drop per-model `.sdt` files into `presets/` to enable one-click factory restore from the UI. See [presets/README.md](presets/README.md) for details.

### Disclaimer

This is **alpha-quality software**. Incorrect EEPROM writes can brick servo communication. Notably, **unchecking the "Serial only" flag bit switches the servo to PWM mode and silences ICS responses**. Recovery requires power-cycling the servo with correct timing.

The author assumes no liability for any damage arising from the use of this software. **Use at your own risk.**

### License

[MIT License](LICENSE) © 2026 Ninagawa Izumi

This is an independent open-source project and is **not** affiliated with or endorsed by Kondo Kagaku Co., Ltd.
