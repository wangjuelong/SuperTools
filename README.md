# SuperTools

本地开发者工具箱，基于 Electron + React 构建的跨平台桌面应用，将常用开发工具集于一身，支持完全离线使用。

## 功能

### 笔记
- Markdown 编辑与实时预览（分屏 / 纯编辑 / 纯预览）
- 标签管理与筛选、置顶
- 软删除（垃圾桶）与恢复
- 数据持久化存储到本地文件系统，自动保存

### JSON 工具
- 格式化（2 / 4 空格缩进）与压缩
- 中文 ↔ Unicode 转义互转
- 去除多余反斜杠转义
- 树形结构预览，支持折叠展开
- 最近 50 条历史记录

### Base64
- 编码 / 解码
- URL-safe 模式（`-` `_` 替代 `+` `/`）
- 一键互换输入输出

### 时间戳
- Unix 时间戳 ↔ 日期时间互转
- 支持秒级 (s) 和毫秒级 (ms)
- 同时显示本地时间与 UTC 时间
- 顶部实时时钟

### 翻译
- 多源翻译（MyMemory、Google Translate、Lingva），自动故障转移
- 支持 16 种语言，含自动语言检测
- 实时翻译，700ms 防抖

## 下载

前往 [Releases](https://github.com/wangjuelong/SuperTools/releases) 页面下载最新版本：

| 平台 | 文件 |
|------|------|
| macOS (Apple Silicon) | `SuperTools-x.x.x-arm64.dmg` |
| macOS (Intel) | `SuperTools-x.x.x.dmg` |
| Windows | `SuperTools-x.x.x.exe`（便携版，无需安装） |

## 开发

**环境要求**：Node.js 18+

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建安装包
npm run build
```

## 技术栈

- [Electron](https://www.electronjs.org/) 33
- [React](https://react.dev/) 18 + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) 6
- [Tailwind CSS](https://tailwindcss.com/) 3

## License

MIT
