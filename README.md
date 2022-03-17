# logseq-plugin-luckysheet

在 Logseq 中嵌入电子表格 Luckysheet。

Embed Luckysheet (spreadsheet) into Logseq.

## 使用展示 (Usage)

![demo](demo.gif)

维护一个 markdown 表格是非常容易的一件事情，只要在你想要生成 markdown 表格的块的子级创建一个 Luckysheet 电子表格，编辑好后点击右上角的生成按钮即可。

Maintaining a markdown table is as easy as creating a Luckysheet spreadsheet at the sub-level of the block you want to generate the markdown table in, edit it and click the Generate button on the top right corner.

![markdown](markdown.gif)

## 使用示例 (Examples)

```
{{renderer :luckysheet, workbook name}}
```

## 用户配置 (User configs)

```json
{
  "disabled": false,
  "renderer": "thumbnail"
}
```

在 Logseq 的插件页面打开插件的配置后，有以下几项配置可供使用，请参照上方代码块进行设置（各项的默认值以体现在代码块中）：

- `renderer`: 选择嵌入在页面部分的渲染方式。只渲染缩略图的话设置 `thumbnail`，速度更快，更节省资源；要渲染可交互的内嵌表格的话设置 `inline`，但当同一屏存在的表格过多时会更慢且消耗资源更多。

There are a couple of user settings available when you access the plugin settings from Logseq's plugins page. Please refer to the source block above (Default values are given in the source block).

- `renderer`: Choose how the embedded part is rendered. `thumbnail` will render a thumbnail only, it's fast and doesn't consume too much resources; `inline` will render a functional inline spreadsheet, but it's slower and consumes more resources when there are too many spreadsheets at the same time.

## 免责声明 (Disclaimer)

本插件中使用的表格是第三方的开源软件 [Luckysheet](https://github.com/mengshukeji/Luckysheet)，非插件作者维护。插件作者不对由此带来的可能数据丢失或错误负任何直接或间接责任。

The spreadsheet used in this plugin is a third party open source software [Luckysheet](https://github.com/mengshukeji/Luckysheet) and is not maintained by the plugin author. The plugin author is not responsible, directly or indirectly, for any possible loss of data or errors arising therefrom.

## 注意事项 (Caution)

受插件能力所限，目前表格数据都存储在`.logseq/storages`文件夹下，没有与用户 graph 存储在一起，建议在做备份时，再额外备份下`.logseq/storages`。

Due to plugin limitations, workbook data is currently stored under `.logseq/storages` folder, not part of the user's graph. It is recommended to also make regular backups of the `.logseq/storages` folder.
