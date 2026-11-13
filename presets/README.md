# presets/

This folder is intentionally empty of actual servo defaults.

**ファクトリーリセット** / **Factory reset** に使う `.sdt` 初期値ファイルは
近藤科学 (Kondo Kagaku) の著作物のため、本リポジトリには同梱していません。

The `.sdt` factory-default files are Kondo Kagaku property and are NOT shipped
with this repository.

## 入手方法 / How to obtain

Windows版 公式 ICS Manager (`ICS3.5_3.6Manager.exe`) をインストール済みであれば、
インストールフォルダの `初期値(initial value)` から該当機種の `.sdt` を
このフォルダへコピーしてください。

If you have the official Windows ICS Manager installed, copy the `.sdt` files
from its `初期値(initial value)` folder into this directory.

必要なファイル名（アプリから参照されるもの）:
Required filenames (referenced by the app):

```
KRS-2542HV.sdt          KRS-2542R2.sdt       KRS-2552R2.sdt
KRS-2552RHV.sdt         KRS-2572HV.sdt       KRS-2572R2.sdt
KRS-3204.sdt            KRS-3204R2.sdt       KRS-3301_3302.sdt
KRS-3304.sdt            KRS-3304R2.sdt
KRS-4031HV.sdt          KRS-4032HV.sdt       KRS-4033HV.sdt      KRS-4034HV.sdt
KRS-5054_5053_5034_5033_5032.sdt
KRS-6003R.sdt           KRS-6003R2HV_6104.sdt
KRS-9004HV.sdt
```

## フォーマット例 / Format example

See `example.sdt.template` for the XML structure. A `.sdt` file is 64
`unsignedByte` elements under `<eepromData>` plus an `<IcsVersion>` element.
You can hand-author one if needed.
