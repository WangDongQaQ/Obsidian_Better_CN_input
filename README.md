# Better CN Input

Obsidian 中文输入增强插件：中文输入法下写 Markdown 时少切输入法，同时把 `Cmd+A` 改成更像文本编辑器的自然段选择。

## 功能

```text
》 空格                -> > 空格
【【                   -> [[
】】                   -> ]]
！【【                 -> ![[
【OpenAI】（https://openai.com） -> [OpenAI](https://openai.com)
·代码·                 -> `代码`
行首 ···               -> ```
＃                    -> #
｜                    -> |
＊＊粗体＊＊           -> **粗体**
＊斜体＊              -> *斜体*
～～删除～～           -> ~~删除~~
＝＝高亮＝＝           -> ==高亮==
```

中文正文标点保持原样：

```text
《红楼梦》
《https://openai.com》
埃隆·马斯克
```

选中文本后按：

```text
· -> `选中文本`
＊ -> **选中文本**
～ -> ~~选中文本~~
＝ -> ==选中文本==
```

选中 URL 或把光标放在 URL 上，执行命令：

```text
解析链接为 Markdown 超链接
```

插件会抓取网页标题并转换为：

```text
[网页标题](https://example.com)
```

这个命令也会出现在编辑器右键菜单里，可以在 Obsidian 快捷键设置中绑定快捷键。

在设置里填入 Google Calendar 的生日 ICS URL，然后在日记模板里放：

````md
```better-cn-birthdays
```
````

插件会按日记文件名日期显示当天谁生日。

编辑器里按 `Cmd+A`：

```text
第一次 -> 选中当前自然段
第二次 -> 选中全文
```

自然段边界包括空行，也包括 Markdown 硬换行：

```text
这一段末尾有两个空格  
这一行会被 Cmd+A 单独视作下一段
```

## 设置

插件设置里可以分别开关：

```text
中文 Markdown 输入增强
选中文本包裹
手动调整选中文本
Cmd+A 自然段选择
链接标题解析
生日日历 ICS URL
```

## 粘贴

粘贴内容不会自动改写。需要时先选中粘贴进来的文字，再用命令面板：

```text
Normalize selected Chinese Markdown punctuation
```

## 安装

把这三个文件放进 Obsidian 插件目录：

```text
main.js
manifest.json
styles.css
```

For example:

```text
<vault>/.obsidian/plugins/better-cn-input/
```

移动端也只需要同步这个安装目录。不要把整个源码仓库、`.git` 或 `node_modules` 放进 `.obsidian/plugins`，否则 Obsidian 和 iCloud 会扫描大量开发文件，启动和手机同步都会变慢。
